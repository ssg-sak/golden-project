# -*- coding: utf-8 -*-
import asyncio
import logging
from typing import Any
from xml.etree import ElementTree as ET

import httpx

from app.core.env import get_env
from app.db.models import MedicalFacility
from app.services.data_validation import validate_medical_facilities
from app.services.fetchers.base import check_and_update_status, log_failure, mark_success
from app.services.hospital_category import apply_hospital_mapping, seed_facilities_from_static
from app.services.hospital_mapping import NAME_TO_HPID
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

ER_API_BASE = "https://apis.data.go.kr/B552657/ErmctInfoInqireService"
ER_LIST_OPERATION = "getEgytListInfoInqire"
MOONLIGHT_API_BASE = "https://apis.data.go.kr/B552657/HsptlAsembySearchService"
MOONLIGHT_LIST_OPERATION = "getHsptlMdcncListInfoInqire"
SOURCE_ER = "emergency_facilities"
SOURCE_MOONLIGHT = "moonlight_pediatric"
MAX_RETRIES = 3
DAEGU_SIGUNGU = ["중구", "동구", "서구", "남구", "북구", "수성구", "달서구", "달성군", "군위군"]

TIER1_KEYWORDS = ("권역응급", "전문응급", "권역응급의료센터", "전문응급의료센터")
TIER2_KEYWORDS = ("지역응급", "지역응급의료기관", "지역응급의료센터")


def _parse_xml_items(xml_text: str) -> tuple[list[dict[str, Any]], int]:
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
        row: dict[str, Any] = {}
        for child in item_el:
            if child.tag and child.text is not None:
                row[child.tag] = child.text
        rows.append(row)
    return rows, total


def _pick(row: dict[str, Any], *keys: str) -> str:
    for key in keys:
        val = row.get(key)
        if val is not None and str(val).strip():
            return str(val).strip()
    return ""


def _classify_official_type(text: str) -> str:
    if any(keyword in text for keyword in TIER1_KEYWORDS):
        return "large"
    if any(keyword in text for keyword in TIER2_KEYWORDS):
        return "secondary"
    return ""


class HospitalsAPIClient:
    def __init__(self):
        self.service_key = get_env("DATA_GO_KR_API_KEY", "") or ""

    async def _get_xml(
        self,
        client: httpx.AsyncClient,
        url: str,
        params: dict[str, str],
    ) -> str:
        last_error: Exception | None = None
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                response = await client.get(url, params=params, timeout=20.0)
                response.raise_for_status()
                if "SERVICE_KEY" in response.text and "ERROR" in response.text:
                    raise RuntimeError("DATA_GO_KR API key error")
                return response.text
            except (httpx.HTTPError, RuntimeError) as exc:
                last_error = exc
                await asyncio.sleep(2 ** attempt)
        raise RuntimeError(f"Hospital API failed: {last_error}")

    async def fetch_emergency_hospitals(self) -> list[dict[str, Any]]:
        if not self.service_key:
            raise ValueError("DATA_GO_KR_API_KEY is not set")

        async with httpx.AsyncClient() as client:
            merged: dict[str, dict[str, Any]] = {}
            url = f"{ER_API_BASE}/{ER_LIST_OPERATION}"
            for sigungu in DAEGU_SIGUNGU:
                page = 1
                while True:
                    xml_text = await self._get_xml(
                        client,
                        url,
                        {
                            "serviceKey": self.service_key,
                            "Q0": "대구광역시",
                            "Q1": sigungu,
                            "pageNo": str(page),
                            "numOfRows": "200",
                        },
                    )
                    rows, total = _parse_xml_items(xml_text)
                    for row in rows:
                        hpid = _pick(row, "hpid")
                        name = _pick(row, "dutyName")
                        if not hpid or not name:
                            continue
                        official = _pick(row, "dutyEmclsName", "dutyDivNam")
                        merged[hpid] = {
                            "facility_id": hpid,
                            "facility_name": name,
                            "official_type_code": _pick(row, "dutyEmcls"),
                            "official_type_name": official,
                            "address": _pick(row, "dutyAddr"),
                            "sido_name": "대구광역시",
                            "sigungu_name": sigungu,
                            "latitude": float(_pick(row, "wgs84Lat")) if _pick(row, "wgs84Lat") else None,
                            "longitude": float(_pick(row, "wgs84Lon")) if _pick(row, "wgs84Lon") else None,
                            "phone": _pick(row, "dutyTel1"),
                            "emergency_phone": _pick(row, "dutyTel3"),
                            "is_moonlight": False,
                            "is_pediatric_center": False,
                        }
                    if page * 200 >= max(total, len(rows)):
                        break
                    page += 1
            return list(merged.values())

    async def fetch_moonlight_hospitals(self) -> list[dict[str, Any]]:
        if not self.service_key:
            raise ValueError("DATA_GO_KR_API_KEY is not set")

        async with httpx.AsyncClient() as client:
            url = f"{MOONLIGHT_API_BASE}/{MOONLIGHT_LIST_OPERATION}"
            xml_text = await self._get_xml(
                client,
                url,
                {
                    "serviceKey": self.service_key,
                    "Q0": "대구광역시",
                    "pageNo": "1",
                    "numOfRows": "500",
                },
            )
            rows, _ = _parse_xml_items(xml_text)
            moonlight_names = {
                "한영한마음아동병원",
                "율하연합소아청소년과의원",
                "우리허브병원",
                "열린아동병원",
                "바른연합소아청소년과의원",
                "우리아이아동병원",
            }
            facilities: list[dict[str, Any]] = []
            for row in rows:
                name = _pick(row, "dutyName")
                hpid = _pick(row, "hpid") or NAME_TO_HPID.get(name)
                if not name or not hpid:
                    continue
                if name not in moonlight_names and "달빛" not in name and "아동" not in name:
                    continue
                facilities.append(
                    {
                        "facility_id": hpid,
                        "facility_name": name,
                        "official_type_code": _pick(row, "dutyDiv"),
                        "official_type_name": _pick(row, "dutyDivNam"),
                        "address": _pick(row, "dutyAddr"),
                        "sido_name": "대구광역시",
                        "sigungu_name": _pick(row, "dutyAddr", "dutyaddr").split(" ")[1]
                        if len(_pick(row, "dutyAddr", "dutyaddr").split(" ")) > 1
                        else "",
                        "latitude": float(_pick(row, "wgs84Lat")) if _pick(row, "wgs84Lat") else None,
                        "longitude": float(_pick(row, "wgs84Lon")) if _pick(row, "wgs84Lon") else None,
                        "phone": _pick(row, "dutyTel1"),
                        "emergency_phone": None,
                        "is_moonlight": True,
                        "is_pediatric_center": True,
                    }
                )
            return facilities


