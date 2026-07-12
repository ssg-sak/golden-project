# -*- coding: utf-8 -*-
import asyncio
import logging
from typing import Any

import httpx

from app.core.env import get_env
from app.db.models import AdminDong, DataSourceStatus
from app.services.data_validation import DataValidationError, validate_admin_dongs
from app.services.fetchers.base import (
    check_and_update_status,
    log_failure,
    mark_success,
    normalize_records_for_hash,
)
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

SGIS_AUTH_URL = "https://sgisapi.mods.go.kr/OpenAPI3/auth/authentication.json"
SGIS_STAGE_URL = "https://sgisapi.mods.go.kr/OpenAPI3/addr/stage.json"
SOURCE_NAME = "sgis_admin_dong"
MAX_RETRIES = 3


class SGISClient:
    def __init__(self):
        self.consumer_key = get_env("SGIS_CONSUMER_KEY", "") or ""
        self.consumer_secret = get_env("SGIS_CONSUMER_SECRET", "") or ""
        self.access_token: str | None = None

    async def _request_json(
        self,
        client: httpx.AsyncClient,
        url: str,
        params: dict[str, str],
    ) -> dict[str, Any]:
        last_error: Exception | None = None
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                resp = await client.get(url, params=params, timeout=15.0)
                resp.raise_for_status()
                return resp.json()
            except (httpx.HTTPError, ValueError) as exc:
                last_error = exc
                await asyncio.sleep(2 ** attempt)
        raise RuntimeError(f"SGIS request failed: {last_error}")

    async def _get_access_token(self, client: httpx.AsyncClient) -> str:
        if self.access_token:
            return self.access_token
        if not self.consumer_key or not self.consumer_secret:
            raise ValueError("SGIS_CONSUMER_KEY or SGIS_CONSUMER_SECRET is not set")

        data = await self._request_json(
            client,
            SGIS_AUTH_URL,
            {"consumer_key": self.consumer_key, "consumer_secret": self.consumer_secret},
        )
        if data.get("errCd") == 0:
            self.access_token = data["result"]["accessToken"]
            return self.access_token
        raise RuntimeError(f"SGIS Auth failed: {data}")

    async def _fetch_stage(
        self,
        client: httpx.AsyncClient,
        cd: str | None = None,
        pg_yn: str = "0",
    ) -> list[dict[str, Any]]:
        token = await self._get_access_token(client)
        params = {"accessToken": token, "pg_yn": pg_yn}
        if cd:
            params["cd"] = cd

        data = await self._request_json(client, SGIS_STAGE_URL, params)
        if data.get("errCd") == 0:
            return data["result"]
        if data.get("errCd") == -401:
            self.access_token = None
            token = await self._get_access_token(client)
            params["accessToken"] = token
            data = await self._request_json(client, SGIS_STAGE_URL, params)
            if data.get("errCd") == 0:
                return data["result"]
        raise RuntimeError(f"SGIS Stage failed: {data}")

    async def fetch_daegu_dongs(self) -> list[dict[str, Any]]:
        async with httpx.AsyncClient() as client:
            sido_list = await self._fetch_stage(client)
            daegu_cd = next((s.get("cd") for s in sido_list if s.get("addr_name") == "대구광역시"), None)
            if not daegu_cd:
                raise RuntimeError("SGIS: 대구광역시 코드를 찾을 수 없습니다.")

            sigungu_list = await self._fetch_stage(client, cd=daegu_cd)
            all_dongs: list[dict[str, Any]] = []
            for sigungu in sigungu_list:
                dong_list = await self._fetch_stage(client, cd=sigungu.get("cd"), pg_yn="1")
                for dong in dong_list:
                    all_dongs.append(
                        {
                            "admin_dong_code": dong.get("cd"),
                            "sido_code": daegu_cd,
                            "sigungu_code": sigungu.get("cd"),
                            "sido_name": "대구광역시",
                            "sigungu_name": sigungu.get("addr_name"),
                            "admin_dong_name": dong.get("addr_name"),
                            "full_address": dong.get("full_addr"),
                            "center_longitude": float(dong["x_coor"]) if dong.get("x_coor") else None,
                            "center_latitude": float(dong["y_coor"]) if dong.get("y_coor") else None,
                            "geometry": dong.get("pg"),
                        }
                    )
            return all_dongs


def _normalize_dong_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(
        [
            {
                "admin_dong_code": str(r["admin_dong_code"]),
                "admin_dong_name": str(r["admin_dong_name"]).strip(),
                "sido_name": r["sido_name"],
                "sigungu_name": r.get("sigungu_name"),
                "center_latitude": r.get("center_latitude"),
                "center_longitude": r.get("center_longitude"),
            }
            for r in rows
        ],
        key=lambda item: item["admin_dong_code"],
    )


async def refresh_admin_dongs(db: Session, client: SGISClient) -> tuple[bool, int]:
    previous_count = db.query(AdminDong).filter_by(is_active=True).count()
    try:
        raw_rows = await client.fetch_daegu_dongs()
        rows = _normalize_dong_rows(raw_rows)
        validate_admin_dongs(rows, previous_count or None)
        has_changed, _, _ = check_and_update_status(db, SOURCE_NAME, rows)

        if not has_changed:
            mark_success(db, SOURCE_NAME)
            return False, 0

        active_codes = {row["admin_dong_code"] for row in rows}
        for row in rows:
            record = db.query(AdminDong).filter_by(admin_dong_code=row["admin_dong_code"]).first()
            if record is None:
                record = AdminDong(admin_dong_code=row["admin_dong_code"])
                db.add(record)
            record.sido_code = row.get("sido_code")
            record.sigungu_code = row.get("sigungu_code")
            record.sido_name = row["sido_name"]
            record.sigungu_name = row.get("sigungu_name")
            record.admin_dong_name = row["admin_dong_name"]
            record.full_address = row.get("full_address")
            record.center_latitude = row.get("center_latitude")
            record.center_longitude = row.get("center_longitude")
            record.geometry = str(row.get("geometry")) if row.get("geometry") else None
            record.is_active = True

        for stale in db.query(AdminDong).filter(AdminDong.admin_dong_code.notin_(active_codes)).all():
            stale.is_active = False

        db.commit()
        mark_success(db, SOURCE_NAME)
        return True, len(rows)
    except Exception as exc:
        logger.error("SGIS refresh failed: %s", exc)
        log_failure(db, SOURCE_NAME, str(exc))
        return False, 0


# 하위 호환 alias
update_admin_dongs = refresh_admin_dongs
