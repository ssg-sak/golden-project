# -*- coding: utf-8 -*-
import logging

from fastapi import APIRouter, HTTPException

from app.services.bed_cache import get_cache_status
from app.services.hospital_realtime import (
    get_null_realtime_data,
    merge_realtime_into_hospitals,
    resolve_realtime_beds_async,
)
from app.services.hospital_static import load_static_hospitals
from app.services.hira_client import fetch_hira_data_async, merge_hira_into_hospitals

logger = logging.getLogger(__name__)
router = APIRouter(tags=["hospitals"])


@router.get("/api/hospitals")
async def get_hospitals() -> list[dict]:
    """대구 응급의료기관 + 달빛어린이병원 (정적 JSON + 캐시된 실시간 병상, 항상 200 OK)."""
    hospitals = load_static_hospitals()
    names = [str(row.get("name", "")) for row in hospitals if row.get("name")]

    try:
        realtime = await resolve_realtime_beds_async(names)
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning(
            "realtime beds error - returning static data with available_beds=null: %s: %s",
            type(exc).__name__,
            exc,
        )
        realtime = get_null_realtime_data(names)

    merged = merge_realtime_into_hospitals(hospitals, realtime)
    
    # HIRA API 데이터 조회 및 병합 (에러 시 빈 딕셔너리로 방어됨)
    hira_data = await fetch_hira_data_async(names)
    merged_with_hira = merge_hira_into_hospitals(merged, hira_data)
    
    return merged_with_hira



@router.get("/api/hospitals/beds-cache-status")
async def get_hospitals_beds_cache_status() -> dict:
    """개발·운영용 — 병상 캐시 갱신 시각 (Mock 모드에서도 조회 가능)."""
    return await get_cache_status()


@router.get("/api/hospitals/runtime-config")
async def get_hospitals_runtime_config() -> dict:
    """개발용 — Mock/실 API 분기 상태 (키 값은 노출하지 않음)."""
    from app.core.env import has_data_go_kr_api_key, should_use_mock_realtime, use_mock_api

    return {
        "use_mock_api": use_mock_api(),
        "has_api_key": has_data_go_kr_api_key(),
        "should_use_mock_realtime": should_use_mock_realtime(),
    }
