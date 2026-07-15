# -*- coding: utf-8 -*-
import json
import logging
import subprocess
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
from sqlalchemy.orm import Session

from app.db.models import (
    AdminDong,
    DashboardSnapshot,
    DataSourceStatus,
    MedicalFacility,
    PopulationSnapshot,
)
from app.services.analysis_metrics import compute_high_risk_metrics
from app.services.data_seed import ensure_seeded
from app.services.fetchers import (
    HospitalsAPIClient,
    PopulationAPIClient,
    SGISClient,
    refresh_admin_dongs,
    refresh_all_medical_facilities,
    refresh_population,
)
from app.services.hospital_category import tier_from_dashboard_category
from app.services.job_lock import release_job_lock, try_acquire_job_lock

logger = logging.getLogger(__name__)

PROJECT_DIR = Path(__file__).resolve().parents[3]
RAW_POP_CSV = PROJECT_DIR / "data" / "raw" / "population" / "daegu_population_real.csv"
HOSPITALS_JSON = PROJECT_DIR / "data" / "processed" / "final_hospitals.json"
SPATIAL_ANALYSIS_SCRIPT = PROJECT_DIR / "backend" / "scripts" / "spatial_analysis.py"
GEOJSON_PATH = PROJECT_DIR / "data" / "processed" / "daegu_vulnerability.geojson"
ANALYSIS_VERSION = "1.0"
LOCK_NAME = "data_pipeline"


@dataclass
class PipelineResult:
    admin_changed: bool = False
    hospitals_changed: bool = False
    population_changed: bool = False
    analysis_rerun: bool = False
    snapshot_created: bool = False
    base_month: str | None = None
    error: str | None = None
    failed_sources: list[str] | None = None


async def run_data_pipeline(db: Session, targets: set[str] | None = None) -> PipelineResult:
    ensure_seeded(db)
    owner = try_acquire_job_lock(db, LOCK_NAME)
    if owner is None:
        logger.warning("Pipeline already running — skipped")
        return PipelineResult(error="already_running")

    result = PipelineResult()
    selected = targets or {"admin-boundary", "emergency", "moonlight", "population"}

    try:
        sgis_client = SGISClient()
        hospitals_client = HospitalsAPIClient()
        pop_client = PopulationAPIClient()

        if "admin-boundary" in selected:
            try:
                result.admin_changed, _ = await refresh_admin_dongs(db, sgis_client)
            except Exception as exc:
                logger.error("SGIS pipeline failed: %s", exc)

        if "emergency" in selected or "moonlight" in selected:
            try:
                if selected == {"moonlight"}:
                    from app.services.fetchers.hospitals_api import refresh_moonlight_facilities

                    result.hospitals_changed, _ = await refresh_moonlight_facilities(db, hospitals_client)
                elif selected == {"emergency"}:
                    from app.services.fetchers.hospitals_api import refresh_emergency_facilities

                    result.hospitals_changed, _ = await refresh_emergency_facilities(db, hospitals_client)
                else:
                    result.hospitals_changed, _ = await refresh_all_medical_facilities(db, hospitals_client)
            except Exception as exc:
                logger.error("Hospitals pipeline failed: %s", exc)

        if "population" in selected:
            try:
                changed, base_month = await refresh_population(db, pop_client)
                result.population_changed = changed
                result.base_month = base_month
            except Exception as exc:
                logger.error("Population pipeline failed: %s", exc)

        if not result.base_month:
            latest_pop = (
                db.query(PopulationSnapshot)
                .order_by(PopulationSnapshot.base_month.desc())
                .first()
            )
            result.base_month = latest_pop.base_month if latest_pop else "2026.06"

        should_analyze = (
            result.admin_changed
            or result.hospitals_changed
            or result.population_changed
            or "rebuild-analysis" in selected
            or "all" in selected
        )

        if should_analyze:
            result.analysis_rerun = True
            snapshot_ok = _run_adapter_and_analysis(db, result.base_month)
            result.snapshot_created = snapshot_ok
        elif "rebuild-dashboard-summary" in selected:
            result.snapshot_created = _generate_dashboard_snapshot(db, result.base_month)

        source_by_target = {
            "admin-boundary": {"sgis_admin_dong"},
            "emergency": {"emergency_facilities"},
            "moonlight": {"moonlight_pediatric"},
            "population": {"population"},
        }
        expected_sources = set().union(
            *(source_by_target.get(target, set()) for target in selected)
        )
        failed_statuses = (
            db.query(DataSourceStatus)
            .filter(
                DataSourceStatus.source_name.in_(expected_sources),
                DataSourceStatus.status.in_({"failed", "degraded"}),
            )
            .all()
            if expected_sources
            else []
        )
        result.failed_sources = sorted(status.source_name for status in failed_statuses)
        if result.failed_sources:
            result.error = "partial_failure"

        return result
    finally:
        release_job_lock(db, LOCK_NAME, owner)


