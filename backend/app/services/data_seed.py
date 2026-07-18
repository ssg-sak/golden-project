# -*- coding: utf-8 -*-
"""정적 정본 파일에서 DB 초기 시드."""

from __future__ import annotations

import hashlib
import json
import logging
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
from sqlalchemy.orm import Session

from app.db.models import AdminDong, DashboardSnapshot, DataSourceStatus, MedicalFacility, PopulationSnapshot
from app.services.analysis_metrics import compute_high_risk_metrics
from app.services.hospital_category import seed_facilities_from_static

logger = logging.getLogger(__name__)

PROJECT_DIR = Path(__file__).resolve().parents[3]
GEOJSON_PATH = PROJECT_DIR / "data" / "processed" / "daegu_vulnerability.geojson"
POPULATION_CSV = PROJECT_DIR / "data" / "raw" / "population" / "daegu_population_real.csv"
KOSIS_CSV = PROJECT_DIR / "data" / "raw" / "population" / "kosis_dong_5yr_population_202606.csv"
HOSPITALS_JSON = PROJECT_DIR / "data" / "processed" / "final_hospitals.json"
STABLE_CANDIDATES_JSON = PROJECT_DIR / "frontend" / "public" / "data" / "stable_policy_candidates.json"
POLICY_RELEASE_JSON = PROJECT_DIR / "data" / "processed" / "policy_release.json"
DEPRECATED_STATIC_SOURCES = {
    "static_optimal_locations_pediatric",
    "static_optimal_locations_senior",
}


def _seed_admin_dongs_from_geojson(db: Session) -> int:
    if not GEOJSON_PATH.exists():
        return 0

    geo = json.loads(GEOJSON_PATH.read_text(encoding="utf-8"))
    count = 0
    for feature in geo.get("features", []):
        props = feature.get("properties", {})
        adm_nm = props.get("adm_nm") or ""
        dong_name = props.get("동이름") or adm_nm.replace("대구광역시 ", "").strip()
        code = props.get("adm_cd") or props.get("admin_dong_code") or f"seed:{dong_name}"
        if db.query(AdminDong).filter_by(admin_dong_code=code).first():
            continue
        db.add(
            AdminDong(
                admin_dong_code=str(code),
                sido_name="대구광역시",
                sigungu_name=dong_name.split(" ")[0] if " " in dong_name else None,
                admin_dong_name=dong_name,
                full_address=adm_nm,
                is_active=True,
                collected_at=datetime.now(timezone.utc),
            )
        )
        count += 1
    db.commit()
    return count


def _seed_medical_facilities(db: Session) -> int:
    facilities = seed_facilities_from_static()
    for row in facilities:
        record = db.query(MedicalFacility).filter_by(facility_id=row["facility_id"]).first()
        if record is None:
            record = MedicalFacility(facility_id=row["facility_id"])
            db.add(record)
        for key, value in row.items():
            if key != "facility_id" and hasattr(record, key):
                setattr(record, key, value)
        record.is_active = True
    db.commit()
    return len(facilities)


def _seed_population(db: Session, base_month: str = "2026.06") -> int:
    if db.query(PopulationSnapshot).count() > 0:
        return 0

    if not POPULATION_CSV.exists():
        logger.warning("Population CSV missing: %s", POPULATION_CSV)
        return 0

    pop_df = pd.read_csv(POPULATION_CSV, encoding="utf-8-sig")
    count = 0
    for _, row in pop_df.iterrows():
        dong_name = str(row["동이름"])
        pop_65 = int(row.get("65세이상_인구", 0))
        pop_09 = int(row.get("0~9세_인구", 0))
        total = pop_65 + pop_09
        code = f"seed:{dong_name.replace(' ', '_')}"
        db.add(
            PopulationSnapshot(
                base_month=base_month,
                admin_dong_code=code,
                admin_dong_name=dong_name,
                total_population=total,
                male_population=0,
                female_population=0,
                household_count=0,
            )
        )
        count += 1
    db.commit()
    return count


