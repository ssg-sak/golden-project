# -*- coding: utf-8 -*-
import asyncio
import logging
from datetime import datetime
from typing import Any
from xml.etree import ElementTree as ET

import httpx
import pandas as pd
from dateutil.relativedelta import relativedelta

from app.core.env import get_env
from app.db.models import PopulationSnapshot
from app.services.data_validation import validate_population
from app.services.fetchers.base import check_and_update_status, log_failure, mark_degraded, mark_success
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

SOURCE_NAME = "population"
POPULATION_API_BASE = get_env(
    "POPULATION_API_BASE_URL",
    "https://apis.data.go.kr/1741000/AdmDongPopulation/AdmDongPopulation",
)
POPULATION_OPERATION = get_env("POPULATION_API_OPERATION", "getAdmDongPopulation")
PROJECT_DIR = __import__("pathlib").Path(__file__).resolve().parents[4]
POPULATION_CSV = PROJECT_DIR / "data" / "raw" / "population" / "daegu_population_real.csv"
MAX_RETRIES = 3


class PopulationAPIClient:
    def __init__(self):
        self.service_key = get_env("DATA_GO_KR_API_KEY", "") or ""

    async def _fetch_page(
        self,
        client: httpx.AsyncClient,
        yyyymm: str,
        page_no: int,
    ) -> tuple[list[dict[str, Any]], int]:
        url = f"{POPULATION_API_BASE.rstrip('/')}/{POPULATION_OPERATION}"
        params = {
            "serviceKey": self.service_key,
            "yearMonth": yyyymm,
            "siDoCd": "27",
            "pageNo": str(page_no),
            "numOfRows": "1000",
            "resultType": "json",
        }
        last_error: Exception | None = None
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                response = await client.get(url, params=params, timeout=20.0)
                response.raise_for_status()
                content_type = response.headers.get("content-type", "")
                if "json" in content_type:
                    payload = response.json()
                    body = payload.get("response", {}).get("body", {})
                    items = body.get("items")
                    total = int(body.get("totalCount") or 0)
                    if not items:
                        return [], total
                    if isinstance(items, dict):
                        return [items], total
                    return list(items), total

                rows, total = _parse_population_xml(response.text)
                return rows, total
            except (httpx.HTTPError, ValueError, KeyError) as exc:
                last_error = exc
                await asyncio.sleep(2 ** attempt)
        raise RuntimeError(f"Population API failed for {yyyymm}: {last_error}")

    async def find_latest_month_and_fetch(self) -> tuple[str, list[dict[str, Any]]]:
        if not self.service_key:
            raise ValueError("DATA_GO_KR_API_KEY is not set")

        async with httpx.AsyncClient() as client:
            now = datetime.now()
            for offset in range(6):
                target = now - relativedelta(months=offset)
                yyyymm = target.strftime("%Y%m")
                page = 1
                collected: list[dict[str, Any]] = []
                total = 0
                while True:
                    rows, total = await self._fetch_page(client, yyyymm, page)
                    if not rows:
                        break
                    collected.extend(rows)
                    if page * 1000 >= max(total, len(collected)):
                        break
                    page += 1
                if collected:
                    return yyyymm, collected
        raise RuntimeError("Population: 최근 6개월 내 데이터를 찾지 못했습니다.")


def _parse_population_xml(xml_text: str) -> tuple[list[dict[str, Any]], int]:
    if not xml_text.strip():
        return [], 0
    root = ET.fromstring(xml_text)
    body = root.find("body")
    if body is None:
        return [], 0
    total_el = body.find("totalCount")
    total = int(total_el.text or 0) if total_el is not None else 0
    items_el = body.find("items")
    if items_el is None:
        return [], total
    rows: list[dict[str, Any]] = []
    for item_el in items_el.findall("item"):
        row = {child.tag: child.text for child in item_el if child.tag and child.text is not None}
        rows.append(row)
    return rows, total


def _parse_api_item(item: dict[str, Any], base_month: str) -> dict[str, Any] | None:
    dong_code = item.get("admCd") or item.get("admcd") or item.get("admDongCd")
    dong_name = item.get("admNm") or item.get("admnm") or item.get("admDongNm")
    sido = item.get("siDoNm") or item.get("sidonm") or ""
    if sido and "대구" not in str(sido):
        return None
    total_pop = int(float(item.get("totPpltn") or item.get("totPop") or item.get("totpop") or 0))
    if not dong_code or not dong_name:
        return None
    return {
        "base_month": base_month,
        "admin_dong_code": str(dong_code),
        "admin_dong_name": str(dong_name),
        "total_population": total_pop,
        "male_population": int(float(item.get("malePpltn") or item.get("malePop") or 0)),
        "female_population": int(float(item.get("femalePpltn") or item.get("femalePop") or 0)),
        "household_count": int(float(item.get("hhCnt") or item.get("households") or 0)),
    }


