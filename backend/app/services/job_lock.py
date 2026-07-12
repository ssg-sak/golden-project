# -*- coding: utf-8 -*-
"""SQLite 기반 배치 작업 중복 실행 방지."""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.db.models import JobLock

logger = logging.getLogger(__name__)


def try_acquire_job_lock(db: Session, lock_name: str, ttl_sec: int = 3600) -> str | None:
    now = datetime.now(timezone.utc)
    owner = str(uuid.uuid4())
    record = db.query(JobLock).filter_by(lock_name=lock_name).first()

    if record is None:
        record = JobLock(lock_name=lock_name, locked_at=now, locked_by=owner)
        db.add(record)
        db.commit()
        return owner

    if record.locked_at and record.locked_at > now - timedelta(seconds=ttl_sec):
        logger.warning("Job lock '%s' is held by %s", lock_name, record.locked_by)
        return None

    record.locked_at = now
    record.locked_by = owner
    db.commit()
    return owner


def release_job_lock(db: Session, lock_name: str, owner: str) -> None:
    record = db.query(JobLock).filter_by(lock_name=lock_name).first()
    if record and record.locked_by == owner:
        record.locked_at = None
        record.locked_by = None
        db.commit()
