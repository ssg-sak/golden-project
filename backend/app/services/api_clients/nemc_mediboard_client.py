"""국립중앙의료원 '내 손안의 응급실' 공개 병상 현황 연동."""
from __future__ import annotations

import logging
import re
from typing import Any

import httpx

from app.services.bed_payload import bed_payload

logger = logging.getLogger(__name__)

MEDIBOARD_HANDY_URL = "https://mediboard.nemc.or.kr/api/v1/search/handy"
DAEGU_BJDCD1 = "27"


def _to_int(value: Any) -> int | None:
    if value is None or value == "":
        return None
    try:
        return int(float(str(value)))
    except (TypeError, ValueError):
        return None


def _normalize_name(value: str) -> str:
    value = re.sub(r"\([^)]*\)", "", value)
    value = re.sub(r"^(의료법인|학교법인|재단법인|사회복지법인)", "", value)
    return re.sub(r"[^0-9A-Za-z가-힣]", "", value)


def _find_target_name(api_name: str, target_names: set[str]) -> str | None:
    normalized_api = _normalize_name(api_name)
    exact = {_normalize_name(name): name for name in target_names}
    if normalized_api in exact:
        return exact[normalized_api]

    # 공식 명칭의 지역 접두어가 프로젝트 표시명 중간에 삽입된 사례
    # (예: 계명대학교대구동산병원 ↔ 계명대학교 동산병원)를 보정한다.
    without_daegu = normalized_api.replace("대구", "")
    if without_daegu in exact:
        return exact[without_daegu]

    candidates = [
        name
        for normalized, name in exact.items()
        if len(normalized) >= 3
        and (normalized in normalized_api or normalized_api in normalized)
    ]
    return candidates[0] if len(candidates) == 1 else None


def _special_bed(
    available: Any,
    total: Any,
    *,
    availability_flag: bool = False,
) -> dict[str, int | bool | None]:
    return {
        "available": None if availability_flag else _to_int(available),
        "total": _to_int(total),
        "is_available": str(available).upper() == "Y" if availability_flag else None,
    }


def merge_mediboard_rows(
    rows: list[dict[str, Any]],
    target_names: set[str],
    matched: dict[str, dict[str, Any]],
) -> None:
    """공식 간편조회 응답을 프로젝트의 실시간 병상 스키마로 변환한다."""
    for row in rows:
        target_name = _find_target_name(str(row.get("emergencyRoomName") or ""), target_names)
        if target_name is None:
            continue

        general = _to_int(row.get("generalEmergencyAvailable"))
        child = _to_int(row.get("childEmergencyAvailable"))
        if general is None:
            continue

        messages = [
            str(item.get("message"))
            for key in ("erMessages", "unavailableMessages", "adMessages")
            for item in (row.get(key) or [])
            if isinstance(item, dict) and item.get("message")
        ]

        matched[target_name] = bed_payload(
            general,
            child,
            "nemc-mediboard",
            total_hvec=_to_int(row.get("generalEmergencyTotal")),
            total_hvoc=_to_int(row.get("childEmergencyTotal")),
            special_beds={
                "분만실": _special_bed(
                    row.get("deliveryRoomAvailable"),
                    row.get("deliveryRoomTotal"),
                    availability_flag=True,
                ),
                "음압격리": _special_bed(row.get("npirAvailable"), row.get("npirTotal")),
                "일반격리": _special_bed(row.get("generalAvailable"), row.get("generalTotal")),
                "코호트격리": _special_bed(row.get("cohortAvailable"), row.get("cohortTotal")),
            },
            realtime_messages=messages,
        )


async def fetch_nemc_mediboard_beds(
    client: httpx.AsyncClient,
    target_names: set[str],
    matched: dict[str, dict[str, Any]],
) -> None:
    response = await client.get(
        MEDIBOARD_HANDY_URL,
        params={"searchCondition": "regional", "bjdcd1": DAEGU_BJDCD1},
    )
    response.raise_for_status()
    payload = response.json()
    rows = payload.get("result", {}).get("data", [])
    if not isinstance(rows, list):
        raise ValueError("국립중앙의료원 병상 응답의 result.data가 배열이 아닙니다.")
    merge_mediboard_rows(rows, target_names, matched)
    logger.info("[hospitals] NEMC mediboard matched %d hospitals", len(matched))
