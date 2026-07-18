# -*- coding: utf-8 -*-
"""실시간 병상 인메모리 캐시 — 사용자 요청 시 즉시 반환."""
from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from app.services.bed_payload import null_bed_payload
from app.core.env import bed_cache_poll_interval_sec

logger = logging.getLogger(__name__)


@dataclass
class BedCacheSnapshot:
    data: dict[str, dict[str, Any]] = field(default_factory=dict)
    updated_at: datetime | None = None
    last_error: str | None = None


_lock = asyncio.Lock()
_snapshot = BedCacheSnapshot()


async def get_beds_for_names(hospital_names: list[str]) -> dict[str, dict[str, Any]]:
    """캐시에서 병원별 병상 조회. 없으면 null 페이로드."""
    async with _lock:
        cached = _snapshot.data

    result: dict[str, dict[str, Any]] = {}
    for name in hospital_names:
        if name in cached:
            result[name] = dict(cached[name])
        else:
            result[name] = null_bed_payload()
    return result


async def mark_refresh_error(message: str) -> None:
    """캐시 데이터는 유지하고 마지막 오류만 기록."""
    async with _lock:
        _snapshot.last_error = message
    logger.warning("bed cache refresh error (data preserved): %s", message)


async def replace_cache(data: dict[str, dict[str, Any]], *, error: str | None = None) -> None:
    async with _lock:
        _snapshot.data = {name: dict(payload) for name, payload in data.items()}
        _snapshot.updated_at = datetime.now(timezone.utc)
        _snapshot.last_error = error
    logger.info("bed cache updated: %d hospitals", len(data))


async def get_cache_status() -> dict[str, Any]:
    async with _lock:
        age_sec: float | None = None
        if _snapshot.updated_at is not None:
            age_sec = (datetime.now(timezone.utc) - _snapshot.updated_at).total_seconds()
        stale_after_sec = max(bed_cache_poll_interval_sec() * 3, 300)
        return {
            "hospital_count": len(_snapshot.data),
            "updated_at": _snapshot.updated_at.isoformat() if _snapshot.updated_at else None,
            "age_seconds": age_sec,
            "last_error": _snapshot.last_error,
            "stale": age_sec is None or age_sec > stale_after_sec or _snapshot.last_error is not None,
            "stale_after_seconds": stale_after_sec,
        }
