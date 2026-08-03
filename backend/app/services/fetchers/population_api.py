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
from app.services.data_validation import DataValidationError, validate_population
from app.services.fetchers.base import (
    check_and_update_status,
    log_failure,
    mark_degraded,
    mark_success,
)
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

SOURCE_NAME = "population"
POPULATION_API_BASE = get_env(
    "POPULATION_API_BASE_URL",
    "https://apis.data.go.kr/1741000/admmPpltnHhStus",
)
POPULATION_OPERATION = get_env(
    "POPULATION_API_OPERATION",
    "selectAdmmPpltnHhStus",
)
PROJECT_DIR = __import__("pathlib").Path(__file__).resolve().parents[4]
POPULATION_CSV = PROJECT_DIR / "data" / "raw" / "population" / "daegu_population_real.csv"
MAX_RETRIES = 3
MAX_REQUESTS_PER_RUN = 60
MAX_PAGES_PER_MONTH = 5
PAGE_SIZE = 100
DAEGU_SGG_ADMIN_CODES = (
    "2711000000",  # 중구
    "2714000000",  # 동구
    "2717000000",  # 서구
    "2720000000",  # 남구
    "2723000000",  # 북구
    "2726000000",  # 수성구
    "2729000000",  # 달서구
    "2771000000",  # 달성군
    "2772000000",  # 군위군
)
EXPECTED_DAEGU_ADMIN_DONG_COUNT = 150
DAEGU_ADMIN_SUBUNIT_PARENTS = {
    # 행정안전부 API는 출장소를 별도 행정단위로 반환하지만, 프로젝트 경계는
    # 읍 단위 150개이므로 인구를 버리지 않고 부모 읍에 합산한다.
    "2771025400": "2771025300",  # 논공읍공단출장소 -> 논공읍
    "2771025700": "2771025600",  # 다사읍서재출장소 -> 다사읍
}


class PopulationAPIConfigurationError(RuntimeError):
    """인증·활용신청 문제처럼 재시도로 해결되지 않는 API 설정 오류."""


def latest_completed_population_yyyymm(
    reference_time: datetime | None = None,
) -> str:
    """주민등록 인구는 매월 말일 기준으로 다음 달에 공표된다."""
    current = reference_time or datetime.now()
    return (current - relativedelta(months=1)).strftime("%Y%m")


def _safe_error_summary(exc: Exception | None) -> str:
    if exc is None:
        return "unknown"
    if isinstance(exc, httpx.HTTPStatusError):
        return f"HTTP {exc.response.status_code}"
    return type(exc).__name__


def _response_error_summary(response: httpx.Response) -> str:
    try:
        payload = response.json()
    except ValueError:
        return f"HTTP {response.status_code}"

    common_header = (
        payload.get("OpenAPI_ServiceResponse", {}).get("cmmMsgHeader", {})
        if isinstance(payload, dict)
        else {}
    )
    message = (
        common_header.get("returnAuthMsg")
        or common_header.get("errMsg")
        or common_header.get("returnReasonCode")
    )
    if message:
        return f"HTTP {response.status_code}: {message}"
    return f"HTTP {response.status_code}"


def _parse_population_json(
    payload: dict[str, Any],
) -> tuple[list[dict[str, Any]], int]:
    response_payload: Any = (
        payload.get("response")
        or payload.get("Response")
        or payload
    )
    if not isinstance(response_payload, dict):
        raise RuntimeError("Population API response payload is invalid")

    operation_payload = response_payload.get("selectAdmmPpltnHhStus_response")
    if isinstance(operation_payload, dict):
        response_payload = operation_payload

    head = response_payload.get("head") or {}
    if not isinstance(head, dict):
        raise RuntimeError("Population API response head is invalid")
    result_code = str(head.get("resultCode") or "").strip()
    if result_code == "3" and int(float(head.get("totalCount") or 0)) == 0:
        return [], 0
    if result_code and result_code not in {"0", "00", "INFO-000"}:
        result_message = str(head.get("resultMsg") or "unknown error").strip()
        raise RuntimeError(f"Population API returned {result_code}: {result_message}")

    items_container = response_payload.get("items") or {}
    if isinstance(items_container, dict):
        items: Any = items_container.get("item")
    else:
        items = items_container
    if not items:
        rows: list[dict[str, Any]] = []
    elif isinstance(items, dict):
        rows = [items]
    elif isinstance(items, list):
        rows = [item for item in items if isinstance(item, dict)]
    else:
        raise RuntimeError("Population API response items are invalid")

    total = int(float(head.get("totalCount") or len(rows)))
    return rows, total


