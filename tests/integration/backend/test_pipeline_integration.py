# -*- coding: utf-8 -*-
import asyncio
from pathlib import Path

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.database import Base
from app.services.data_seed import ensure_seeded
from app.db.models import PopulationSnapshot
from app.services.pipeline import _export_population_csv, run_data_pipeline


@pytest.fixture()
def db_session(tmp_path):
    db_file = tmp_path / "test.db"
    engine = create_engine(f"sqlite:///{db_file}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


def test_seed_creates_dashboard_snapshot(db_session, monkeypatch):
    project_dir = Path(__file__).resolve().parents[3]
    monkeypatch.setattr("app.services.data_seed.PROJECT_DIR", project_dir)
    monkeypatch.setattr("app.services.pipeline.PROJECT_DIR", project_dir)

    result = ensure_seeded(db_session)
    assert result["dashboard_snapshot"] == 1

    from app.db.models import DashboardSnapshot, DataSourceStatus

    snap = db_session.query(DashboardSnapshot).one()
    assert snap.admin_dong_count == 150
    assert snap.emergency_total == 25
    assert snap.large_emergency_count == 6
    assert snap.secondary_emergency_count == 13
    assert snap.moonlight_pediatric_count == 6
    assert snap.population_base_month == "2026.06"

    sources = {
        row.source_name: row
        for row in db_session.query(DataSourceStatus).order_by(DataSourceStatus.source_name).all()
    }
    assert "static_hospitals" in sources
    assert sources["static_hospitals"].record_count == 25
    assert "static_vulnerability_geojson" in sources
    assert sources["static_vulnerability_geojson"].record_count == 150
    assert "static_population" in sources
    assert sources["static_population"].source_version == "2026.06"
    assert "static_optimal_locations_pediatric" in sources
    assert "static_optimal_locations_senior" in sources
    assert all(row.status == "static" for row in sources.values())


def test_pipeline_idempotent_without_api(db_session, monkeypatch):
    project_dir = Path(__file__).resolve().parents[3]
    monkeypatch.setattr("app.services.data_seed.PROJECT_DIR", project_dir)
    monkeypatch.setattr("app.services.pipeline.PROJECT_DIR", project_dir)

    ensure_seeded(db_session)
    first = asyncio.run(run_data_pipeline(db_session, targets={"rebuild-dashboard-summary"}))
    second = asyncio.run(run_data_pipeline(db_session, targets={"rebuild-dashboard-summary"}))

    assert first.snapshot_created is True
    assert second.snapshot_created is True

    from app.db.models import DashboardSnapshot

    assert db_session.query(DashboardSnapshot).count() >= 2


def test_population_export_rejects_incomplete_month(db_session, monkeypatch, tmp_path):
    project_dir = Path(__file__).resolve().parents[3]
    monkeypatch.setattr("app.services.data_seed.PROJECT_DIR", project_dir)
    monkeypatch.setattr("app.services.pipeline.RAW_POP_CSV", tmp_path / "population.csv")

    ensure_seeded(db_session)
    first_record = db_session.query(PopulationSnapshot).filter_by(base_month="2026.06").first()
    assert first_record is not None
    db_session.delete(first_record)
    db_session.commit()

    assert _export_population_csv(db_session, "2026.06") is False
    assert not (tmp_path / "population.csv").exists()
