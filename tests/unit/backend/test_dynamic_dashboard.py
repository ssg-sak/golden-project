# -*- coding: utf-8 -*-
import asyncio
import json
from datetime import datetime, timedelta, timezone

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
            source_name="population",
            source_version="2026.06",
            status="unchanged",
            record_count=150,
            last_checked_at=datetime(2026, 7, 14, 3, 0, 0),
            last_updated_at=datetime(2026, 7, 14, 3, 0, 0),
            last_success_at=datetime(2026, 7, 14, 3, 0, 0),
        )
    )
    db_session.commit()

    summary = get_dashboard_summary(db_session)

    assert summary["status"]["lastCheckedAt"].endswith("+00:00")
    assert summary["status"]["lastUpdatedAt"].endswith("+00:00")
    assert summary["status"]["lastSuccessAt"].endswith("+00:00")
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
            source_version="2026.06",
            status="updated",
            record_count=150,
            last_checked_at=datetime(2026, 7, 18, 11, 0, 0),
            last_updated_at=datetime(2026, 7, 18, 11, 0, 0),
            last_success_at=datetime(2026, 7, 18, 11, 0, 0),
        )
    )
    db_session.add(
        DataSourceStatus(
            source_name="moonlight_pediatric",
            source_version="2026-07-18",
            status="unchanged",
            record_count=1,
            last_checked_at=datetime(2026, 7, 18, 11, 0, 0),
            last_updated_at=datetime(2026, 7, 18, 11, 0, 0),
            last_success_at=datetime(2026, 7, 18, 11, 0, 0),
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
    assert result["scopeContracts"]["pediatricFacilities"] == {
        "policyStaticCount": 6,
        "dynamicSourceName": "moonlight_pediatric",
        "dynamicRecordCount": 1,
        "comparable": False,
        "reason": (
            "정책분석 정적 기준 기관과 동적 운영 원천은 "
            "기관 정의·운영시간·중복 제거·갱신 시점이 다릅니다."
        ),
    }


def test_data_status_explains_when_operational_population_is_ahead(
    db_session,
    monkeypatch,
    tmp_path,
):
    monkeypatch.setattr("app.api.routes.dashboard.ensure_seeded", lambda _db: {})
    release_path = tmp_path / "policy_release.json"
    release_path.write_text(
        json.dumps(
            {
                "metadata": {
                    "version": "2026-06-r1",
                    "population_base_month": "2026.06",
                    "released_at": "2026-07-01T18:00:00+09:00",
                }
            }
        ),
        encoding="utf-8",
    )
    monkeypatch.setattr("app.api.routes.dashboard.POLICY_RELEASE_PATH", release_path)
    db_session.add(
        DataSourceStatus(
            source_name="population",
            source_version="2026.07",
            status="updated",
            record_count=150,
        )
    )
    db_session.commit()

    result = get_data_status(db_session)

    assert result["release"] == {
        "state": "waiting_analysis_source",
        "statusLabel": "연령별 분석 자료 공개 대기",
        "version": "2026-06-r1",
        "populationBaseMonth": "2026.06",
        "operationalPopulationMonth": "2026.07",
        "releasedAt": "2026-07-01T18:00:00+09:00",
    }


def test_external_freshness_is_checked_per_source_and_exposes_fallback_age(
    db_session,
    monkeypatch,
):
    monkeypatch.setattr("app.api.routes.dashboard.ensure_seeded", lambda _db: {})
    monkeypatch.setattr(
        "app.api.routes.dashboard.latest_completed_population_yyyymm",
        lambda _now: "202606",
    )
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    fresh = now - timedelta(hours=1)
    old = now - timedelta(hours=48)
    for source_name in (
        "sgis_admin_dong",
        "emergency_facilities",
        "moonlight_pediatric",
    ):
        db_session.add(
            DataSourceStatus(
                source_name=source_name,
                source_version="2026-07-26",
                status="unchanged",
                record_count=1,
                last_checked_at=fresh,
                last_updated_at=fresh,
                last_success_at=fresh,
            )
        )
    db_session.add(
        DataSourceStatus(
            source_name="population",
            source_version="2026.06",
            status="degraded",
            record_count=150,
            last_checked_at=fresh,
            last_updated_at=old,
            last_success_at=old,
            error_message="HTTP 500; CSV fallback used",
        )
    )
    db_session.add(
        DataSourceStatus(
            source_name="static_population",
            source_version="2026.06",
            status="static",
            record_count=150,
            last_checked_at=now,
            last_updated_at=now,
            last_success_at=now,
        )
    )
    db_session.commit()

    result = get_data_status(db_session)
    population = next(
        source for source in result["sources"] if source["sourceName"] == "population"
    )

    assert result["status"]["stale"] is True
    assert result["status"]["missingExternalSources"] == []
    assert result["status"]["staleExternalSources"] == ["population"]
    assert result["status"]["oldestSuccessAgeHours"] >= 47.9
    assert population["sourceVersion"] == "2026.06"
    assert population["freshnessPolicy"] == "monthly_completed_period"
    assert population["expectedSourceVersion"] == "2026.06"
    assert population["periodCurrent"] is True
    assert population["isFallback"] is True
    assert population["fallbackVersion"] == "2026.06"
    assert population["fallbackAgeHours"] >= 47.9


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
