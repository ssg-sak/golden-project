# -*- coding: utf-8 -*-
"""백그라운드 공공 API 폴링 — 요청마다 9회 호출하지 않음."""
from __future__ import annotations

import asyncio
import logging

from app.core.env import (
    bed_cache_poll_interval_sec,
    has_data_go_kr_api_key,
    should_use_mock_realtime
)
from app.services.bed_cache import mark_refresh_error, replace_cache
from app.services.hospital_realtime import (
    fetch_all_beds_from_api_async,
    has_any_live_beds,
)
from app.services.hospital_static import load_hospital_names

logger = logging.getLogger(__name__)

_poller_task: asyncio.Task[None] | None = None


async def refresh_bed_cache() -> None:
    """전체 병원 대상 공공 API 조회 후 캐시 갱신."""
    names = load_hospital_names()
    try:
        data = await fetch_all_beds_from_api_async(names)
        if has_any_live_beds(data):
            await replace_cache(data)
        else:
            logger.warning("bed cache refresh skipped — no live bed data from API")
            await mark_refresh_error("public API returned no live bed data")
    except Exception as exc:
        logger.warning("bed cache refresh failed: %s: %s", type(exc).__name__, exc)
        await mark_refresh_error(str(exc))


async def _poll_loop() -> None:
    interval = bed_cache_poll_interval_sec()
    logger.info("bed cache poller started (interval=%ss)", interval)
    while True:
        await refresh_bed_cache()
        await asyncio.sleep(interval)


async def start_bed_poller() -> None:
    global _poller_task
    
    if should_use_mock_realtime():
        logger.info("Using mock API or no DATA_GO_KR_API_KEY — bed cache poller disabled")
        return

    _poller_task = asyncio.create_task(_poll_loop(), name="bed-cache-poller")


async def stop_bed_poller() -> None:
    global _poller_task
    if _poller_task is None:
        return
    _poller_task.cancel()
    try:
        await _poller_task
    except asyncio.CancelledError:
        pass
    _poller_task = None
    logger.info("bed cache poller stopped")
