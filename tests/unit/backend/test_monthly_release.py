from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone
from pathlib import Path

import httpx

from app.services.fetchers.age_population import (
    AgePopulationDataset,
    AgePopulationNotPublished,
    AgePopulationRecord,
    canonical_age_population_sha256,
)
from app.services import monthly_release as monthly_release_module


class FakeAgePopulationClient:
    def __init__(self, dataset: AgePopulationDataset | Exception) -> None:
        self.dataset = dataset
        self.requested_months: list[str] = []

    async def fetch_month(self, source_month: str) -> AgePopulationDataset:
        self.requested_months.append(source_month)
        if isinstance(self.dataset, Exception):
            raise self.dataset
        return self.dataset


def _release_fixture(
    *,
    version: str,
    month: str,
    population: int,
    vdi: float,
    candidate_ids: list[int] | None = None,
) -> dict:
    return {
        "metadata": {
            "version": version,
            "population_base_month": month,
            "risk_threshold": 10_000,
            "high_risk_district_count": 1,
        },
        "vulnerability": {
            "features": [
                {
                    "properties": {
                        "동이름": "달성군 논공읍",
                        "vulnerability_index": vdi,
                    }
                }
            ]
        },
        "candidates": [
            {"mode": "senior", "id": 1, "lat": 35.1, "lng": 128.1}
        ],
        "optimization": {
            "metadata": {"objective_populations": {"senior": population}},
            "results": {
                "senior": [
                    {
                        "facility_count": 1,
                        "p_median_optimum": {"candidate_ids": candidate_ids or [1]},
                        "mclp_15min_optimum": {"candidate_ids": [1]},
                        "mclp_30min_optimum": {"candidate_ids": [1]},
                    }
                ]
            },
        },
    }


def test_monthly_release_reports_no_change_when_latest_official_hash_matches(
    tmp_path,
    monkeypatch,
) -> None:
    monkeypatch.setattr(monthly_release_module, "RUNS_ROOT", tmp_path)
    dataset = AgePopulationDataset(
        source_month="202607",
        records=(AgePopulationRecord("2711051700", "중구 동인동", 100, 20, 10),),
        official_csv=b"official",
    )
    monkeypatch.setattr(
        monthly_release_module,
        "_current_release_metadata",
        lambda: {
            "population_base_month": "2026.07",
            "version": "2026-07-r1",
            "population_source_sha256": canonical_age_population_sha256(dataset.records),
        },
    )
    client = FakeAgePopulationClient(dataset)

    result = asyncio.run(
        monthly_release_module.run_monthly_release(
            mode="check",
            run_id="latest",
            now=datetime(2026, 8, 3, tzinfo=timezone.utc),
            client=client,
        )
    )

    assert result.state == "no_change"
    assert result.status_label == "공식 자료 변경 없음"
    assert client.requested_months == ["202607"]


def test_monthly_release_reports_waiting_source_without_changes(tmp_path, monkeypatch) -> None:
    monkeypatch.setattr(monthly_release_module, "RUNS_ROOT", tmp_path)
    monkeypatch.setattr(
        monthly_release_module,
        "_current_release_metadata",
        lambda: {"population_base_month": "2026.06", "version": "2026-07-18-r2"},
    )
    client = FakeAgePopulationClient(AgePopulationNotPublished())

    result = asyncio.run(
        monthly_release_module.run_monthly_release(
            mode="check",
            run_id="waiting",
            now=datetime(2026, 8, 3, tzinfo=timezone.utc),
            client=client,
        )
    )

    assert result.state == "waiting_source"
    assert result.previous_source_month == "202606"
    assert client.requested_months == ["202607"]


def test_monthly_release_records_official_source_connection_failure(
    tmp_path,
    monkeypatch,
) -> None:
    monkeypatch.setattr(monthly_release_module, "RUNS_ROOT", tmp_path)
    monkeypatch.setattr(
        monthly_release_module,
        "_current_release_metadata",
        lambda: {"population_base_month": "2026.06", "version": "2026-06-r1"},
    )
    error = httpx.ConnectError(
        "connection failed",
        request=httpx.Request("GET", "https://example.test"),
    )

    result = asyncio.run(
        monthly_release_module.run_monthly_release(
            mode="check",
            run_id="connection-error",
            now=datetime(2026, 8, 3, tzinfo=timezone.utc),
            client=FakeAgePopulationClient(error),
        )
    )

    assert result.state == "blocked"
    assert result.status_label == "공식 자료 확인 실패"
    assert (tmp_path / "connection-error" / "run_result.json").exists()