class PopulationAPIClient:
    def __init__(self) -> None:
        self.service_key = get_env("DATA_GO_KR_API_KEY", "") or ""
        self.request_count = 0

    def _reserve_request(self) -> None:
        if self.request_count >= MAX_REQUESTS_PER_RUN:
            raise RuntimeError(
                f"Population API request budget exceeded: {MAX_REQUESTS_PER_RUN}"
            )
        self.request_count += 1

    async def _fetch_page(
        self,
        client: httpx.AsyncClient,
        yyyymm: str,
        page_no: int,
        admin_code: str,
    ) -> tuple[list[dict[str, Any]], int]:
        url = f"{POPULATION_API_BASE.rstrip('/')}/{POPULATION_OPERATION}"
        params = {
            "serviceKey": self.service_key,
            "admmCd": admin_code,
            "srchFrYm": yyyymm,
            "srchToYm": yyyymm,
            "lv": "3",
            "regSeCd": "1",
            "type": "JSON",
            "pageNo": str(page_no),
            "numOfRows": str(PAGE_SIZE),
        }
        last_error: Exception | None = None
        for attempt in range(1, MAX_RETRIES + 1):
            self._reserve_request()
            try:
                response = await client.get(url, params=params, timeout=20.0)
                if response.status_code in {401, 403}:
                    raise PopulationAPIConfigurationError(
                        "Population API authentication/application failed: "
                        f"{_response_error_summary(response)}"
                    )
                response.raise_for_status()
                content_type = response.headers.get("content-type", "")
                if "json" in content_type:
                    payload = response.json()
                    if not isinstance(payload, dict):
                        raise RuntimeError("Population API JSON root is invalid")
                    return _parse_population_json(payload)

                rows, total = _parse_population_xml(response.text)
                return rows, total
            except PopulationAPIConfigurationError:
                raise
            except (httpx.HTTPError, ValueError, KeyError) as exc:
                last_error = exc
                await asyncio.sleep(2 ** attempt)
        raise RuntimeError(
            f"Population API failed for {yyyymm}: "
            f"{_safe_error_summary(last_error)}"
        )

    async def find_latest_month_and_fetch(
        self,
        reference_time: datetime | None = None,
    ) -> tuple[str, list[dict[str, Any]]]:
        if not self.service_key:
            raise ValueError("DATA_GO_KR_API_KEY is not set")

        async with httpx.AsyncClient() as client:
            latest_completed = datetime.strptime(
                latest_completed_population_yyyymm(reference_time),
                "%Y%m",
            )
            for offset in range(6):
                target = latest_completed - relativedelta(months=offset)
                yyyymm = target.strftime("%Y%m")
                collected: list[dict[str, Any]] = []
                month_complete = True
                try:
                    for admin_code in DAEGU_SGG_ADMIN_CODES:
                        page = 1
                        district_rows: list[dict[str, Any]] = []
                        total = 0
                        while True:
                            rows, total = await self._fetch_page(
                                client,
                                yyyymm,
                                page,
                                admin_code,
                            )
                            if not rows:
                                break
                            district_rows.extend(rows)
                            if page * PAGE_SIZE >= max(total, len(district_rows)):
                                break
                            if page >= MAX_PAGES_PER_MONTH:
                                raise RuntimeError(
                                    "Population API page limit exceeded for "
                                    f"{yyyymm}/{admin_code}: {MAX_PAGES_PER_MONTH}"
                                )
                            page += 1
                        if not district_rows:
                            month_complete = False
                            break
                        collected.extend(district_rows)
                except PopulationAPIConfigurationError:
                    raise
                except RuntimeError as exc:
                    logger.info(
                        "Population month %s is unavailable; trying older month: %s",
                        yyyymm,
                        exc,
                    )
                    continue
                if month_complete and collected:
                    return yyyymm, collected
                logger.info(
                    "Population month %s is not fully published; trying older month",
                    yyyymm,
                )
        raise RuntimeError("Population: 최근 6개월 내 데이터를 찾지 못했습니다.")


def _parse_population_xml(xml_text: str) -> tuple[list[dict[str, Any]], int]:
    if not xml_text.strip():
        return [], 0
    root = ET.fromstring(xml_text)
    head = root.find(".//head")
    result_code_el = head.find("resultCode") if head is not None else None
    result_code = (result_code_el.text or "").strip() if result_code_el is not None else ""
    if result_code and result_code not in {"0", "00", "INFO-000"}:
        result_message_el = head.find("resultMsg") if head is not None else None
        result_message = (
            (result_message_el.text or "unknown error").strip()
            if result_message_el is not None
            else "unknown error"
        )
        raise RuntimeError(f"Population API returned {result_code}: {result_message}")

    total_el = (
        head.find("totalCount")
        if head is not None
        else root.find(".//totalCount")
    )
    total = int(total_el.text or 0) if total_el is not None else 0
    items_el = root.find(".//items")
    if items_el is None:
        return [], total
    rows: list[dict[str, Any]] = []
    for item_el in items_el.findall("item"):
        row = {
            child.tag: child.text
            for child in item_el
            if child.tag and child.text is not None
        }
        rows.append(row)
    return rows, total


def _parse_integer(value: Any) -> int:
    normalized = str(value or "0").replace(",", "").strip()
    return int(float(normalized or "0"))


