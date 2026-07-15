# -*- coding: utf-8 -*-
import asyncio
import logging

try:
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    from apscheduler.triggers.cron import CronTrigger
except ImportError:  # pragma: no cover
    AsyncIOScheduler = None  # type: ignore[assignment,misc]
    CronTrigger = None  # type: ignore[assignment,misc]

from app.core.env import get_env
from app.db.database import SessionLocal
from app.services.pipeline import run_data_pipeline

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler() if AsyncIOScheduler is not None else None


async def _run_target(target: str) -> None:
    db = SessionLocal()
    try:
        result = await run_data_pipeline(db, targets={target})
        if result.error:
            logger.error(
                "Scheduled job '%s' completed with error=%s failed_sources=%s",
                target,
                result.error,
                result.failed_sources or [],
            )
    except Exception as exc:
        logger.error("Scheduled job '%s' failed: %s", target, exc)
    finally:
        db.close()


def start_public_data_scheduler() -> None:
    if scheduler is None or CronTrigger is None:
        logger.warning("APScheduler is not installed. Public data scheduler disabled.")
        return
    if get_env("ENABLE_PUBLIC_DATA_SCHEDULER", "false").lower() != "true":
        logger.info("ENABLE_PUBLIC_DATA_SCHEDULER is false. Scheduler will not start.")
        return

    tz = get_env("APP_TIMEZONE", "Asia/Seoul")
    logger.info("Starting public data scheduler (timezone=%s)...", tz)

    scheduler.add_job(
        lambda: asyncio.create_task(_run_target("emergency")),
        CronTrigger(hour=3, minute=0, timezone=tz),
        id="refresh_emergency",
        replace_existing=True,
    )
    scheduler.add_job(
        lambda: asyncio.create_task(_run_target("moonlight")),
        CronTrigger(hour=3, minute=15, timezone=tz),
        id="refresh_moonlight",
        replace_existing=True,
    )
    scheduler.add_job(
        lambda: asyncio.create_task(_run_target("population")),
        CronTrigger(hour=4, minute=0, timezone=tz),
        id="refresh_population",
        replace_existing=True,
    )
    scheduler.add_job(
        lambda: asyncio.create_task(_run_target("admin-boundary")),
        CronTrigger(day=1, hour=5, minute=0, timezone=tz),
        id="refresh_admin_boundary",
        replace_existing=True,
    )

    if scheduler is not None and not scheduler.running:
        scheduler.start()


def stop_public_data_scheduler() -> None:
    if scheduler is not None and scheduler.running:
        scheduler.shutdown(wait=False)
