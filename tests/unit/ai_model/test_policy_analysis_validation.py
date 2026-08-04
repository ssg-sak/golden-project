from __future__ import annotations

import copy
import json
import sys
from pathlib import Path

import pytest


PROJECT_ROOT = Path(__file__).resolve().parents[3]
SCRIPTS_DIR = PROJECT_ROOT / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from execute_eda_notebook import _notebook_source_signature
from kpi_metrics import calculate_policy_kpis, selected_p_median_resources
from policy_analysis_validation import validate_policy_analysis
from vdi_sensitivity import calculate_vdi_rank_sensitivity


def _read_json(relative_path: str) -> dict:
    with (PROJECT_ROOT / relative_path).open(encoding="utf-8") as file:
        return json.load(file)


def test_notebook_source_signature_normalizes_nbformat_source_shape() -> None:
    string_source_notebook = {
        "nbformat": 4,
        "nbformat_minor": 5,
        "cells": [{"cell_type": "code", "source": "print('ok')\n"}],
    }
    list_source_notebook = {
        "nbformat": 4,
        "nbformat_minor": 5,
        "cells": [{"cell_type": "code", "source": ["print('ok')\r\n"]}],
    }

    assert _notebook_source_signature(
        string_source_notebook
    ) == _notebook_source_signature(list_source_notebook)


def test_current_policy_analysis_contract_is_complete() -> None:
    release = _read_json("data/processed/policy_release.json")
    matrix = _read_json("data/processed/actual_road_accessibility_matrix.json")

    summary = validate_policy_analysis(release, matrix)

    assert summary == {
        "district_count": 150,
        "hospital_count": 25,
        "candidate_count": 9,
        "route_count": 5_100,
        "vdi_formula_match_count": 150,
        "geojson_vertex_count": 14_991,
        "nearest_eta_tie_district_count": 1,
        "coordinate_snap_route_count": 460,
        "coordinate_snap_route_percent": 9.02,
        "unique_snapped_origin_count": 5,
        "unique_snapped_destination_count": 33,
        "coordinate_snap_max_distance_km": 0.57304,
    }


def test_missing_required_feature_is_not_replaced_with_zero() -> None:
    release = _read_json("data/processed/policy_release.json")
    matrix = _read_json("data/processed/actual_road_accessibility_matrix.json")
    invalid_release = copy.deepcopy(release)
    del invalid_release["vulnerability"]["features"][0]["properties"][
        "vulnerability_index"
    ]

    with pytest.raises(ValueError, match="필수 필드 `vulnerability_index`"):
        validate_policy_analysis(invalid_release, matrix)


def test_nearest_eta_tie_requires_resource_id_sort_order() -> None:
    release = _read_json("data/processed/policy_release.json")
    matrix = _read_json("data/processed/actual_road_accessibility_matrix.json")
    invalid_matrix = copy.deepcopy(matrix)
    tied_district = next(
        district
        for district in invalid_matrix["districts"]
        if len(
            {
                route["resource_id"]
                for route in district["emergency_resource_routes"]
                if route["eta_minutes"]
                == min(
                    item["eta_minutes"]
                    for item in district["emergency_resource_routes"]
                )
            }
        )
        > 1
    )
    tied_routes = sorted(
        (
            route
            for route in tied_district["emergency_resource_routes"]
            if route["eta_minutes"]
            == min(
                item["eta_minutes"]
                for item in tied_district["emergency_resource_routes"]
            )
        ),
        key=lambda route: route["resource_id"],
    )
    tied_district["nearest_emergency_resource"] = {
        "resource_id": tied_routes[-1]["resource_id"],
        "resource_name": tied_routes[-1]["resource_name"],
        "tier": tied_routes[-1]["tier"],
        "eta_minutes": tied_routes[-1]["eta_minutes"],
        "road_distance_km": tied_routes[-1]["road_distance_km"],
    }

    with pytest.raises(ValueError, match=r"\(ETA, 자원 ID\) 정렬"):
        validate_policy_analysis(release, invalid_matrix)


def test_coordinate_snap_concentration_is_recalculated_from_route_details() -> None:
    release = _read_json("data/processed/policy_release.json")
    matrix = _read_json("data/processed/actual_road_accessibility_matrix.json")
    invalid_matrix = copy.deepcopy(matrix)
    invalid_matrix["metadata"]["route_provenance"]["coordinate_snap_audit"][
        "route_details"
    ].pop()

    with pytest.raises(ValueError, match="좌표 보정 건수·집중도 계약"):
        validate_policy_analysis(release, invalid_matrix)


def test_vdi_alternative_rank_sensitivity_matches_current_release() -> None:
    release = _read_json("data/processed/policy_release.json")

    sensitivity = calculate_vdi_rank_sensitivity(release)

    assert sensitivity["district_count"] == release["metadata"]["district_count"]
    assert set(sensitivity["methods"]) == {"population_log", "equal_minmax"}
    for result in sensitivity["methods"].values():
        assert -1 <= result["spearman_rank_correlation"] <= 1
        assert 0 <= result["top10_overlap_count"] <= 10
        assert result["top10_overlap_percent"] == result["top10_overlap_count"] * 10
        assert 0 <= result["median_absolute_rank_shift"] < sensitivity["district_count"]
        assert 0 <= result["maximum_absolute_rank_shift"] < sensitivity["district_count"]


def test_policy_kpis_match_current_release_snapshot() -> None:
    release = _read_json("data/processed/policy_release.json")
    matrix = _read_json("data/processed/actual_road_accessibility_matrix.json")

    metrics = calculate_policy_kpis(
        matrix,
        selected_p_median_resources(release),
    )
    stored_three_candidate_results = {
        mode: next(
            row
            for row in release["optimization"]["results"][mode]
            if row["facility_count"] == 3
        )
        for mode in ("pediatric", "senior")
    }

    for mode in ("pediatric", "senior"):
        metric = metrics[mode]
        stored = stored_three_candidate_results[mode]["p_median_optimum"]
        assert metric["population"] == release["optimization"]["metadata"][
            "objective_populations"
        ][mode]
        assert metric["selected_candidate_ids"] == stored["candidate_ids"]
        assert metric["selected_candidate_resource_ids"] == [
            f"candidate:{mode}:{candidate_id}"
            for candidate_id in stored["candidate_ids"]
        ]
        assert metric["after_weighted_eta_minutes"] <= metric[
            "baseline_weighted_eta_minutes"
        ]
        assert metric["eta_change_minutes"] == pytest.approx(
            metric["after_weighted_eta_minutes"]
            - metric["baseline_weighted_eta_minutes"],
            abs=0.002,
        )
        assert 0 <= metric["improved_population"] <= metric["population"]
        for window in (15, 30):
            baseline = metric[f"baseline_{window}min_coverage_percent"]
            after = metric[f"after_{window}min_coverage_percent"]
            assert 0 <= baseline <= after <= 100
        assert (
            stored["weighted_average_eta_minutes"]
            == metric["after_weighted_eta_minutes"]
        )
