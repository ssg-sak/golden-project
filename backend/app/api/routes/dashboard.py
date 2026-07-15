# -*- coding: utf-8 -*-
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone

from app.core.env import data_refresh_admin_token
from app.db.database import get_db
from app.db.models import DashboardSnapshot, DataSourceStatus
from app.services.analysis_metrics import format_change_text
from app.services.data_seed import ensure_seeded
from app.services.pipeline import run_data_pipeline

router = APIRouter(tags=["dashboard"])


def _ensure_utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _build_fallback_summary() -> dict:
    return {
        "adminArea": {
            "count": 0,
            "label": "대구광역시 읍·면·동",
            "difference": 0,
            "changeText": "비교 데이터 없음",
        },
        "emergencyFacilities": {
            "total": 0,
            "categories": {"large": 0, "secondary": 0, "moonlightPediatric": 0},
            "difference": 0,
            "changeText": "비교 데이터 없음",
        },
        "risk": {
            "highRiskCount": 0,
            "threshold": 0.0,
            "difference": 0,
            "changeText": "비교 데이터 없음",
        },
        "population": {"baseMonth": "—"},
        "sources": {},
        "status": {
            "lastCheckedAt": None,
            "lastUpdatedAt": None,
            "stale": True,
            "dataState": "empty",
        },
        "analysisVersion": None,
    }


@router.get("/api/dashboard/summary")
def get_dashboard_summary(db: Session = Depends(get_db)) -> dict:
    ensure_seeded(db)
    snapshots = (
        db.query(DashboardSnapshot)
        .order_by(DashboardSnapshot.generated_at.desc())
        .limit(2)
        .all()
    )

    if not snapshots:
        return _build_fallback_summary()

    latest = snapshots[0]
    previous = snapshots[1] if len(snapshots) > 1 else None

    admin_diff = latest.admin_dong_count - (previous.admin_dong_count if previous else latest.admin_dong_count)
    er_diff = latest.emergency_total - (previous.emergency_total if previous else latest.emergency_total)
    risk_diff = latest.high_risk_admin_dong_count - (
        previous.high_risk_admin_dong_count if previous else latest.high_risk_admin_dong_count
    )

    statuses = db.query(DataSourceStatus).all()
    last_checked_at = max((_ensure_utc(s.last_checked_at) for s in statuses if s.last_checked_at), default=None)
    last_updated_at = max((_ensure_utc(s.last_updated_at) for s in statuses if s.last_updated_at), default=None)

    is_stale = True
    if last_checked_at:
        is_stale = datetime.now(timezone.utc) - last_checked_at > timedelta(hours=24)

    failed_sources = [s.source_name for s in statuses if s.status in {"failed", "degraded"}]
    data_state = "degraded" if failed_sources else "ok"

    return {
        "adminArea": {
            "count": latest.admin_dong_count,
            "label": "대구광역시 읍·면·동",
            "difference": admin_diff if previous else 0,
            "changeText": format_change_text(admin_diff) if previous else "비교 데이터 없음",
        },
        "emergencyFacilities": {
            "total": latest.emergency_total,
            "categories": {
                "large": latest.large_emergency_count,
                "secondary": latest.secondary_emergency_count,
                "moonlightPediatric": latest.moonlight_pediatric_count,
            },
            "difference": er_diff if previous else 0,
            "changeText": format_change_text(er_diff) if previous else "비교 데이터 없음",
        },
        "risk": {
            "highRiskCount": latest.high_risk_admin_dong_count,
            "threshold": latest.risk_threshold,
            "difference": risk_diff if previous else 0,
            "changeText": format_change_text(risk_diff) if previous else "비교 데이터 없음",
        },
        "population": {"baseMonth": latest.population_base_month or "—"},
        "sources": {
            s.source_name: {
                "status": s.status,
                "lastCheckedAt": _ensure_utc(s.last_checked_at).isoformat() if s.last_checked_at else None,
                "lastUpdatedAt": _ensure_utc(s.last_updated_at).isoformat() if s.last_updated_at else None,
                "recordCount": s.record_count,
            }
            for s in statuses
        },
        "status": {
            "lastCheckedAt": last_checked_at.isoformat() if last_checked_at else None,
            "lastUpdatedAt": last_updated_at.isoformat() if last_updated_at else None,
            "stale": is_stale,
            "dataState": data_state,
            "failedSources": failed_sources,
        },
        "analysisVersion": latest.analysis_version,
    }


@router.get("/api/dashboard/data-status")
def get_data_status(db: Session = Depends(get_db)) -> dict:
    ensure_seeded(db)
    statuses = db.query(DataSourceStatus).all()
    latest_snapshot = db.query(DashboardSnapshot).order_by(DashboardSnapshot.generated_at.desc()).first()
    return {
        "sources": [
            {
                "sourceName": s.source_name,
                "status": s.status,
                "recordCount": s.record_count,
                "lastCheckedAt": _ensure_utc(s.last_checked_at).isoformat() if s.last_checked_at else None,
                "lastUpdatedAt": _ensure_utc(s.last_updated_at).isoformat() if s.last_updated_at else None,
                "lastSuccessAt": _ensure_utc(s.last_success_at).isoformat() if s.last_success_at else None,
                "errorMessage": s.error_message,
            }
            for s in statuses
        ],
        "latestSnapshotAt": latest_snapshot.generated_at.isoformat() if latest_snapshot else None,
    }


@router.post("/api/dashboard/refresh")
async def force_refresh_dashboard(
    db: Session = Depends(get_db),
    x_admin_token: str | None = Header(default=None, alias="X-Admin-Token"),
):
    expected = data_refresh_admin_token()
    if expected and x_admin_token != expected:
        raise HTTPException(status_code=401, detail="Invalid admin token")

    result = await run_data_pipeline(db)
    if result.error == "already_running":
        raise HTTPException(status_code=409, detail="Pipeline already running")
    if result.error == "partial_failure":
        raise HTTPException(
            status_code=502,
            detail={
                "message": "Data pipeline completed with source failures",
                "failedSources": result.failed_sources or [],
                "snapshotCreated": result.snapshot_created,
            },
        )
    return {
        "message": "Data pipeline executed",
        "adminChanged": result.admin_changed,
        "hospitalsChanged": result.hospitals_changed,
        "populationChanged": result.population_changed,
        "analysisRerun": result.analysis_rerun,
        "snapshotCreated": result.snapshot_created,
        "baseMonth": result.base_month,
    }