def _seed_dashboard_snapshot(db: Session, base_month: str = "2026.06") -> bool:
    if not GEOJSON_PATH.exists():
        return False

    geo = json.loads(GEOJSON_PATH.read_text(encoding="utf-8"))
    indices = [float(f["properties"].get("vulnerability_index", 0)) for f in geo.get("features", [])]
    threshold, high_risk = compute_high_risk_metrics(indices)

    facilities = seed_facilities_from_static()
    large = sum(1 for f in facilities if f["dashboard_category"] == "large")
    secondary = sum(1 for f in facilities if f["dashboard_category"] == "secondary")
    moonlight = sum(1 for f in facilities if f["dashboard_category"] == "moonlightPediatric")
    release_metadata = _policy_release_metadata()
    analysis_base_month = str(release_metadata.get("population_base_month") or base_month)
    analysis_version = str(release_metadata.get("version") or "unversioned")

    latest = db.query(DashboardSnapshot).order_by(DashboardSnapshot.generated_at.desc()).first()
    if latest and (
        latest.admin_dong_count == len(indices)
        and latest.emergency_total == len(facilities)
        and latest.large_emergency_count == large
        and latest.secondary_emergency_count == secondary
        and latest.moonlight_pediatric_count == moonlight
        and latest.high_risk_admin_dong_count == high_risk
        and abs(float(latest.risk_threshold) - threshold) < 1e-6
        and latest.population_base_month == analysis_base_month
        and latest.analysis_version == analysis_version
    ):
        return False

    db.add(
        DashboardSnapshot(
            admin_dong_count=len(indices),
            emergency_total=len(facilities),
            large_emergency_count=large,
            secondary_emergency_count=secondary,
            moonlight_pediatric_count=moonlight,
            high_risk_admin_dong_count=high_risk,
            risk_threshold=threshold,
            population_base_month=analysis_base_month,
            analysis_version=analysis_version,
        )
    )
    db.commit()
    return True


def _file_hash(path: Path) -> str | None:
    if not path.exists():
        return None
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _policy_release_metadata() -> dict:
    if not POLICY_RELEASE_JSON.exists():
        return {}
    try:
        release = json.loads(POLICY_RELEASE_JSON.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError):
        return {}
    metadata = release.get("metadata", {}) if isinstance(release, dict) else {}
    return metadata if isinstance(metadata, dict) else {}


def _upsert_source_status(
    db: Session,
    *,
    source_name: str,
    source_version: str,
    path: Path,
    record_count: int,
) -> int:
    if not path.exists():
        return 0

    stat = path.stat()
    updated_at = datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc)
    now = datetime.now(timezone.utc)
    record = db.query(DataSourceStatus).filter_by(source_name=source_name).first()
    created = 0
    if record is None:
        record = DataSourceStatus(source_name=source_name)
        db.add(record)
        created = 1

    record.source_version = source_version
    record.data_hash = _file_hash(path)
    record.record_count = record_count
    record.last_checked_at = now
    record.last_updated_at = updated_at
    record.last_success_at = updated_at
    record.status = "static"
    record.error_message = None
    return created


def _count_json_records(path: Path) -> int:
    if not path.exists():
        return 0
    data = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(data, list):
        return len(data)
    if isinstance(data, dict) and isinstance(data.get("features"), list):
        return len(data["features"])
    return 1


def _seed_data_source_status(db: Session, base_month: str = "2026.06") -> int:
    """정적 정본 기반 실행에서도 데이터 출처 상태가 비어 있지 않게 한다."""
    db.query(DataSourceStatus).filter(
        DataSourceStatus.source_name.in_(DEPRECATED_STATIC_SOURCES)
    ).delete(synchronize_session=False)
    release_metadata = _policy_release_metadata()
    sources = [
        {
            "source_name": "static_hospitals",
            "source_version": "final_hospitals.json",
            "path": HOSPITALS_JSON,
            "record_count": _count_json_records(HOSPITALS_JSON),
        },
        {
            "source_name": "static_vulnerability_geojson",
            "source_version": "daegu_vulnerability.geojson",
            "path": GEOJSON_PATH,
            "record_count": _count_json_records(GEOJSON_PATH),
        },
        {
            "source_name": "static_population",
            "source_version": base_month,
            "path": POPULATION_CSV,
            "record_count": max(pd.read_csv(POPULATION_CSV, encoding="utf-8-sig").shape[0], 0)
            if POPULATION_CSV.exists()
            else 0,
        },
        {
            "source_name": "static_policy_candidates",
            "source_version": "stable_policy_candidates.json",
            "path": STABLE_CANDIDATES_JSON,
            "record_count": _count_json_records(STABLE_CANDIDATES_JSON),
        },
        {
            "source_name": "static_policy_release",
            "source_version": str(release_metadata.get("version") or "unversioned"),
            "path": POLICY_RELEASE_JSON,
            "record_count": 1,
        },
    ]
    created = 0
    for source in sources:
        created += _upsert_source_status(db, **source)
    db.commit()
    return created


def ensure_seeded(db: Session) -> dict[str, int]:
    """DB가 비어 있거나 정적 정본과 불일치할 때 정본으로 동기화."""
    before = db.query(MedicalFacility).count()
    result = {
        "admin_dong": _seed_admin_dongs_from_geojson(db),
        "medical_facility": _seed_medical_facilities(db),
        "population": _seed_population(db),
        "dashboard_snapshot": 1 if _seed_dashboard_snapshot(db) else 0,
        "data_source_status": _seed_data_source_status(db),
    }
    if before == 0 and any(result.values()):
        logger.info("Static seed applied: %s", result)
    return result
