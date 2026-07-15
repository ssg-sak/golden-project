# -*- coding: utf-8 -*-
from __future__ import annotations

import logging
from typing import Any

from cachetools import TTLCache
from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.api_clients.routing_client import fetch_multiple_etas

router = APIRouter(prefix="/api/routing", tags=["Routing"])
logger = logging.getLogger(__name__)

MAX_ETA_DESTINATIONS = 5

# 같은 출발지-목적지 조합을 반복 호출하지 않기 위한 단기 캐시입니다.
eta_cache: TTLCache[str, dict[str, Any]] = TTLCache(maxsize=1000, ttl=600)


class DestinationItem(BaseModel):
    name: str
    lat: float
    lng: float


class EtaRequest(BaseModel):
    origin_lat: float
    origin_lng: float
    destinations: list[DestinationItem] = Field(
        ...,
        max_length=MAX_ETA_DESTINATIONS,
        description="실시간 재검증은 상위 5개 목적지만 허용합니다.",
    )


class EtaResponse(BaseModel):
    name: str
    eta_seconds: int | None
    distance_meters: int | None
    error: str | None
    source: str | None = None


def _route_cache_key(origin_lat: float, origin_lng: float, dest_lat: float, dest_lng: float) -> str:
    origin_key = f"{round(origin_lat, 4)},{round(origin_lng, 4)}"
    dest_key = f"{round(dest_lat, 4)},{round(dest_lng, 4)}"
    return f"{origin_key}->{dest_key}"


@router.post("/eta", response_model=list[EtaResponse])
async def get_etas(req: EtaRequest) -> list[dict[str, Any]]:
    """
    병원 추천 정렬용 ETA를 반환합니다.
    전체 병원을 실시간 호출하지 않고, 프론트가 보낸 상위 목적지만 재검증합니다.
    """
    if not req.destinations:
        return []

    ordered_keys: list[str] = []
    destinations_to_fetch: list[dict[str, Any]] = []
    results_by_key: dict[str, dict[str, Any]] = {}

    for dest in req.destinations:
        cache_key = _route_cache_key(req.origin_lat, req.origin_lng, dest.lat, dest.lng)
        ordered_keys.append(cache_key)

        cached_val = eta_cache.get(cache_key)
        if cached_val is not None:
            results_by_key[cache_key] = {**cached_val, "source": cached_val.get("source") or "cache"}
            continue

        destinations_to_fetch.append({
            "name": dest.name,
            "lat": dest.lat,
            "lng": dest.lng,
            "cache_key": cache_key,
        })

    if destinations_to_fetch:
        logger.info("[routing] Fetching %s ETA candidates from Kakao Mobility guard.", len(destinations_to_fetch))
        fetched_etas = await fetch_multiple_etas(
            origin_lat=req.origin_lat,
            origin_lng=req.origin_lng,
            destinations=destinations_to_fetch,
        )

        for fetched in fetched_etas:
            matching = next(
                (dest for dest in destinations_to_fetch if dest["name"] == fetched["name"]),
                None,
            )
            if matching is None:
                continue
            cache_key = matching["cache_key"]
            eta_cache[cache_key] = fetched
            results_by_key[cache_key] = fetched

    return [results_by_key[key] for key in ordered_keys if key in results_by_key]