def _aggregate_by_admin_dong(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """통·반 단위 응답을 행정동 코드 단위로 집계."""
    bucket: dict[tuple[str, str], dict[str, Any]] = {}
    for row in rows:
        key = (row["base_month"], row["admin_dong_code"])
        if key not in bucket:
            bucket[key] = {**row}
            continue
        target = bucket[key]
        target["total_population"] += row["total_population"]
        target["male_population"] += row["male_population"]
        target["female_population"] += row["female_population"]
        target["household_count"] += row["household_count"]
    return list(bucket.values())


def _load_population_from_csv(base_month: str = "2026.06") -> list[dict[str, Any]]:
    if not POPULATION_CSV.exists():
        return []
    pop_df = pd.read_csv(POPULATION_CSV, encoding="utf-8-sig")
    rows: list[dict[str, Any]] = []
    for _, record in pop_df.iterrows():
        dong_name = str(record["동이름"])
        pop_65 = int(record.get("65세이상_인구", 0))
        pop_09 = int(record.get("0~9세_인구", 0))
        rows.append(
            {
                "base_month": base_month,
                "admin_dong_code": f"csv:{dong_name.replace(' ', '_')}",
                "admin_dong_name": dong_name,
                "total_population": pop_65 + pop_09,
                "male_population": 0,
                "female_population": 0,
                "household_count": 0,
            }
        )
    return rows


async def refresh_population(db: Session, client: PopulationAPIClient) -> tuple[bool, str | None]:
    previous_total = sum(row.total_population for row in db.query(PopulationSnapshot).all())
    try:
        yyyymm, items = await client.find_latest_month_and_fetch()
        base_month = f"{yyyymm[:4]}.{yyyymm[4:]}"
        parsed = [row for row in (_parse_api_item(item, base_month) for item in items) if row]
        parsed = _aggregate_by_admin_dong(parsed)
        if not parsed:
            raise RuntimeError("Population API returned no Daegu rows")
        validate_population(parsed, previous_total or None)
        hash_rows = sorted(parsed, key=lambda item: item["admin_dong_code"])
        has_changed, _, _ = check_and_update_status(db, SOURCE_NAME, hash_rows, version=base_month)
        if not has_changed:
            mark_success(db, SOURCE_NAME)
            return False, base_month
        _upsert_population(db, parsed)
        mark_success(db, SOURCE_NAME)
        return True, base_month
    except Exception as exc:
        logger.warning("Population API refresh failed, trying CSV fallback: %s", exc)
        parsed = _load_population_from_csv()
        if not parsed:
            log_failure(db, SOURCE_NAME, str(exc))
            return False, None
        base_month = parsed[0]["base_month"]
        has_changed, _, _ = check_and_update_status(db, SOURCE_NAME, parsed, version=base_month)
        if has_changed:
            _upsert_population(db, parsed)
        mark_degraded(db, SOURCE_NAME, f"API failed; CSV fallback used: {exc}")
        return has_changed, base_month


def _upsert_population(db: Session, rows: list[dict[str, Any]]) -> None:
    for row in rows:
        record = db.query(PopulationSnapshot).filter_by(
            base_month=row["base_month"],
            admin_dong_code=row["admin_dong_code"],
        ).first()
        if record is None:
            record = PopulationSnapshot(
                base_month=row["base_month"],
                admin_dong_code=row["admin_dong_code"],
            )
            db.add(record)
        record.admin_dong_name = row["admin_dong_name"]
        record.total_population = row["total_population"]
        record.male_population = row["male_population"]
        record.female_population = row["female_population"]
        record.household_count = row["household_count"]
    db.commit()


async def update_population(db: Session, client: PopulationAPIClient) -> tuple[int, str | None]:
    changed, base_month = await refresh_population(db, client)
    if base_month is None:
        return 0, None
    count = db.query(PopulationSnapshot).filter_by(base_month=base_month).count()
    return (count if changed else 0), base_month
