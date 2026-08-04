from __future__ import annotations

import sys
import json
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[3]
AI_MODEL_DIR = PROJECT_ROOT / "ai-model"
if str(AI_MODEL_DIR) not in sys.path:
    sys.path.insert(0, str(AI_MODEL_DIR))

import build_policy_release


def test_policy_release_is_complete_and_uses_single_version():
    release = build_policy_release.build_release()
    metadata = release["metadata"]
    population_manifest = build_policy_release.read_json(
        build_policy_release.POPULATION_MANIFEST_PATH
    )

    assert metadata["version"] == build_policy_release.VERSION
    assert metadata["district_count"] == 150
    assert metadata["resource_count"] == 25
    assert metadata["resource_count_by_mode"] == {"pediatric": 6, "senior": 19}
    assert metadata["route_count"] == 5100
    assert metadata["successful_route_count"] == 5100
    assert metadata["missing_route_count"] == 0
    assert metadata["population_base_month"] == population_manifest["population_base_month"]
    assert len(metadata["population_source_sha256"]) == 64
    assert metadata["population_manifest_sha256"] == build_policy_release.payload_hash(
        population_manifest
    )
    assert metadata["sensitivity_sha256"] == build_policy_release.payload_hash(
        build_policy_release.read_json(build_policy_release.SENSITIVITY_PATH)
    )
    assert metadata["sensitivity_scenario_count_per_mode"] == {
        "pediatric": 240,
        "senior": 240,
    }
    assert metadata["sensitivity_completed_count_per_mode"] == {
        "pediatric": 240,
        "senior": 240,
    }
    assert metadata["coordinate_snap_route_count"] == 460
    assert metadata["coordinate_snap_average_distance_km"] > 0
    assert metadata["coordinate_snap_max_distance_km"] <= 0.75
    assert len(release["hospitals"]) == 25
    assert len(release["vulnerability"]["features"]) == 150
    for feature in release["vulnerability"]["features"]:
        nearest_by_role = feature["properties"]["nearest_hospital_by_role"]
        assert set(nearest_by_role) == {
            "general_emergency",
            "pediatric_night_holiday",
        }
        assert nearest_by_role["general_emergency"]["tier"] in {1, 2}
        assert nearest_by_role["pediatric_night_holiday"]["tier"] == 3
        assert nearest_by_role["general_emergency"]["eta_minutes"] >= 0
        assert nearest_by_role["pediatric_night_holiday"]["eta_minutes"] >= 0
    assert len(release["candidates"]) == 9
    assert len(release["candidate_trace"]) == 9
    assert {
        (row["mode"], row["id"], round(row["lat"], 7), round(row["lng"], 7))
        for row in release["candidates"]
    } == {
        (row["mode"], row["id"], round(row["lat"], 7), round(row["lng"], 7))
        for row in release["candidate_trace"]
    }
    assert "candidate_trace" in metadata["content_sha256"]
    assert "sensitivity" in metadata["content_sha256"]
    assert "recommendations" not in release
    assert release["optimization"]["metadata"]["version"] == metadata["version"]
    assert (
        release["optimization"]["metadata"]["matrix_source_sha256"]
        == metadata["source_sha256"]
    )


def test_policy_release_writes_version_pointer_last(tmp_path, monkeypatch):
    processed_path = tmp_path / "processed" / "policy_release.json"
    public_path = tmp_path / "public" / "policy_release.json"
    pointer_path = tmp_path / "public" / "policy_release.latest.json"
    releases_dir = tmp_path / "public" / "releases"
    monkeypatch.setattr(build_policy_release, "PROCESSED_RELEASE_PATH", processed_path)
    monkeypatch.setattr(build_policy_release, "PUBLIC_RELEASE_PATH", public_path)
    monkeypatch.setattr(build_policy_release, "PUBLIC_RELEASE_POINTER_PATH", pointer_path)
    monkeypatch.setattr(build_policy_release, "PUBLIC_RELEASES_DIR", releases_dir)

    build_policy_release.main()

    pointer = json.loads(pointer_path.read_text(encoding="utf-8"))
    versioned_path = releases_dir / build_policy_release.VERSION / "policy_release.json"
    assert pointer["version"] == build_policy_release.VERSION
    assert pointer["bundle_url"] == (
        f"data/releases/{build_policy_release.VERSION}/policy_release.json"
    )
    assert pointer["bundle_sha256"] == build_policy_release.file_hash(versioned_path)
