# -*- coding: utf-8 -*-
import json
import logging
import os
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
GEOJSON_PATH = PROJECT_DIR / "data" / "processed" / "daegu_vulnerability.geojson"
ACTUAL_ROAD_MATRIX_PATH = PROJECT_DIR / "data" / "processed" / "actual_road_accessibility_matrix.json"
INTEGRATED_POLICY_SCRIPT = PROJECT_DIR / "ai-model" / "run_integrated_policy_pipeline.py"
ANALYSIS_VERSION_FALLBACK = "unversioned"
LOCK_NAME = "data_pipeline"
EXPECTED_DAEGU_ADMIN_DONG_COUNT = 150
EXPECTED_ACTIVE_FACILITY_COUNT = 25


@dataclass
class PipelineResult:
    admin_changed: bool = False
    hospitals_changed: bool = False
    population_changed: bool = False
    analysis_rerun: bool = False
    analysis_pending: bool = False
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

        source_changed = result.admin_changed or result.hospitals_changed or result.population_changed
        should_analyze = "rebuild-analysis" in selected

        if should_analyze:
            result.analysis_rerun = True
            snapshot_ok = _run_adapter_and_analysis(db, result.base_month)
            result.snapshot_created = snapshot_ok
            if not snapshot_ok:
                result.error = result.error or "analysis_failed"
        elif source_changed:
            result.analysis_pending = True
        elif "rebuild-dashboard-summary" in selected:
            result.snapshot_created = _generate_dashboard_snapshot(db, result.base_month)
            if not result.snapshot_created:
                result.error = result.error or "analysis_failed"

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
    previous_hospitals = HOSPITALS_JSON.read_bytes() if HOSPITALS_JSON.exists() else None
    if not _export_hospitals(db):
        logger.error("Hospital export validation failed")
        return False
    if not _export_population_csv(db, base_month):
        logger.error("Population export validation failed")
        _restore_file(HOSPITALS_JSON, previous_hospitals)
        return False

    logger.info("Executing integrated policy analysis pipeline...")
    environment = {
        **os.environ,
        "PYTHONUTF8": "1",
        "PYTHONIOENCODING": "utf-8",
    }
    proc = subprocess.run(
        ["python", str(INTEGRATED_POLICY_SCRIPT)],
        cwd=str(PROJECT_DIR),
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        env=environment,
    )
    if proc.returncode != 0:
        logger.error("Integrated policy analysis failed:\n%s", proc.stderr)
        _restore_file(HOSPITALS_JSON, previous_hospitals)
        return False

    return _generate_dashboard_snapshot(db, base_month)


def _restore_file(path: Path, content: bytes | None) -> None:
    if content is None:
        path.unlink(missing_ok=True)
        return
    temporary_path = path.with_suffix(path.suffix + ".restore.tmp")
    temporary_path.write_bytes(content)
    temporary_path.replace(path)