def _normalize_facility_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(
        [
            {
                "facility_id": row["facility_id"],
                "facility_name": row["facility_name"],
                "official_type_code": row.get("official_type_code"),
                "official_type_name": row.get("official_type_name"),
                "dashboard_category": row["dashboard_category"],
                "address": row.get("address"),
                "latitude": row.get("latitude"),
                "longitude": row.get("longitude"),
            }
            for row in rows
        ],
        key=lambda item: item["facility_id"],
    )


async def refresh_emergency_facilities(db: Session, client: HospitalsAPIClient) -> tuple[bool, int]:
    previous_count = db.query(MedicalFacility).filter_by(is_active=True).count()
    try:
        er_rows = await client.fetch_emergency_hospitals()
        mapped = apply_hospital_mapping(er_rows)
        normalized = _normalize_facility_rows(mapped)
        validate_medical_facilities(mapped, previous_count or None)
        has_changed, _, _ = check_and_update_status(db, SOURCE_ER, normalized)
        if not has_changed:
            mark_success(db, SOURCE_ER)
            return False, 0
        await _upsert_medical_facilities(db, mapped)
        mark_success(db, SOURCE_ER)
        return True, len(mapped)
    except Exception as exc:
        logger.error("Emergency facilities refresh failed: %s", exc)
        log_failure(db, SOURCE_ER, str(exc))
        return False, 0


async def refresh_moonlight_facilities(db: Session, client: HospitalsAPIClient) -> tuple[bool, int]:
    try:
        moon_rows = await client.fetch_moonlight_hospitals()
        if not moon_rows:
            log_failure(db, SOURCE_MOONLIGHT, "Moonlight facilities API returned no records")
            return False, 0
        mapped = apply_hospital_mapping(moon_rows)
        normalized = _normalize_facility_rows(mapped)
        has_changed, _, _ = check_and_update_status(db, SOURCE_MOONLIGHT, normalized)
        if not has_changed:
            mark_success(db, SOURCE_MOONLIGHT)
            return False, 0
        await _upsert_medical_facilities(db, mapped, merge_only=True)
        mark_success(db, SOURCE_MOONLIGHT)
        return True, len(mapped)
    except Exception as exc:
        logger.error("Moonlight facilities refresh failed: %s", exc)
        log_failure(db, SOURCE_MOONLIGHT, str(exc))
        return False, 0


async def refresh_all_medical_facilities(db: Session, client: HospitalsAPIClient) -> tuple[bool, int]:
    er_changed, _ = await refresh_emergency_facilities(db, client)
    moon_changed, _ = await refresh_moonlight_facilities(db, client)
    count = db.query(MedicalFacility).filter_by(is_active=True).count()
    return er_changed or moon_changed, count


async def _upsert_medical_facilities(
    db: Session,
    rows: list[dict[str, Any]],
    merge_only: bool = False,
) -> None:
    active_ids = set()
    for row in rows:
        active_ids.add(row["facility_id"])
        record = db.query(MedicalFacility).filter_by(facility_id=row["facility_id"]).first()
        if record is None:
            record = MedicalFacility(facility_id=row["facility_id"])
            db.add(record)
        record.facility_name = row["facility_name"]
        record.official_type_code = row.get("official_type_code")
        record.official_type_name = row.get("official_type_name")
        record.dashboard_category = row.get("dashboard_category")
        record.address = row.get("address")
        record.sido_name = row.get("sido_name")
        record.sigungu_name = row.get("sigungu_name")
        record.latitude = row.get("latitude")
        record.longitude = row.get("longitude")
        record.phone = row.get("phone")
        record.emergency_phone = row.get("emergency_phone")
        record.is_moonlight = bool(row.get("is_moonlight"))
        record.is_pediatric_center = bool(row.get("is_pediatric_center"))
        record.is_active = True

    if not merge_only:
        for stale in db.query(MedicalFacility).filter(MedicalFacility.facility_id.notin_(active_ids)).all():
            stale.is_active = False
    db.commit()


async def update_medical_facilities(db: Session, client: HospitalsAPIClient) -> int:
    changed, count = await refresh_all_medical_facilities(db, client)
    if count == 0:
        static_rows = seed_facilities_from_static()
        await _upsert_medical_facilities(db, static_rows)
        return len(static_rows)
    return count if changed else 0
