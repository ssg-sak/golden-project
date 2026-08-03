# -*- coding: utf-8 -*-
import asyncio
import logging
import time

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
SCHEDULED_JOB_TIMEOUT_SECONDS = 600


async def _run_target(target: str) -> None:
    started_at = time.perf_counter()
    logger.info("Scheduled job '%s' started", target)
    db = SessionLocal()
    try:
        result = await asyncio.wait_for(
            run_data_pipeline(db, targets={target}),
            timeout=SCHEDULED_JOB_TIMEOUT_SECONDS,
        )
        if result.error:
            logger.error(
                "Scheduled job '%s' completed with error=%s duration_sec=%.2f failed_sources=%s",
                target,
                result.error,
                time.perf_counter() - started_at,
                result.failed_sources or [],
            )
        else:
            logger.info(
                "Scheduled job '%s' succeeded duration_sec=%.2f "
                "admin_changed=%s hospitals_changed=%s population_changed=%s "
                "analysis_pending=%s snapshot_created=%s",
                target,
                time.perf_counter() - started_at,
                result.admin_changed,
                result.hospitals_changed,
                result.population_changed,
                result.analysis_pending,
                result.snapshot_created,
            )
    except TimeoutError:
        logger.error(
            "Scheduled job '%s' timed out after %s seconds",
            target,
            SCHEDULED_JOB_TIMEOUT_SECONDS,
        )
    except Exception as exc:
        logger.error(
            "Scheduled job '%s' failed duration_sec=%.2f error=%s",
            target,
            time.perf_counter() - started_at,
            exc,
        )
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
        _run_target,
        CronTrigger(hour=3, minute=0, timezone=tz),
        args=["emergency"],
        id="refresh_emergency",
        replace_existing=True,
        coalesce=True,
        max_instances=1,
        misfire_grace_time=3600,
    )
    scheduler.add_job(
        _run_target,
        CronTrigger(hour=3, minute=15, timezone=tz),
        args=["moonlight"],
        id="refresh_moonlight",
        replace_existing=True,
        coalesce=True,
        max_instances=1,
        misfire_grace_time=3600,
    )
    # 정상 공표 기간에는 매일, 장기 지연 시에는 지정일 18시에 다시 확인한다.
    # 해시가 같으면 unchanged로 끝나므로 반복 실행이 정책 공개본을 자동 승격하지 않는다.
    scheduler.add_job(
        _run_target,
        CronTrigger(day="1-7,10,15,20,25", hour=18, minute=0, timezone=tz),
        args=["population"],
        id="refresh_population",
        replace_existing=True,
        coalesce=True,
        max_instances=1,
        misfire_grace_time=86400,
    )
    scheduler.add_job(
        _run_target,
        CronTrigger(day=1, hour=5, minute=0, timezone=tz),
        args=["admin-boundary"],
        id="refresh_admin_boundary",
        replace_existing=True,
        coalesce=True,
        max_instances=1,
        misfire_grace_time=86400,
    )

    if scheduler is not None and not scheduler.running:
        scheduler.start()


def get_public_data_scheduler_status() -> dict[str, bool | int]:
    configured = get_env("ENABLE_PUBLIC_DATA_SCHEDULER", "false").lower() == "true"
    running = bool(scheduler is not None and scheduler.running)
    job_count = len(scheduler.get_jobs()) if running else 0
    return {
        "configured": configured,
        "running": running,
        "jobCount": job_count,
    }


def stop_public_data_scheduler() -> None:
    if scheduler is not None and scheduler.running:
        scheduler.shutdown(wait=False)
