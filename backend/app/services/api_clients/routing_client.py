# -*- coding: utf-8 -*-
from __future__ import annotations

import logging
import math
import time
from typing import Any

import httpx

from app.core.env import get_kakao_rest_api_key

logger = logging.getLogger(__name__)

KAKAO_NAVI_API_URL = "https://apis-navi.kakaomobility.com/v1/directions"
KAKAO_QUOTA_EXCEEDED_CODE = -10
QUOTA_BLOCK_SECONDS = 60 * 60
MAX_REALTIME_DESTINATIONS = 5

_quota_blocked_until = 0.0


def kakao_quota_blocked() -> bool:
    return time.monotonic() < _quota_blocked_until


def mark_kakao_quota_blocked() -> None:
    global _quota_blocked_until
    _quota_blocked_until = time.monotonic() + QUOTA_BLOCK_SECONDS


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    radius_km = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lng = math.radians(lng2 - lng1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lng / 2) ** 2
    )
    return radius_km * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def estimated_eta_result(
    origin_lat: float,
    origin_lng: float,
    destination: dict[str, Any],
    error: str | None = "stored_or_estimated",
) -> dict[str, Any]:
    """API를 쓰지 못할 때 쓰는 안전한 이동시간 추정값."""
    direct_km = _haversine_km(origin_lat, origin_lng, float(destination["lat"]), float(destination["lng"]))
    road_km = max(direct_km * 1.35, direct_km)
    eta_seconds = int((road_km / 38.0) * 3600 + 180)
    return {
        "name": destination["name"],
        "eta_seconds": max(60, eta_seconds),
        "distance_meters": int(road_km * 1000),
        "error": error,
        "source": "stored",
    }


def _quota_error_from_response(response: httpx.Response) -> bool:
    try:
        payload = response.json()
    except ValueError:
        return False
    return payload.get("code") == KAKAO_QUOTA_EXCEEDED_CODE


async def fetch_eta(
    client: httpx.AsyncClient,
    api_key: str,
    origin_lat: float,
    origin_lng: float,
    destination: dict[str, Any],
) -> dict[str, Any]:
    """단일 목적지까지의 차량 이동시간을 조회합니다."""
    headers = {"Authorization": f"KakaoAK {api_key}"}
    params = {
        "origin": f"{origin_lng},{origin_lat}",
        "destination": f"{destination['lng']},{destination['lat']}",
        "priority": "RECOMMEND",
    }

    try:
        response = await client.get(KAKAO_NAVI_API_URL, headers=headers, params=params, timeout=3.0)
        response.raise_for_status()
        data = response.json()

        routes = data.get("routes", [])
        if not routes:
            return estimated_eta_result(origin_lat, origin_lng, destination, error="no_route")

        summary = routes[0].get("summary", {})
        duration = summary.get("duration")
        distance = summary.get("distance")
        if duration is None or distance is None:
            return estimated_eta_result(origin_lat, origin_lng, destination, error="missing_route_summary")

        return {
            "name": destination["name"],
            "eta_seconds": int(duration),
            "distance_meters": int(distance),
            "error": None,
            "source": "realtime",
        }
    except httpx.HTTPStatusError as exc:
        if _quota_error_from_response(exc.response):
            mark_kakao_quota_blocked()
            logger.warning("[routing] Kakao Mobility quota exceeded. Realtime ETA is blocked for %s seconds.", QUOTA_BLOCK_SECONDS)
            return estimated_eta_result(origin_lat, origin_lng, destination, error="quota_exceeded")

        logger.warning(
            "[routing] Kakao API HTTP error for %s: %s - %s",
            destination["name"],
            exc.response.status_code,
            exc.response.text,
        )
        return estimated_eta_result(origin_lat, origin_lng, destination, error=f"http_{exc.response.status_code}")
    except Exception as exc:
        logger.warning("[routing] Kakao API fetch error for %s: %s: %s", destination["name"], type(exc).__name__, exc)
        return estimated_eta_result(origin_lat, origin_lng, destination, error=type(exc).__name__)


async def fetch_multiple_etas(
    origin_lat: float,
    origin_lng: float,
    destinations: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    저장/추정값을 기본 안전망으로 두고, 상위 목적지만 Kakao Mobility로 재검증합니다.
    쿼터 초과가 감지되면 즉시 남은 호출을 중단합니다.
    """
    api_key = get_kakao_rest_api_key()
    if not api_key:
        logger.info("[routing] KAKAO_REST_API_KEY is not set. Stored/estimated ETA will be used.")
        return [
            estimated_eta_result(origin_lat, origin_lng, destination, error="missing_api_key")
            for destination in destinations
        ]

    if kakao_quota_blocked():
        return [
            estimated_eta_result(origin_lat, origin_lng, destination, error="quota_blocked")
            for destination in destinations
        ]

    results: list[dict[str, Any]] = []
    realtime_destinations = destinations[:MAX_REALTIME_DESTINATIONS]

    async with httpx.AsyncClient(limits=httpx.Limits(max_connections=2)) as client:
        for destination in realtime_destinations:
            if kakao_quota_blocked():
                results.append(estimated_eta_result(origin_lat, origin_lng, destination, error="quota_blocked"))
                continue

            result = await fetch_eta(client, api_key, origin_lat, origin_lng, destination)
            results.append(result)

            if result.get("error") == "quota_exceeded":
                break

    fetched_names = {result["name"] for result in results}
    for destination in destinations:
        if destination["name"] not in fetched_names:
            results.append(estimated_eta_result(origin_lat, origin_lng, destination, error="quota_blocked" if kakao_quota_blocked() else "not_realtime_checked"))

    return results