def _parse_api_item(item: dict[str, Any], base_month: str) -> dict[str, Any] | None:
    dong_code = (
        item.get("admmCd")
        or item.get("admCd")
        or item.get("admcd")
        or item.get("admDongCd")
    )
    dong_name = (
        item.get("dongNm")
        or item.get("admNm")
        or item.get("admnm")
        or item.get("admDongNm")
    )
    sido = item.get("ctpvNm") or item.get("siDoNm") or item.get("sidonm") or ""
    if sido and "대구" not in str(sido):
        return None
    total_pop = _parse_integer(
        item.get("totNmprCnt")
        or item.get("totPpltn")
        or item.get("totPop")
        or item.get("totpop")
    )
    if not dong_code or not dong_name:
        return None
    return {
        "base_month": base_month,
        "admin_dong_code": str(dong_code),
        "admin_dong_name": str(dong_name),
        "total_population": total_pop,
        "male_population": _parse_integer(
            item.get("maleNmprCnt") or item.get("malePpltn") or item.get("malePop")
        ),
        "female_population": _parse_integer(
            item.get("femlNmprCnt") or item.get("femalePpltn") or item.get("femalePop")
        ),
        "household_count": _parse_integer(item.get("hhCnt") or item.get("households")),
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


def _merge_admin_subunits(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """공식 API의 출장소 인구를 프로젝트 행정동 경계의 부모 읍에 합산한다."""
    by_key = {
        (str(row["base_month"]), str(row["admin_dong_code"])): {**row}
        for row in rows
    }
    for (base_month, child_code), child in list(by_key.items()):
        parent_code = DAEGU_ADMIN_SUBUNIT_PARENTS.get(child_code)
        if parent_code is None:
            continue
        parent_key = (base_month, parent_code)
        parent = by_key.get(parent_key)
        if parent is None:
            raise DataValidationError(
                f"출장소 부모 행정동 누락: {child_code} -> {parent_code}"
            )
        for field in (
            "total_population",
            "male_population",
            "female_population",
            "household_count",
        ):
            parent[field] = int(parent[field]) + int(child[field])
        del by_key[(base_month, child_code)]
    return list(by_key.values())


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


def _latest_official_population_total(db: Session) -> int | None:
    latest = (
        db.query(PopulationSnapshot)
        .order_by(PopulationSnapshot.base_month.desc())
        .first()
    )
    if latest is None:
        return None
    latest_rows = (
        db.query(PopulationSnapshot)
        .filter_by(base_month=latest.base_month)
        .all()
    )
    if not latest_rows or any(
        str(row.admin_dong_code).startswith("csv:") for row in latest_rows
    ):
        return None
    return sum(row.total_population for row in latest_rows)


def _validate_official_population(records: list[dict[str, Any]]) -> None:
    if len(records) != EXPECTED_DAEGU_ADMIN_DONG_COUNT:
        raise DataValidationError(
            "대구 행정동 수 불일치: "
            f"{len(records)} (expected {EXPECTED_DAEGU_ADMIN_DONG_COUNT})"
        )
    for row in records:
        total = int(row["total_population"])
        male = int(row["male_population"])
        female = int(row["female_population"])
        households = int(row["household_count"])
        if male + female != total:
            raise DataValidationError(
                f"성별 인구 합계 불일치: {row['admin_dong_code']}"
            )
        if households < 0:
            raise DataValidationError(f"음수 세대수: {row['admin_dong_code']}")


async def refresh_population(
    db: Session,
    client: PopulationAPIClient,
) -> tuple[bool, str | None]:
    previous_total = _latest_official_population_total(db)
    try:
        yyyymm, items = await client.find_latest_month_and_fetch()
        base_month = f"{yyyymm[:4]}.{yyyymm[4:]}"
        parsed = [
            row
            for row in (_parse_api_item(item, base_month) for item in items)
            if row
        ]
        parsed = _merge_admin_subunits(_aggregate_by_admin_dong(parsed))
        if not parsed:
            raise RuntimeError("Population API returned no Daegu rows")
        _validate_official_population(parsed)
        validate_population(parsed, previous_total or None)
        hash_rows = sorted(parsed, key=lambda item: item["admin_dong_code"])
        has_changed, _, _ = check_and_update_status(
            db,
            SOURCE_NAME,
            hash_rows,
            version=base_month,
        )
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
        has_changed, _, _ = check_and_update_status(
            db,
            SOURCE_NAME,
            parsed,
            version=base_month,
        )
        if has_changed:
            _upsert_population(db, parsed)
        mark_degraded(db, SOURCE_NAME, f"API failed; CSV fallback used: {exc}")
        return has_changed, base_month


def _upsert_population(db: Session, rows: list[dict[str, Any]]) -> None:
    incoming_keys = {
        (row["base_month"], row["admin_dong_code"])
        for row in rows
    }
    incoming_months = {row["base_month"] for row in rows}

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

    for base_month in incoming_months:
        stale_records = db.query(PopulationSnapshot).filter_by(base_month=base_month).all()
        for stale in stale_records:
            key = (stale.base_month, stale.admin_dong_code)
            if key not in incoming_keys:
                db.delete(stale)
    db.commit()


async def update_population(db: Session, client: PopulationAPIClient) -> tuple[int, str | None]:
    changed, base_month = await refresh_population(db, client)
    if base_month is None:
        return 0, None
    count = db.query(PopulationSnapshot).filter_by(base_month=base_month).count()
    return (count if changed else 0), base_month
