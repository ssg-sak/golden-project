# -*- coding: utf-8 -*-
import asyncio
import json
from datetime import datetime

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.api.routes.dashboard import force_refresh_dashboard, get_dashboard_summary, get_data_status
from app.db.database import Base
from app.db.models import DashboardSnapshot, DataSourceStatus
from app.services.analysis_metrics import compute_high_risk_metrics, format_change_text
from app.services.fetchers.base import generate_hash, normalize_records_for_hash
from app.services.hospital_category import apply_hospital_mapping, seed_facilities_from_static


@pytest.fixture()
def db_session(tmp_path):
    db_file = tmp_path / "dashboard-test.db"
    engine = create_engine(f"sqlite:///{db_file}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


def test_hash_is_stable_for_same_payload():
    payload = [{"a": 1, "b": "x"}]
    assert generate_hash(payload) == generate_hash(payload)


def test_hash_ignores_record_order():
    a = [{"id": "1", "name": "A"}, {"id": "2", "name": "B"}]
    b = [{"id": "2", "name": "B"}, {"id": "1", "name": "A"}]
    assert generate_hash(normalize_records_for_hash(a)) == generate_hash(normalize_records_for_hash(b))


def test_hash_changes_when_field_changes():
    first = [{"id": "1", "name": "A"}]
    second = [{"id": "1", "name": "B"}]
    assert generate_hash(first) != generate_hash(second)


def test_change_text_variants():
    assert format_change_text(0) == "변화 없음"
    assert format_change_text(2) == "2 증가"
    assert format_change_text(-3) == "3 감소"


def test_high_risk_top_quarter_rule():
    indices = [100.0, 90.0, 80.0, 70.0]
    threshold, high_risk = compute_high_risk_metrics(indices)
    assert threshold == 90.0
    assert high_risk == 2


def test_static_hospital_seed_regression_counts():
    facilities = seed_facilities_from_static()
    assert len(facilities) == 25
    assert sum(1 for f in facilities if f["dashboard_category"] == "large") == 6
    assert sum(1 for f in facilities if f["dashboard_category"] == "secondary") == 13
    assert sum(1 for f in facilities if f["dashboard_category"] == "moonlightPediatric") == 6


def test_hospital_mapping_deduplicates_by_id():
    rows = [
        {
            "facility_id": "A2800003",
            "facility_name": "경북대학교병원",
            "official_type_name": "지역응급의료센터",
            "address": "대구",
            "sido_name": "대구광역시",
            "latitude": 35.8,
            "longitude": 128.6,
            "is_moonlight": False,
        },
        {
            "facility_id": "A2800003",
            "facility_name": "경북대학교병원",
            "official_type_name": "권역응급의료센터",
            "address": "대구",
            "sido_name": "대구광역시",
            "latitude": 35.8,
            "longitude": 128.6,
            "is_moonlight": False,
        },
    ]
    mapped = apply_hospital_mapping(rows)
    assert len(mapped) == 1
    assert mapped[0]["dashboard_category"] == "large"


def test_dashboard_summary_normalizes_naive_datetimes(db_session):
    db_session.add(
        DashboardSnapshot(
            admin_dong_count=150,
            emergency_total=25,
            large_emergency_count=6,
            secondary_emergency_count=13,
            moonlight_pediatric_count=6,
            high_risk_admin_dong_count=12,
            risk_threshold=10000.0,
            population_base_month="2026.06",
            analysis_version="test",
        )
    )
    db_session.add(
        DataSourceStatus(
            source_name="static_population",
            status="static",
            record_count=150,
            last_checked_at=datetime(2026, 7, 14, 3, 0, 0),
            last_updated_at=datetime(2026, 7, 14, 3, 0, 0),
        )
    )
    db_session.commit()

    summary = get_dashboard_summary(db_session)

    assert summary["status"]["lastCheckedAt"].endswith("+00:00")
    assert summary["status"]["lastUpdatedAt"].endswith("+00:00")
    assert isinstance(summary["status"]["stale"], bool)

    data_status = get_data_status(db_session)
    assert data_status["latestSnapshotAt"].endswith("+00:00")


def test_data_status_exposes_analysis_version_and_pending_state(
    db_session,
    monkeypatch,
    tmp_path,
):
    monkeypatch.setattr("app.api.routes.dashboard.ensure_seeded", lambda _db: {})
    matrix_path = tmp_path / "actual_road_accessibility_matrix.json"
    matrix_path.write_text(
        json.dumps(
            {
                "metadata": {
                    "version": "test-r2",
                    "resource_count": 25,
                    "resource_count_by_mode": {"pediatric": 6, "senior": 19},
                    "requested_route_count": 5100,
                    "successful_route_count": 5100,
                    "missing_route_count": 0,
                }
            }
        ),
        encoding="utf-8",
    )
    monkeypatch.setattr(
        "app.api.routes.dashboard.ACTUAL_ROAD_MATRIX_PATH",
        matrix_path,
    )
    db_session.add(
        DashboardSnapshot(
            admin_dong_count=150,
            emergency_total=25,
            large_emergency_count=6,
            secondary_emergency_count=13,
            moonlight_pediatric_count=6,
            high_risk_admin_dong_count=38,
            risk_threshold=13261.43,
            population_base_month="2026.06",
            analysis_version="test-r2",
            generated_at=datetime(2026, 7, 18, 10, 0, 0),
        )
    )
    db_session.add(
        DataSourceStatus(
            source_name="population",
            status="updated",
            record_count=150,
            last_checked_at=datetime(2026, 7, 18, 11, 0, 0),
            last_updated_at=datetime(2026, 7, 18, 11, 0, 0),
        )
    )
    db_session.commit()

    result = get_data_status(db_session)

    assert result["analysis"] == {
        "version": "test-r2",
        "resourceCount": 25,
        "resourceCountByMode": {"pediatric": 6, "senior": 19},
        "requestedRouteCount": 5100,
        "successfulRouteCount": 5100,
        "missingRouteCount": 0,
        "pending": True,
    }
    assert result["status"]["lastCheckedAt"].endswith("+00:00")
    assert result["status"]["lastUpdatedAt"].endswith("+00:00")


def test_dashboard_refresh_is_disabled_without_server_token(db_session, monkeypatch):
    monkeypatch.setattr("app.api.routes.dashboard.data_refresh_admin_token", lambda: None)

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(force_refresh_dashboard(db=db_session, x_admin_token=None))

    assert exc_info.value.status_code == 503


def test_dashboard_refresh_rejects_invalid_token(db_session, monkeypatch):
    monkeypatch.setattr("app.api.routes.dashboard.data_refresh_admin_token", lambda: "expected")

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(force_refresh_dashboard(db=db_session, x_admin_token="wrong"))

    assert exc_info.value.status_code == 401
