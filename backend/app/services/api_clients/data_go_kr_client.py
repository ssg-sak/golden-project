import asyncio
import logging
from typing import Any
from xml.etree import ElementTree as ET

import httpx

from app.services.bed_payload import bed_payload

logger = logging.getLogger(__name__)

BED_API_BASE = "https://apis.data.go.kr/B552657/ErmctInfoInqireService"
BED_OPERATION = "getEmrrmRltmUsefulSckbdInfoInqire"
STATIC_BED_OPERATION = "getEmrrmSckbdInfoInqire"
MSG_OPERATION = "getEmrrmSrsillDissMsgInqire"

REGION_STAGE1 = "대구광역시"
DAEGU_SIGUNGU = [
    "중구",
    "동구",
    "서구",
    "남구",
    "북구",
    "수성구",
    "달서구",
    "달성군",
    "군위군",
]
BED_SLEEP_SEC = 0.25

def _pick_field(row: dict[str, Any], *keys: str) -> str:
    lowered = {str(k).lower(): v for k, v in row.items()}
    for key in keys:
        val = row.get(key)
        if val is not None and str(val).strip():
            return str(val).strip()
        val = lowered.get(key.lower())
        if val is not None and str(val).strip():
            return str(val).strip()
    return ""

def _parse_xml_items(xml_text: str) -> list[dict[str, Any]]:
    root = ET.fromstring(xml_text)
    body = root.find("body")
    if body is None:
        return []

    items_el = body.find("items")
    if items_el is None:
        return []

    rows: list[dict[str, Any]] = []
    for item_el in items_el.findall("item"):
        row: dict[str, Any] = {}
        for child in item_el:
            if child.tag and child.text is not None:
                row[child.tag] = child.text
        rows.append(row)
    return rows

def _to_int(value: str) -> int | None:
    try:
        # 음수 병상(대기 상태 등)도 투명하게 통과시킴. None은 제외.
        return int(float(value))
    except (TypeError, ValueError):
        return None

def _is_api_response_ok(xml_text: str) -> bool:
    text = xml_text.strip()
    if not text:
        return False
    if "Unauthorized" in text or "SERVICE_KEY_IS_NOT_REGISTERED" in text:
        return False
    if "<resultCode>00</resultCode>" in text or "<item>" in text:
        return True
    if "<resultCode>" in text:
        return False
    return True

def _merge_api_rows(
    rows: list[dict[str, Any]],
    static_rows: dict[str, dict[str, Any]],
    target_names: set[str],
    matched: dict[str, dict[str, Any]],
) -> None:
    from app.services.hospital_realtime import display_name
    for row in rows:
        api_name = _pick_field(row, "dutyName", "dutyname")
        if not api_name:
            continue

        name = display_name(api_name)
        if name not in target_names:
            continue

        static_row = static_rows.get(name, {})

        # AI 환각 로직 완전 제거 (없는 필드 매핑 및 24시간 하드코딩 삭제)
        # Assume Nothing 룰에 따라 실존하는 API 응답 필드만 정직하게 파싱

        emergency_equipment_status = {
            "CT": _pick_field(row, "hvctayn").upper() in ["Y", "O", "가능", "TRUE", "1"],
            "MRI": _pick_field(row, "hvmriayn").upper() in ["Y", "O", "가능", "TRUE", "1"],
            "조영촬영기": _pick_field(row, "hvangioayn").upper() in ["Y", "O", "가능", "TRUE", "1"],
            "인공호흡기": _pick_field(row, "hvventiayn").upper() in ["Y", "O", "가능", "TRUE", "1"],
        }

        if name in matched:
            matched[name]["emergency_equipment_status"] = emergency_equipment_status
            continue
        
        hvec_val = _to_int(_pick_field(row, "hvec"))
        hvoc_val = _to_int(_pick_field(row, "hv28")) # hv28: 응급실 소아 가용
        hvec = hvec_val if hvec_val is not None else 0
        hvoc = hvoc_val if hvoc_val is not None else 0

        # 총 병상수는 실시간(Realtime) API 응답(row)에 이미 hvs01, hvs02 등으로 포함되어 있음
        total_hvec = _to_int(_pick_field(row, "hvs01"))
        total_hvoc = _to_int(_pick_field(row, "hvs02"))

        special_beds = {
            "음압격리": {
                "available": _to_int(_pick_field(row, "hvcc")) or 0,
                "total": _to_int(_pick_field(row, "hvs03")),
            },
            "일반격리": {
                "available": _to_int(_pick_field(row, "hvncc")) or 0,
                "total": _to_int(_pick_field(row, "hvs04")),
            },
            "일반중환자": {
                "available": _to_int(_pick_field(row, "hv6")) or 0,
                "total": _to_int(_pick_field(row, "hvs06")),
            },
            "신생아중환자": {
                "available": _to_int(_pick_field(row, "hv9")) or 0,
                "total": _to_int(_pick_field(row, "hvs09")),
            },
            "소아중환자": {
                "available": _to_int(_pick_field(row, "hv10")) or 0,
                "total": _to_int(_pick_field(row, "hvs10")),
            },
            "응급전용수술실": {
                "available": _to_int(_pick_field(row, "hv8")) or 0,
                "total": _to_int(_pick_field(row, "hvs08")),
            },
            "소아인큐베이터": {
                "available": _to_int(_pick_field(row, "hv11")) or 0,
                "total": _to_int(_pick_field(row, "hvs11")),
            },
        }

        matched[name] = bed_payload(
            hvec,
            hvoc,
            "api",
            total_hvec=total_hvec,
            total_hvoc=total_hvoc,
            severe_conditions=None,
            operating_hours=None,
            emergency_equipment_status=emergency_equipment_status,
            special_beds=special_beds
        )

