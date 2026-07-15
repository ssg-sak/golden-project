# -*- coding: utf-8 -*-
import asyncio
import logging
from typing import Any

import httpx

from app.core.env import get_kakao_rest_api_key

logger = logging.getLogger(__name__)

KAKAO_NAVI_API_URL = "https://apis-navi.kakaomobility.com/v1/directions"


async def fetch_eta(
    client: httpx.AsyncClient,
    api_key: str,
    origin_lat: float,
    origin_lng: float,
    dest_name: str,
    dest_lat: float,
    dest_lng: float,
) -> dict[str, Any]:
    """단일 목적지까지의 차량 예상 이동 시간(ETA) 조회 (초 단위 반환)."""
    headers = {"Authorization": f"KakaoAK {api_key}"}
    # 카카오 API는 X,Y (경도,위도) 순서
    params = {
        "origin": f"{origin_lng},{origin_lat}",
        "destination": f"{dest_lng},{dest_lat}",
        "priority": "RECOMMEND", # 추천 경로
    }

    try:
        response = await client.get(KAKAO_NAVI_API_URL, headers=headers, params=params, timeout=3.0)
        response.raise_for_status()
        data = response.json()
        
        routes = data.get("routes", [])
        if not routes:
            return {
                "name": dest_name,
                "eta_seconds": None,
                "distance_meters": None,
                "error": "No routes found",
            }
            
        duration = routes[0].get("summary", {}).get("duration")
        distance = routes[0].get("summary", {}).get("distance")
        
        return {
            "name": dest_name,
            "eta_seconds": duration,
            "distance_meters": distance,
            "error": None
        }
    except httpx.HTTPStatusError as exc:
        logger.warning(f"[routing] Kakao API HTTP error for {dest_name}: {exc.response.status_code} - {exc.response.text}")
        return {
            "name": dest_name,
            "eta_seconds": None,
            "distance_meters": None,
            "error": f"HTTP {exc.response.status_code}",
        }
    except Exception as exc:
        logger.warning(f"[routing] Kakao API fetch error for {dest_name}: {type(exc).__name__}: {exc}")
        return {
            "name": dest_name,
            "eta_seconds": None,
            "distance_meters": None,
            "error": str(exc),
        }


async def fetch_multiple_etas(
    origin_lat: float,
    origin_lng: float,
    destinations: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    다중 목적지에 대한 ETA 동시 조회.
    destinations: [{"name": "병원A", "lat": 35.1, "lng": 128.1}, ...]
    만약 KAKAO_REST_API_KEY가 없거나 오류 시 빈 값(null) 반환 (Graceful Degradation).
    """
    api_key = get_kakao_rest_api_key()
    if not api_key:
        logger.info("[routing] KAKAO_REST_API_KEY is not set. Falling back to null ETAs.")
        return [
            {
                "name": dest["name"],
                "eta_seconds": None,
                "distance_meters": None,
                "error": "Missing API Key",
            }
            for dest in destinations
        ]

    results = []
    # 동시성 제한을 위해 커넥션 풀 공유
    async with httpx.AsyncClient(limits=httpx.Limits(max_connections=20)) as client:
        tasks = [
            fetch_eta(
                client,
                api_key,
                origin_lat,
                origin_lng,
                dest["name"],
                dest["lat"],
                dest["lng"],
            )
            for dest in destinations
        ]
        results = await asyncio.gather(*tasks)

    return list(results)
