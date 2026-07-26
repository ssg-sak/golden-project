# -*- coding: utf-8 -*-
import json
import secrets
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.core.env import data_refresh_admin_token
from app.db.database import get_db
from app.db.models import DashboardSnapshot, DataSourceStatus
from app.services.analysis_metrics import format_change_text
from app.services.data_seed import ensure_seeded
from app.services.fetchers.population_api import (
    latest_completed_population_yyyymm,
)
from app.services.pipeline import ACTUAL_ROAD_MATRIX_PATH, run_data_pipeline

router = APIRouter(tags=["dashboard"])

FRESHNESS_THRESHOLD_HOURS = 24.0
EXTERNAL_SOURCE_NAMES = frozenset(
    {
        "sgis_admin_dong",
        "emergency_facilities",
        "moonlight_pediatric",
        "population",
    }
)


def _ensure_utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _age_hours(value: datetime | None, now: datetime) -> float | None:
    normalized = _ensure_utc(value)
    if normalized is None:
        return None
    return round(max((now - normalized).total_seconds(), 0.0) / 3_600, 2)


def _source_status_payload(
    source: DataSourceStatus,
    now: datetime,
) -> dict[str, Any]:
    checked_age_hours = _age_hours(source.last_checked_at, now)
    updated_age_hours = _age_hours(source.last_updated_at, now)
    success_age_hours = _age_hours(source.last_success_at, now)
    is_external = source.source_name in EXTERNAL_SOURCE_NAMES
    is_fallback = source.status == "degraded"
    expected_source_version = None
    period_current = None
    freshness_policy = "24h_operational_check"
    if source.source_name == "population":
        expected_yyyymm = latest_completed_population_yyyymm(now)
        expected_source_version = (
            f"{expected_yyyymm[:4]}.{expected_yyyymm[4:]}"
        )
        period_current = source.source_version == expected_source_version
        freshness_policy = "monthly_completed_period"
    is_stale = is_external and (
        source.status in {"failed", "degraded"}
        or checked_age_hours is None
        or checked_age_hours > FRESHNESS_THRESHOLD_HOURS
        or success_age_hours is None
        or success_age_hours > FRESHNESS_THRESHOLD_HOURS
    )
    return {
        "sourceName": source.source_name,
        "sourceVersion": source.source_version,
        "status": source.status,
        "recordCount": source.record_count,
        "lastCheckedAt": (
            _ensure_utc(source.last_checked_at).isoformat()
            if source.last_checked_at
            else None
        ),
        "lastUpdatedAt": (
            _ensure_utc(source.last_updated_at).isoformat()
            if source.last_updated_at
            else None
        ),
        "lastSuccessAt": (
            _ensure_utc(source.last_success_at).isoformat()
            if source.last_success_at
            else None
        ),
        "checkedAgeHours": checked_age_hours,
        "updatedAgeHours": updated_age_hours,
        "successAgeHours": success_age_hours,
        "isExternal": is_external,
        "freshnessPolicy": freshness_policy,
        "expectedSourceVersion": expected_source_version,
        "periodCurrent": period_current,
        "stale": is_stale,
        "isFallback": is_fallback,
        "fallbackVersion": source.source_version if is_fallback else None,
        "fallbackAgeHours": updated_age_hours if is_fallback else None,
        "errorMessage": source.error_message,
    }


def _freshness_status(
    statuses: list[DataSourceStatus],
    now: datetime,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    sources = [_source_status_payload(source, now) for source in statuses]
    external_sources = {
        source["sourceName"]: source
        for source in sources
        if source["isExternal"]
    }
    missing_external_sources = sorted(
        EXTERNAL_SOURCE_NAMES - external_sources.keys()
    )
    stale_external_sources = sorted(
        name for name, source in external_sources.items() if source["stale"]
    )
    external_last_checked = [
        _ensure_utc(source.last_checked_at)
        for source in statuses
        if source.source_name in EXTERNAL_SOURCE_NAMES and source.last_checked_at
    ]
    external_last_updated = [
        _ensure_utc(source.last_updated_at)
        for source in statuses
        if source.source_name in EXTERNAL_SOURCE_NAMES and source.last_updated_at
    ]
    external_last_success = [
        _ensure_utc(source.last_success_at)
        for source in statuses
        if source.source_name in EXTERNAL_SOURCE_NAMES and source.last_success_at
    ]
    success_ages = [
        float(source["successAgeHours"])
        for source in external_sources.values()
        if source["successAgeHours"] is not None
    ]
    failed_sources = sorted(
        source.source_name
        for source in statuses
        if source.status in {"failed", "degraded"}
    )
    is_stale = bool(missing_external_sources or stale_external_sources)
    return sources, {
        "lastCheckedAt": (
            max(external_last_checked).isoformat()
            if external_last_checked
            else None
        ),
        "lastUpdatedAt": (
            max(external_last_updated).isoformat()
            if external_last_updated
            else None
        ),
        "lastSuccessAt": (
            max(external_last_success).isoformat()
            if external_last_success
            else None
        ),
        "stale": is_stale,
        "dataState": "degraded" if failed_sources or is_stale else "ok",
        "failedSources": failed_sources,
        "freshnessThresholdHours": FRESHNESS_THRESHOLD_HOURS,
        "externalSourceCount": len(external_sources),
        "missingExternalSources": missing_external_sources,
        "staleExternalSources": stale_external_sources,
        "oldestSuccessAgeHours": max(success_ages, default=None),
    }


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
            "lastSuccessAt": None,
            "stale": True,
            "dataState": "empty",
            "freshnessThresholdHours": FRESHNESS_THRESHOLD_HOURS,
            "externalSourceCount": 0,
            "missingExternalSources": sorted(EXTERNAL_SOURCE_NAMES),
            "staleExternalSources": [],
            "oldestSuccessAgeHours": None,
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
    now = datetime.now(timezone.utc)
    source_payloads, freshness = _freshness_status(statuses, now)

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
            source["sourceName"]: source for source in source_payloads
        },
        "status": freshness,
        "analysisVersion": latest.analysis_version,
        "comparison": {
            "currentGeneratedAt": _ensure_utc(latest.generated_at).isoformat()
            if latest.generated_at
            else None,
            "previousGeneratedAt": _ensure_utc(previous.generated_at).isoformat()
            if previous and previous.generated_at
            else None,
            "previousAnalysisVersion": previous.analysis_version if previous else None,
            "previousPopulationBaseMonth": previous.population_base_month if previous else None,
        },
    }