def _export_hospitals(db: Session) -> bool:
    hospitals = db.query(MedicalFacility).filter_by(is_active=True).all()
    if not hospitals:
        return False
    if len(hospitals) != EXPECTED_ACTIVE_FACILITY_COUNT:
        logger.error(
            "Unexpected active medical facility count: %d (expected %d). "
            "Skipping hospital JSON export to avoid corrupting analysis inputs.",
            len(hospitals),
            EXPECTED_ACTIVE_FACILITY_COUNT,
        )
        return False

    hosp_list = []
    for hospital in hospitals:
        tier = tier_from_dashboard_category(hospital.dashboard_category or "secondary")
        exported_hospital = {
            "name": hospital.facility_name,
            "lat": hospital.latitude or 0.0,
            "lng": hospital.longitude or 0.0,
            "tier": tier,
            "address": hospital.address,
        }
        if hospital.phone:
            exported_hospital["tel"] = hospital.phone
        hosp_list.append(exported_hospital)

    HOSPITALS_JSON.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = HOSPITALS_JSON.with_suffix(HOSPITALS_JSON.suffix + ".tmp")
    temporary_path.write_text(
        json.dumps(hosp_list, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    temporary_path.replace(HOSPITALS_JSON)
    return True


def _export_population_csv(db: Session, base_month: str | None) -> bool:
    if not base_month:
        return False

    pop_records = db.query(PopulationSnapshot).filter_by(base_month=base_month).all()
    if not pop_records:
        return False

    unique_pop_records = {}
    for record in pop_records:
        key = record.admin_dong_code or record.admin_dong_name
        if key and key not in unique_pop_records:
            unique_pop_records[key] = record
    if len(unique_pop_records) != len(pop_records):
        logger.warning(
            "Deduplicated population snapshots before CSV export: %d -> %d",
            len(pop_records),
            len(unique_pop_records),
        )
    pop_records = list(unique_pop_records.values())
    if len(pop_records) != EXPECTED_DAEGU_ADMIN_DONG_COUNT:
        logger.error(
            "Unexpected population snapshot count: %d (expected %d). "
            "Skipping population CSV export to avoid corrupting analysis inputs.",
            len(pop_records),
            EXPECTED_DAEGU_ADMIN_DONG_COUNT,
        )
        return False

    if not RAW_POP_CSV.exists():
        logger.error("Verified age-specific population CSV is missing: %s", RAW_POP_CSV)
        return False

    population = pd.read_csv(RAW_POP_CSV, encoding="utf-8-sig")
    required_columns = {"동이름", "65세이상_인구", "0~9세_인구"}
    if not required_columns.issubset(population.columns):
        logger.error("Age-specific population CSV columns are invalid")
        return False
    if len(population) != EXPECTED_DAEGU_ADMIN_DONG_COUNT:
        logger.error(
            "Unexpected age-specific population row count: %d (expected %d)",
            len(population),
            EXPECTED_DAEGU_ADMIN_DONG_COUNT,
        )
        return False
    if population["동이름"].astype(str).nunique() != EXPECTED_DAEGU_ADMIN_DONG_COUNT:
        logger.error("Age-specific population CSV contains duplicate district names")
        return False
    age_values = population[["65세이상_인구", "0~9세_인구"]].apply(
        pd.to_numeric,
        errors="coerce",
    )
    if age_values.isna().any().any() or (age_values < 0).any().any():
        logger.error("Age-specific population CSV contains invalid values")
        return False

    # PopulationSnapshot stores total population only. It must never be split into
    # age groups by an estimated ratio and promoted into the policy analysis input.
    # A new analysis month is accepted only after an official age-specific CSV is
    # parsed and the release base month is updated together.
    current_analysis_month = _current_population_base_month()
    if base_month != current_analysis_month:
        logger.error(
            "Population month %s has no verified age-specific analysis input (current %s)",
            base_month,
            current_analysis_month,
        )
        return False
    return True


def _current_population_base_month() -> str:
    if not (PROJECT_DIR / "data" / "processed" / "policy_release.json").exists():
        return "2026.06"
    try:
        release = json.loads(
            (PROJECT_DIR / "data" / "processed" / "policy_release.json").read_text(
                encoding="utf-8"
            )
        )
        return str(release.get("metadata", {}).get("population_base_month") or "2026.06")
    except (json.JSONDecodeError, OSError):
        return "2026.06"


def _generate_dashboard_snapshot(db: Session, base_month: str | None) -> bool:
    if not GEOJSON_PATH.exists():
        return False

    geo = json.loads(GEOJSON_PATH.read_text(encoding="utf-8"))
    indices = [float(f["properties"].get("vulnerability_index", 0)) for f in geo.get("features", [])]
    if len(indices) != EXPECTED_DAEGU_ADMIN_DONG_COUNT:
        logger.error(
            "Unexpected vulnerability feature count: %d (expected %d)",
            len(indices),
            EXPECTED_DAEGU_ADMIN_DONG_COUNT,
        )
        return False
    threshold, high_risk = compute_high_risk_metrics(indices)

    hospitals = db.query(MedicalFacility).filter_by(is_active=True).all()
    if len(hospitals) != EXPECTED_ACTIVE_FACILITY_COUNT:
        logger.error(
            "Unexpected active medical facility count for dashboard snapshot: %d (expected %d)",
            len(hospitals),
            EXPECTED_ACTIVE_FACILITY_COUNT,
        )
        return False
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
        analysis_version=_current_analysis_version(),
        generated_at=datetime.now(timezone.utc),
    )
    db.add(snap)
    db.commit()
    return True


def _current_analysis_version() -> str:
    if not ACTUAL_ROAD_MATRIX_PATH.exists():
        return ANALYSIS_VERSION_FALLBACK
    try:
        metadata = json.loads(ACTUAL_ROAD_MATRIX_PATH.read_text(encoding="utf-8")).get("metadata", {})
    except (json.JSONDecodeError, OSError):
        return ANALYSIS_VERSION_FALLBACK
    return str(metadata.get("version") or ANALYSIS_VERSION_FALLBACK)
