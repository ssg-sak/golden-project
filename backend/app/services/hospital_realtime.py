# -*- coding: utf-8 -*-
"""응급실 실시간 가용 병상 - Mock / 공공 API (비동기 + 방어적 폴백)."""
from __future__ import annotations

import logging
from typing import Any

import httpx

from app.core.env import has_data_go_kr_api_key
from app.services.bed_payload import bed_payload, null_bed_payload

logger = logging.getLogger(__name__)

CANONICAL_DISPLAY_NAMES: dict[str, str] = {
    "계명대학교대구동산병원": "계명대학교 동산병원",
    "계명대학교동산병원": "계명대학교 동산병원",
    "의료법인구의료재단구병원": "구병원",
    "(재)미리내천주성삼성직수도회천주성삼병원": "천주성삼병원",
    "한국보훈복지의료공단대구보훈병원": "대구보훈병원",
    "대구가톨릭대학교칠곡가톨릭병원": "대구가톨릭대학교 칠곡가톨릭병원",
}

REQUEST_TIMEOUT = 30.0

def display_name(api_name: str) -> str:
    return CANONICAL_DISPLAY_NAMES.get(api_name, api_name)

def has_any_live_beds(data: dict[str, dict[str, Any]]) -> bool:
    """캐시 갱신 가능한 실병상 데이터가 하나라도 있는지."""
    return any(row.get("available_beds") is not None for row in data.values())

def get_null_realtime_data(hospital_names: list[str]) -> dict[str, dict[str, Any]]:
    """실시간 조회 실패 시 - 병상 정보 없음(null)으로 채움."""
    empty = null_bed_payload()
    return {name: dict(empty) for name in hospital_names}

def _resolve_service_key() -> str | None:
    from app.core.env import env_str

    key = (env_str("DATA_GO_KR_API_KEY") or "").strip()

    if not key or key == "YOUR_API_KEY_HERE":
        return None
    return key


async def fetch_all_beds_from_api_async(
    hospital_names: list[str],
) -> dict[str, dict[str, Any]]:
    """
    공공 API 실시간 병상 조회 (비동기).
    백그라운드 폴러 전용 — 사용자 요청 경로에서는 캐시만 읽습니다.
    """
    service_key = _resolve_service_key()
    if not service_key:
        logger.warning("[hospitals] DATA_GO_KR_API_KEY missing - available_beds=null")
        return get_null_realtime_data(hospital_names)

    target_names = set(hospital_names)
    matched: dict[str, dict[str, Any]] = {}

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            from app.services.api_clients.data_go_kr_client import (
                fetch_data_go_kr_beds,
                fetch_data_go_kr_messages,
            )
            # 1단계: 병상 데이터 수집
            await fetch_data_go_kr_beds(client, service_key, target_names, matched)
            # 2단계: 응급실 특이사항 메시지 수집 (matched에 병합)
            if matched:
                await fetch_data_go_kr_messages(client, service_key, target_names, matched)

    except Exception as exc:
        logger.warning(
            "[hospitals] public API client error - all null: %s: %s",
            type(exc).__name__,
            exc,
        )
        return get_null_realtime_data(hospital_names)

    if not matched:
        logger.warning("[hospitals] public API no matches - available_beds=null")
        return get_null_realtime_data(hospital_names)

    result: dict[str, dict[str, Any]] = {}
    for name in hospital_names:
        if name in matched:
            result[name] = matched[name]
        else:
            result[name] = null_bed_payload()
    return result


async def resolve_realtime_beds_async(
    hospital_names: list[str],
) -> dict[str, dict[str, Any]]:
    """
    인메모리 캐시 (백그라운드 폴러가 갱신)에서 실시간 병상 조회
    """
    from app.services.bed_cache import get_beds_for_names

    return await get_beds_for_names(hospital_names)


def merge_realtime_into_hospitals(
    hospitals: list[dict[str, Any]],
    realtime_by_name: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    merged: list[dict[str, Any]] = []
    for hospital in hospitals:
        name = str(hospital.get("name", ""))
        realtime = realtime_by_name.get(name, null_bed_payload())
        merged.append({**hospital, **realtime})
    return merged
