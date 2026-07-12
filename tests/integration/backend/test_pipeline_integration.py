# -*- coding: utf-8 -*-
import asyncio
from pathlib import Path

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.database import Base
from app.services.data_seed import ensure_seeded
from app.services.pipeline import run_data_pipeline


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

    from app.db.models import DashboardSnapshot

    snap = db_session.query(DashboardSnapshot).one()
    assert snap.admin_dong_count == 150
    assert snap.emergency_total == 25
    assert snap.large_emergency_count == 6
    assert snap.secondary_emergency_count == 13
    assert snap.moonlight_pediatric_count == 6
    assert snap.population_base_month == "2026.06"


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
