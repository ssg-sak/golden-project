# -*- coding: utf-8 -*-
import json
import logging
from typing import Any

from cachetools import TTLCache
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.api_clients.routing_client import fetch_multiple_etas

router = APIRouter(prefix="/api/routing", tags=["Routing"])
logger = logging.getLogger(__name__)

# TTL 5분, 최대 1000개의 출발-도착 세트 캐싱
eta_cache = TTLCache(maxsize=1000, ttl=300)

class DestinationItem(BaseModel):
    name: str
    lat: float
    lng: float

class EtaRequest(BaseModel):
    origin_lat: float
    origin_lng: float
    destinations: list[DestinationItem] = Field(..., max_length=20, description="최대 20개까지만 허용")

class EtaResponse(BaseModel):
    name: str
    eta_seconds: int | None
    distance_meters: int | None
    error: str | None

@router.post("/eta", response_model=list[EtaResponse])
async def get_etas(req: EtaRequest) -> list[dict[str, Any]]:
    """
    출발지에서 다중 목적지 병원까지의 실시간 ETA를 반환.
    무료 쿼터 초과 방지를 위해 5분간 In-Memory 캐싱 적용.
    에러 발생 시 빈 값 반환(Graceful Degradation).
    """
    if not req.destinations:
        return []

    # 캐시 키 생성 (좌표 소수점 4자리 반올림으로 캐시 적중률 향상 - 약 10m 오차)
    origin_key = f"{round(req.origin_lat, 4)},{round(req.origin_lng, 4)}"
    
    # 캐시된 결과와 새로 요청할 목적지 분류
    results = []
    destinations_to_fetch = []
    
    for dest in req.destinations:
        dest_key = f"{round(dest.lat, 4)},{round(dest.lng, 4)}"
        cache_key = f"{origin_key}->{dest_key}"
        
        cached_val = eta_cache.get(cache_key)
        if cached_val is not None:
            # 캐시에 있으면 바로 추가
            results.append(cached_val)
        else:
            destinations_to_fetch.append({"name": dest.name, "lat": dest.lat, "lng": dest.lng, "cache_key": cache_key})
            
    # 새로 요청할 목적지가 있다면 카카오 API 호출
    if destinations_to_fetch:
        logger.info(f"[routing] Fetching {len(destinations_to_fetch)} new ETAs from Kakao Mobility...")
        fetched_etas = await fetch_multiple_etas(
            origin_lat=req.origin_lat,
            origin_lng=req.origin_lng,
            destinations=destinations_to_fetch
        )
        
        # 결과 병합 및 캐싱
        for i, fetched in enumerate(fetched_etas):
            cache_key = destinations_to_fetch[i]["cache_key"]
            # 정상적으로 가져왔거나 (None 포함), 에러라도 일단 캐시하여 짧은 시간 내 무한 재요청 방지
            eta_cache[cache_key] = fetched
            results.append(fetched)

    return results
