from __future__ import annotations

import sys
from pathlib import Path

import pytest


PROJECT_ROOT = Path(__file__).resolve().parents[3]
AI_MODEL_DIR = PROJECT_ROOT / "ai-model"
if str(AI_MODEL_DIR) not in sys.path:
    sys.path.insert(0, str(AI_MODEL_DIR))

import build_actual_road_accessibility as road_accessibility


def _ok_route(
    origin: dict,
    destination: dict,
    eta_minutes: float,
) -> tuple[str, dict]:
    return (
        road_accessibility.coordinate_key(origin, destination),
        {
            "status": "ok",
            "eta_seconds": int(eta_minutes * 60),
            "distance_meters": int(eta_minutes * 500),
            "origin_id": origin["id"],
            "destination_id": destination["id"],
        },
    )


def test_mode_specific_baselines_and_current_cache_counts():
    district = {
        "id": "district:1",
        "name": "테스트동",
        "lat": 35.8,
        "lng": 128.6,
        "vulnerable_population": 300,
        "senior_population": 200,
        "pediatric_population": 100,
    }
    senior_hospital = {
        "id": "hospital:senior",
        "name": "응급기관",
        "lat": 35.81,
        "lng": 128.61,
        "tier": 2,
    }
    pediatric_hospital = {
        "id": "hospital:pediatric",
        "name": "달빛병원",
        "lat": 35.82,
        "lng": 128.62,
        "tier": 3,
    }
    pediatric_candidate = {
        "id": "candidate:pediatric:1",
        "candidate_id": 1,
        "mode": "pediatric",
        "name": "소아 후보",
        "lat": 35.83,
        "lng": 128.63,
    }
    senior_candidate = {
        "id": "candidate:senior:1",
        "candidate_id": 1,
        "mode": "senior",
        "name": "어르신 후보",
        "lat": 35.84,
        "lng": 128.64,
    }
    routes = dict(
        [
            _ok_route(district, senior_hospital, 10),
            _ok_route(district, pediatric_hospital, 5),
            _ok_route(district, pediatric_candidate, 8),
            _ok_route(district, senior_candidate, 7),
        ]
    )

    matrix = road_accessibility.build_matrix(
        [district],
        [senior_hospital, pediatric_hospital],
        [pediatric_candidate, senior_candidate],
        {"version": 1, "routes": routes},
    )

    row = matrix["districts"][0]
    assert row["nearest_emergency_resource"]["resource_name"] == "달빛병원"
    assert row["nearest_emergency_resource_by_mode"]["pediatric"]["resource_name"] == "달빛병원"
    assert row["nearest_emergency_resource_by_mode"]["senior"]["resource_name"] == "응급기관"
    assert matrix["metadata"]["requested_route_count"] == 4
    assert matrix["metadata"]["successful_route_count"] == 4
    assert matrix["metadata"]["missing_route_count"] == 0
    assert matrix["metadata"]["resource_count_by_mode"] == {"pediatric": 1, "senior": 1}

    optimization = road_accessibility.evaluate_combinations(matrix)
    pediatric = optimization["results"]["pediatric"][0]["p_median_optimum"]
    senior = optimization["results"]["senior"][0]["p_median_optimum"]
    assert pediatric["weighted_average_eta_minutes"] == 5.0
    assert senior["weighted_average_eta_minutes"] == 7.0


def test_cache_only_validation_rejects_missing_current_routes():
    matrix = {"metadata": {"missing_route_count": 1}}

    with pytest.raises(RuntimeError, match="온라인 수집"):
        road_accessibility.validate_matrix_route_coverage(matrix)


def test_coordinate_retry_pairs_try_exact_then_origin_and_destination_offsets():
    pairs = road_accessibility.coordinate_retry_pairs(False, False)

    assert pairs[0] == ((0.0, 0.0), (0.0, 0.0))
    assert len(pairs) == 65
    assert len(set(pairs)) == len(pairs)
    assert max(
        road_accessibility.snap_offset_distance_km(offset)
        for pair in pairs
        for offset in pair
    ) <= road_accessibility.MAX_ALLOWED_SNAP_DISTANCE_KM
    assert any(origin != (0.0, 0.0) and destination == (0.0, 0.0) for origin, destination in pairs)
    assert any(origin == (0.0, 0.0) and destination != (0.0, 0.0) for origin, destination in pairs)


def test_coordinate_snap_audit_records_route_details_and_rejects_excess():
    audit = road_accessibility.build_coordinate_snap_audit(
        [
            {
                "origin_id": "district:1",
                "destination_id": "hospital:1",
                "origin_snap_offset": [0.002, 0.0],
                "destination_snap_offset": [0.0, 0.0],
            },
            {
                "origin_id": "district:2",
                "destination_id": "hospital:2",
                "origin_snap_offset": [0.0, 0.0],
                "destination_snap_offset": [0.0, -0.004],
            },
        ]
    )

    assert audit["route_count"] == 2
    assert audit["origin_snap_route_count"] == 1
    assert audit["destination_snap_route_count"] == 1
    assert len(audit["route_details"]) == 2
    assert audit["max_snap_distance_km"] <= audit["allowed_max_snap_distance_km"]

    with pytest.raises(RuntimeError, match="허용 한도"):
        road_accessibility.build_coordinate_snap_audit(
            [
                {
                    "origin_id": "district:3",
                    "destination_id": "hospital:3",
                    "origin_snap_offset": [0.02, 0.0],
                    "destination_snap_offset": [0.0, 0.0],
                }
            ]
        )


def test_release_validation_rejects_missing_required_hospital():
    districts, hospitals, candidates = road_accessibility.load_inputs()
    replacement = {**hospitals[0], "id": "hospital:replacement", "name": "대체기관"}
    without_required = [
        hospital
        for hospital in hospitals
        if road_accessibility.normalize_resource_name(hospital["name"])
        not in road_accessibility.REQUIRED_HOSPITAL_NAMES
    ]
    without_required.append(replacement)

    with pytest.raises(RuntimeError, match="필수 기관 누락"):
        road_accessibility.validate_release_inputs(
            districts,
            without_required,
            candidates,
        )


def test_matrix_source_validation_rejects_stale_input_hash():
    districts, hospitals, candidates = road_accessibility.load_inputs()
    matrix = road_accessibility.build_matrix(
        districts,
        hospitals,
        candidates,
        {"version": 1, "routes": {}},
    )
    matrix["metadata"]["source_sha256"] = "stale"

    with pytest.raises(RuntimeError, match="입력 해시"):
        road_accessibility.validate_matrix_source(
            matrix,
            districts,
            hospitals,
            candidates,
        )
