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

from kpi_metrics import calculate_policy_kpis, selected_p_median_resources
from policy_analysis_validation import validate_policy_analysis
from vdi_sensitivity import calculate_vdi_rank_sensitivity


def _read_json(relative_path: str) -> dict:
    with (PROJECT_ROOT / relative_path).open(encoding="utf-8") as file:
        return json.load(file)


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

    assert sensitivity["district_count"] == 150
    assert sensitivity["methods"] == {
        "population_log": {
            "spearman_rank_correlation": 0.518,
            "top10_overlap_count": 2,
            "top10_overlap_percent": 20.0,
            "median_absolute_rank_shift": 19.0,
            "maximum_absolute_rank_shift": 134,
        },
        "equal_minmax": {
            "spearman_rank_correlation": 0.935,
            "top10_overlap_count": 7,
            "top10_overlap_percent": 70.0,
            "median_absolute_rank_shift": 7.0,
            "maximum_absolute_rank_shift": 70,
        },
    }


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

    assert metrics["pediatric"] == {
        "population": 126_483,
        "selected_candidate_resource_ids": [
            "candidate:pediatric:1",
            "candidate:pediatric:3",
            "candidate:pediatric:4",
        ],
        "selected_candidate_ids": [1, 3, 4],
        "baseline_weighted_eta_minutes": 15.932,
        "after_weighted_eta_minutes": 12.969,
        "eta_change_minutes": -2.963,
        "eta_change_percent": -18.6,
        "improved_population": 53_353,
        "improved_population_percent": 42.18,
        "baseline_15min_coverage_percent": 42.94,
        "after_15min_coverage_percent": 66.25,
        "baseline_30min_coverage_percent": 97.86,
        "after_30min_coverage_percent": 98.72,
    }
    assert metrics["senior"] == {
        "population": 529_419,
        "selected_candidate_resource_ids": [
            "candidate:senior:1",
            "candidate:senior:2",
            "candidate:senior:3",
        ],
        "selected_candidate_ids": [1, 2, 3],
        "baseline_weighted_eta_minutes": 11.89,
        "after_weighted_eta_minutes": 11.155,
        "eta_change_minutes": -0.735,
        "eta_change_percent": -6.18,
        "improved_population": 62_260,
        "improved_population_percent": 11.76,
        "baseline_15min_coverage_percent": 79.37,
        "after_15min_coverage_percent": 84.24,
        "baseline_30min_coverage_percent": 94.16,
        "after_30min_coverage_percent": 95.3,
    }
    for mode in ("pediatric", "senior"):
        assert (
            stored_three_candidate_results[mode]["p_median_optimum"][
                "weighted_average_eta_minutes"
            ]
            == metrics[mode]["after_weighted_eta_minutes"]
        )