def test_monthly_release_check_accepts_new_official_month(tmp_path, monkeypatch) -> None:
    monkeypatch.setattr(monthly_release_module, "RUNS_ROOT", tmp_path)
    monkeypatch.setattr(
        monthly_release_module,
        "_current_release_metadata",
        lambda: {"population_base_month": "2026.06", "version": "2026-07-18-r2"},
    )
    dataset = AgePopulationDataset(
        source_month="202607",
        records=(AgePopulationRecord("2711051700", "중구 동인동", 100, 20, 10),),
        official_csv=b"official",
    )

    result = asyncio.run(
        monthly_release_module.run_monthly_release(
            mode="check",
            run_id="ready",
            now=datetime(2026, 8, 3, tzinfo=timezone.utc),
            client=FakeAgePopulationClient(dataset),
        )
    )

    assert result.state == "ready_to_publish"
    assert result.version == "2026-07-r1"
    assert result.status_label == "새 공식 자료 확인"


def test_change_summary_requires_review_for_same_month_correction() -> None:
    current = _release_fixture(
        version="2026-06-r1",
        month="2026.06",
        population=100_000,
        vdi=20_000,
    )
    candidate = _release_fixture(
        version="2026-06-r2",
        month="2026.06",
        population=101_000,
        vdi=28_000,
        candidate_ids=[2],
    )

    summary = monthly_release_module._build_change_summary(current, candidate)

    assert summary.review_required is True
    assert "같은 기준월" in summary.review_reasons[0]
    assert summary.maximum_vdi_change == 8_000
    assert summary.changed_district_count == 1
    assert summary.changed_optimal_combination_count == 1


def test_change_summary_allows_ordinary_new_month_change() -> None:
    current = _release_fixture(
        version="2026-06-r1",
        month="2026.06",
        population=100_000,
        vdi=20_000,
    )
    candidate = _release_fixture(
        version="2026-07-r1",
        month="2026.07",
        population=101_000,
        vdi=20_500,
    )

    summary = monthly_release_module._build_change_summary(current, candidate)

    assert summary.review_required is False
    assert summary.population_change_percent == {"senior": 1.0}


def test_publish_stops_before_public_files_when_review_is_required(
    tmp_path: Path,
    monkeypatch,
) -> None:
    current = _release_fixture(
        version="2026-06-r1",
        month="2026.06",
        population=100_000,
        vdi=20_000,
    )
    candidate = _release_fixture(
        version="2026-06-r2",
        month="2026.06",
        population=101_000,
        vdi=28_000,
    )
    current_path = tmp_path / "current_policy_release.json"
    current_path.write_text(json.dumps(current), encoding="utf-8")
    workspace = tmp_path / "workspace"
    official_path = workspace / "data" / "raw" / "population" / "official.csv"
    dataset = AgePopulationDataset(
        source_month="202606",
        records=(AgePopulationRecord("2711051700", "중구 동인동", 100, 20, 10),),
        official_csv=b"official",
    )

    monkeypatch.setattr(monthly_release_module, "RUNS_ROOT", tmp_path / "runs")
    monkeypatch.setattr(monthly_release_module, "CURRENT_RELEASE_PATH", current_path)
    monkeypatch.setattr(
        monthly_release_module,
        "_current_release_metadata",
        lambda: {
            **current["metadata"],
            "population_source_sha256": "different-current-hash",
        },
    )

    def create_workspace(_run_directory: Path) -> Path:
        workspace.mkdir(parents=True)
        return workspace

    def write_dataset(*_args, **_kwargs):
        official_path.parent.mkdir(parents=True, exist_ok=True)
        official_path.write_bytes(b"official")
        return official_path, official_path.with_name("canonical.csv"), official_path.with_name("manifest.json")

    def run_analysis(*_args, **_kwargs) -> None:
        candidate_path = workspace / "data" / "processed" / "policy_release.json"
        candidate_path.parent.mkdir(parents=True, exist_ok=True)
        candidate_path.write_text(json.dumps(candidate), encoding="utf-8")

    monkeypatch.setattr(monthly_release_module, "_create_staging_workspace", create_workspace)
    monkeypatch.setattr(monthly_release_module, "write_age_population_dataset", write_dataset)
    monkeypatch.setattr(monthly_release_module, "_run_staged_analysis", run_analysis)
    monkeypatch.setattr(
        monthly_release_module,
        "_publish_workspace",
        lambda *_args, **_kwargs: (_ for _ in ()).throw(
            AssertionError("검토 전에 공개 파일을 바꾸면 안 됩니다.")
        ),
    )

    result = asyncio.run(
        monthly_release_module.run_monthly_release(
            mode="publish",
            run_id="review-block",
            source_month="202606",
            now=datetime(2026, 8, 3, tzinfo=timezone.utc),
            client=FakeAgePopulationClient(dataset),
        )
    )

    assert result.state == "blocked"
    assert result.status_label == "큰 변화 검토 필요"
    assert result.review_required is True
    assert result.change_summary_path is not None