@router.get("/api/dashboard/data-status")
def get_data_status(db: Session = Depends(get_db)) -> dict:
    ensure_seeded(db)
    statuses = db.query(DataSourceStatus).all()
    now = datetime.now(timezone.utc)
    source_payloads, freshness = _freshness_status(statuses, now)
    latest_snapshot = db.query(DashboardSnapshot).order_by(DashboardSnapshot.generated_at.desc()).first()
    latest_snapshot_at = _ensure_utc(latest_snapshot.generated_at) if latest_snapshot else None
    source_updated_at = max(
        (
            _ensure_utc(status.last_updated_at)
            for status in statuses
            if status.source_name in EXTERNAL_SOURCE_NAMES
            and status.last_updated_at
        ),
        default=None,
    )
    analysis_pending = latest_snapshot_at is None or (
        source_updated_at is not None and source_updated_at > latest_snapshot_at
    )
    analysis_metadata = {}
    if ACTUAL_ROAD_MATRIX_PATH.exists():
        try:
            analysis_metadata = json.loads(
                ACTUAL_ROAD_MATRIX_PATH.read_text(encoding="utf-8")
            ).get("metadata", {})
        except (json.JSONDecodeError, OSError):
            analysis_metadata = {}
    return {
        "sources": source_payloads,
        "latestSnapshotAt": latest_snapshot_at.isoformat() if latest_snapshot_at else None,
        "status": freshness,
        "analysis": {
            "version": analysis_metadata.get("version"),
            "resourceCount": analysis_metadata.get("resource_count"),
            "resourceCountByMode": analysis_metadata.get("resource_count_by_mode", {}),
            "requestedRouteCount": analysis_metadata.get("requested_route_count"),
            "successfulRouteCount": analysis_metadata.get("successful_route_count"),
            "missingRouteCount": analysis_metadata.get("missing_route_count"),
            "pending": analysis_pending,
        },
        "scopeContracts": {
            "pediatricFacilities": {
                "policyStaticCount": analysis_metadata.get(
                    "resource_count_by_mode",
                    {},
                ).get("pediatric"),
                "dynamicSourceName": "moonlight_pediatric",
                "dynamicRecordCount": next(
                    (
                        source.record_count
                        for source in statuses
                        if source.source_name == "moonlight_pediatric"
                    ),
                    None,
                ),
                "comparable": False,
                "reason": (
                    "정책분석 정적 기준 기관과 동적 운영 원천은 "
                    "기관 정의·운영시간·중복 제거·갱신 시점이 다릅니다."
                ),
            }
        },
    }


@router.post("/api/dashboard/refresh")
async def force_refresh_dashboard(
    db: Session = Depends(get_db),
    x_admin_token: str | None = Header(default=None, alias="X-Admin-Token"),
):
    expected = data_refresh_admin_token()
    if expected is None:
        raise HTTPException(status_code=503, detail="Dashboard refresh is disabled")
    if x_admin_token is None or not secrets.compare_digest(x_admin_token, expected):
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
    if result.error == "analysis_failed":
        raise HTTPException(
            status_code=502,
            detail={
                "message": "Data refresh completed, but analysis validation failed",
                "snapshotCreated": False,
            },
        )
    return {
        "message": "Data pipeline executed",
        "adminChanged": result.admin_changed,
        "hospitalsChanged": result.hospitals_changed,
        "populationChanged": result.population_changed,
        "analysisRerun": result.analysis_rerun,
        "analysisPending": result.analysis_pending,
        "snapshotCreated": result.snapshot_created,
        "baseMonth": result.base_month,
    }