def _run_adapter_and_analysis(db: Session, base_month: str | None) -> bool:
    if not _export_hospitals(db):
        logger.error("No active hospitals to export")
        return False
    _export_population_csv(db, base_month)

    logger.info("Executing spatial_analysis.py...")
    proc = subprocess.run(
        ["python", str(SPATIAL_ANALYSIS_SCRIPT)],
        cwd=str(PROJECT_DIR),
        capture_output=True,
        text=True,
    )
    if proc.returncode != 0:
        logger.error("spatial_analysis.py failed:\n%s", proc.stderr)
        return False

    return _generate_dashboard_snapshot(db, base_month)


def _export_hospitals(db: Session) -> bool:
    hospitals = db.query(MedicalFacility).filter_by(is_active=True).all()
    if not hospitals:
        return False

    hosp_list = []
    for hospital in hospitals:
        tier = tier_from_dashboard_category(hospital.dashboard_category or "secondary")
        hosp_list.append(
            {
                "name": hospital.facility_name,
                "lat": hospital.latitude or 0.0,
                "lng": hospital.longitude or 0.0,
                "tier": tier,
                "address": hospital.address,
                "tel": hospital.phone,
            }
        )

    HOSPITALS_JSON.parent.mkdir(parents=True, exist_ok=True)
    HOSPITALS_JSON.write_text(json.dumps(hosp_list, ensure_ascii=False, indent=2), encoding="utf-8")
    return True


def _export_population_csv(db: Session, base_month: str | None) -> None:
    if not base_month:
        return

    pop_records = db.query(PopulationSnapshot).filter_by(base_month=base_month).all()
    if not pop_records:
        return

    old_pop = pd.read_csv(RAW_POP_CSV, encoding="utf-8-sig") if RAW_POP_CSV.exists() else pd.DataFrame()
    ratio_by_name: dict[str, tuple[float, float]] = {}
    if not old_pop.empty:
        for _, row in old_pop.iterrows():
            dong = str(row["동이름"])
            pop_65 = float(row.get("65세이상_인구", 0))
            pop_09 = float(row.get("0~9세_인구", 0))
            total = pop_65 + pop_09
            if total > 0:
                ratio_by_name[dong] = (pop_65 / total, pop_09 / total)

    rows = []
    for record in pop_records:
        ratio_65, ratio_09 = ratio_by_name.get(record.admin_dong_name, (0.15, 0.05))
        total = max(record.total_population, 1)
        rows.append(
            {
                "동이름": record.admin_dong_name,
                "65세이상_인구": int(total * ratio_65),
                "0~9세_인구": int(total * ratio_09),
            }
        )

    RAW_POP_CSV.parent.mkdir(parents=True, exist_ok=True)
    pd.DataFrame(rows).to_csv(RAW_POP_CSV, index=False, encoding="utf-8-sig")


def _generate_dashboard_snapshot(db: Session, base_month: str | None) -> bool:
    if not GEOJSON_PATH.exists():
        return False

    geo = json.loads(GEOJSON_PATH.read_text(encoding="utf-8"))
    indices = [float(f["properties"].get("vulnerability_index", 0)) for f in geo.get("features", [])]
    threshold, high_risk = compute_high_risk_metrics(indices)

    hospitals = db.query(MedicalFacility).filter_by(is_active=True).all()
    large = sum(1 for h in hospitals if h.dashboard_category == "large")
    secondary = sum(1 for h in hospitals if h.dashboard_category == "secondary")
    moonlight = sum(1 for h in hospitals if h.dashboard_category == "moonlightPediatric")

    statuses = db.query(DataSourceStatus).all()
    source_versions = {
        status.source_name: {
            "version": status.source_version,
            "hash": status.data_hash,
            "status": status.status,
        }
        for status in statuses
    }

    logger.info(
        "Analysis validation: min=%.1f max=%.1f high_risk=%d threshold=%.2f missing=%d",
        min(indices) if indices else 0,
        max(indices) if indices else 0,
        high_risk,
        threshold,
        sum(1 for value in indices if value <= 0),
    )

    previous = db.query(DashboardSnapshot).order_by(DashboardSnapshot.generated_at.desc()).first()
    if previous:
        changed_districts = abs(previous.high_risk_admin_dong_count - high_risk)
        logger.info("High-risk district delta vs previous snapshot: %d", changed_districts)

    snap = DashboardSnapshot(
        admin_dong_count=len(indices),
        emergency_total=len(hospitals),
        large_emergency_count=large,
        secondary_emergency_count=secondary,
        moonlight_pediatric_count=moonlight,
        high_risk_admin_dong_count=high_risk,
        risk_threshold=threshold,
        population_base_month=base_month or "2026.06",
        source_versions=json.dumps(source_versions, ensure_ascii=False),
        analysis_version=ANALYSIS_VERSION,
        generated_at=datetime.now(timezone.utc),
    )
    db.add(snap)
    db.commit()
    return True