async def _fetch_region_beds_async(
    client: httpx.AsyncClient,
    url: str,
    static_url: str,
    service_key: str,
    target_names: set[str],
    matched: dict[str, dict[str, Any]],
) -> None:
    # 1. 정적(총 병상) 정보 먼저 호출
    static_rows = {}
    try:
        static_response = await client.get(
            static_url,
            params={
                "serviceKey": service_key,
                "STAGE1": REGION_STAGE1,
                "pageNo": "1",
                "numOfRows": "200",
            },
        )
        if static_response.status_code == 200 and _is_api_response_ok(static_response.text):
            from app.services.hospital_realtime import display_name
            for sr in _parse_xml_items(static_response.text):
                api_name = _pick_field(sr, "dutyName", "dutyname")
                if api_name:
                    static_rows[display_name(api_name)] = sr
    except (httpx.HTTPError, ET.ParseError) as exc:
        logger.warning("[hospitals] static bed metadata skipped: %s", type(exc).__name__)

    # 2. 실시간 병상 호출
    response = await client.get(
        url,
        params={
            "serviceKey": service_key,
            "STAGE1": REGION_STAGE1,
            "pageNo": "1",
            "numOfRows": "200",  # 대구광역시 전체 병원을 여유있게 커버
        },
    )

    if response.status_code != 200:
        logger.warning(
            "[hospitals] public API HTTP %s - body=%r",
            response.status_code,
            response.text[:200],
        )
        return

    if not _is_api_response_ok(response.text):
        if "SERVICE_KEY_IS_NOT_REGISTERED" in response.text:
            logger.error(
                "[hospitals] 🚨 SERVICE_KEY_IS_NOT_REGISTERED! "
                "You might be using the 'Encoding Key' instead of the 'Decoding Key'."
            )
        else:
            logger.warning(
                "[hospitals] public API service error - body=%r",
                response.text[:200],
            )
        return

    try:
        rows = _parse_xml_items(response.text)
    except ET.ParseError as exc:
        logger.warning("[hospitals] XML parse error: %s", exc)
        return

    _merge_api_rows(rows, static_rows, target_names, matched)

async def fetch_data_go_kr_beds(
    client: httpx.AsyncClient,
    service_key: str,
    target_names: set[str],
    matched: dict[str, dict[str, Any]],
) -> None:
    url = f"{BED_API_BASE}/{BED_OPERATION}"
    static_url = f"{BED_API_BASE}/{STATIC_BED_OPERATION}"
    try:
        await _fetch_region_beds_async(
            client, url, static_url, service_key, target_names, matched
        )
    except httpx.TimeoutException as exc:
        logger.warning("[hospitals] public API timeout: %s", exc)
    except httpx.HTTPError as exc:
        logger.warning("[hospitals] public API HTTP error: %s: %s", type(exc).__name__, exc)

def _merge_api_messages(
    rows: list[dict[str, Any]],
    target_names: set[str],
    matched: dict[str, dict[str, Any]],
) -> None:
    from app.services.hospital_realtime import display_name
    for row in rows:
        api_name = _pick_field(row, "dutyName", "dutyname")
        if not api_name:
            continue
            
        name = display_name(api_name)
        if name not in target_names or name not in matched:
            continue
            
        msg_type = _pick_field(row, "symTypNm", "symtypnm")
        msg_content = _pick_field(row, "symOutCon", "symoutcon")
        if msg_content:
            msg = f"[{msg_type}] {msg_content}" if msg_type else msg_content
            if matched[name].get("realtime_messages") is None:
                matched[name]["realtime_messages"] = []
            matched[name]["realtime_messages"].append(msg)

async def _fetch_region_messages_async(
    client: httpx.AsyncClient,
    url: str,
    service_key: str,
    target_names: set[str],
    matched: dict[str, dict[str, Any]],
) -> None:
    response = await client.get(
        url,
        params={
            "serviceKey": service_key,
            "STAGE1": REGION_STAGE1,
            "pageNo": "1",
            "numOfRows": "200",
        },
    )
    if response.status_code != 200 or not _is_api_response_ok(response.text):
        return
    try:
        rows = _parse_xml_items(response.text)
    except ET.ParseError:
        return
    _merge_api_messages(rows, target_names, matched)

async def fetch_data_go_kr_messages(
    client: httpx.AsyncClient,
    service_key: str,
    target_names: set[str],
    matched: dict[str, dict[str, Any]],
) -> None:
    url = f"{BED_API_BASE}/{MSG_OPERATION}"
    try:
        await _fetch_region_messages_async(
            client, url, service_key, target_names, matched
        )
    except Exception as exc:
        logger.error("[hospitals] public API (messages) fetch error: %s: %s", type(exc).__name__, exc)
