# -*- coding: utf-8 -*-
import hashlib
import json
import logging
from typing import Any

from datetime import datetime, timezone

from sqlalchemy.orm import Session
from app.db.models import DataSourceStatus

logger = logging.getLogger(__name__)


def normalize_records_for_hash(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    for record in records:
        cleaned = {
            key: (
                None
                if value is None
                else str(value).strip()
                if isinstance(value, str)
                else float(value)
                if isinstance(value, (int, float)) and not isinstance(value, bool)
                else value
            )
            for key, value in record.items()
            if key not in {"collected_at", "source_updated_at"}
        }
        normalized.append(cleaned)
    return sorted(normalized, key=lambda item: json.dumps(item, sort_keys=True, ensure_ascii=False))


def generate_hash(data: Any) -> str:
    json_str = json.dumps(data, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(json_str.encode("utf-8")).hexdigest()


def check_and_update_status(
    db: Session,
    source_name: str,
    new_data: Any,
    version: str | None = None,
) -> tuple[bool, str, DataSourceStatus | None]:
    new_hash = generate_hash(new_data)
    status_record = db.query(DataSourceStatus).filter_by(source_name=source_name).first()
    now = datetime.now(timezone.utc)

    has_changed = True
    if status_record:
        if status_record.data_hash == new_hash:
            has_changed = False
            status_record.last_checked_at = now
            status_record.status = "unchanged"
        else:
            status_record.data_hash = new_hash
            status_record.last_checked_at = now
            status_record.last_updated_at = now
            status_record.status = "updated"
            status_record.source_version = version or status_record.source_version
            status_record.record_count = len(new_data) if isinstance(new_data, list) else 0
    else:
        status_record = DataSourceStatus(
            source_name=source_name,
            data_hash=new_hash,
            last_checked_at=now,
            last_updated_at=now,
            last_success_at=now,
            status="updated",
            source_version=version,
            record_count=len(new_data) if isinstance(new_data, list) else 0,
        )
        db.add(status_record)

    db.commit()
    return has_changed, new_hash, status_record


def log_failure(db: Session, source_name: str, error_message: str) -> None:
    status_record = db.query(DataSourceStatus).filter_by(source_name=source_name).first()
    now = datetime.now(timezone.utc)
    if status_record:
        status_record.last_checked_at = now
        status_record.status = "failed"
        status_record.error_message = str(error_message)[:500]
    else:
        status_record = DataSourceStatus(
            source_name=source_name,
            last_checked_at=now,
            status="failed",
            error_message=str(error_message)[:500],
        )
        db.add(status_record)
    db.commit()


def mark_success(db: Session, source_name: str) -> None:
    status_record = db.query(DataSourceStatus).filter_by(source_name=source_name).first()
    if status_record:
        status_record.last_success_at = datetime.now(timezone.utc)
        status_record.error_message = None
        if status_record.status == "failed":
            status_record.status = "updated"
        db.commit()
