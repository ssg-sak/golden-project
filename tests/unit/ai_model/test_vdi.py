from __future__ import annotations

import copy
import sys
from pathlib import Path
from typing import Any

import pytest


PROJECT_ROOT = Path(__file__).resolve().parents[3]
AI_MODEL_DIR = PROJECT_ROOT / "ai-model"
SCRIPTS_DIR = PROJECT_ROOT / "scripts"
for module_path in (AI_MODEL_DIR, SCRIPTS_DIR):
    if str(module_path) not in sys.path:
        sys.path.insert(0, str(module_path))

import build_actual_road_accessibility as road_accessibility
from vdi_sensitivity import calculate_vdi_rank_sensitivity


@pytest.mark.parametrize(
    ("values", "value", "expected"),
    [
        ([5.0, 5.0, 5.0], 5.0, 0.0),
        ([10.0, 20.0, 30.0], 10.0, 0.0),
        ([10.0, 20.0, 30.0], 30.0, 100.0),
    ],
)
def test_normalize_handles_constant_and_boundary_values(
    values: list[float],
    value: float,
    expected: float,
) -> None:
    assert road_accessibility.normalize(values, value) == pytest.approx(expected)


def _nearest(eta_minutes: float) -> dict[str, Any]:
    return {
        "resource_name": "테스트병원",
        "tier": 1,
        "eta_minutes": eta_minutes,
        "road_distance_km": eta_minutes / 2,
    }


def test_actual_road_vdi_zero_boundaries_and_monotonicity(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    matrix = {
        "districts": [
            {
                "name": "ETA영동",
                "vulnerable_population": 100,
                "nearest_emergency_resource": _nearest(0.0),
            },
            {
                "name": "인구영동",
                "vulnerable_population": 0,
                "nearest_emergency_resource": _nearest(10.0),
            },
            {
                "name": "기준동",
                "vulnerable_population": 100,
                "nearest_emergency_resource": _nearest(10.0),
            },
            {
                "name": "증가동",
                "vulnerable_population": 200,
                "nearest_emergency_resource": _nearest(20.0),
            },
        ],
    }
    geojson = {
        "type": "FeatureCollection",
        "features": [
            {"type": "Feature", "properties": {"adm_nm": district["name"]}}
            for district in matrix["districts"]
        ],
    }
    captured: dict[Path, Any] = {}

    def fake_read_json(path: Path) -> Any:
        if path == road_accessibility.FRONTEND_GEOJSON_PATH:
            return copy.deepcopy(geojson)
        if path == road_accessibility.CANDIDATES_PATH:
            return []
        raise AssertionError(f"예상하지 못한 입력 경로: {path}")

    def fake_write_json(
        path: Path,
        payload: Any,
        *,
        compact: bool = False,
    ) -> None:
        captured[path] = copy.deepcopy(payload)

    monkeypatch.setattr(road_accessibility, "read_json", fake_read_json)
    monkeypatch.setattr(road_accessibility, "write_json", fake_write_json)

    road_accessibility.apply_actual_road_results(matrix, {"results": {}})

    output = captured[road_accessibility.FRONTEND_GEOJSON_PATH]
    scores = {
        feature["properties"]["adm_nm"]: feature["properties"]["vdi_log"]
        for feature in output["features"]
    }
    assert scores["ETA영동"] == pytest.approx(0.0)
    assert scores["인구영동"] == pytest.approx(0.0)
    assert scores["기준동"] > 0
    assert scores["증가동"] > scores["기준동"]


def _sensitivity_release() -> dict[str, Any]:
    rows = [
        ("가동", 100.0, 100, 10.0),
        ("나동", 100.0, 100, 10.0),
        ("다동", 50.0, 50, 5.0),
        ("라동", 25.0, 25, 2.0),
    ]
    return {
        "vulnerability": {
            "features": [
                {
                    "properties": {
                        "adm_nm": name,
                        "vulnerability_index": baseline,
                        "취약인구": population,
                        "travel_time_minutes": eta,
                    }
                }
                for name, baseline, population, eta in rows
            ]
        }
    }


def test_vdi_sensitivity_uses_average_ranks_for_ties() -> None:
    result = calculate_vdi_rank_sensitivity(_sensitivity_release())
    rows = {row["adm_nm"]: row for row in result["rows"]}

    assert rows["가동"]["baseline_rank"] == pytest.approx(1.5)
    assert rows["나동"]["baseline_rank"] == pytest.approx(1.5)
    for method in result["methods"].values():
        assert 0.0 <= method["spearman_p_value"] <= 1.0


def test_vdi_sensitivity_rejects_missing_required_field() -> None:
    release = _sensitivity_release()
    del release["vulnerability"]["features"][0]["properties"]["취약인구"]

    with pytest.raises(ValueError, match="`취약인구`는 숫자"):
        calculate_vdi_rank_sensitivity(release)
