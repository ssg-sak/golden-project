from __future__ import annotations

import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[3]
AI_MODEL_DIR = PROJECT_ROOT / "ai-model"
if str(AI_MODEL_DIR) not in sys.path:
    sys.path.insert(0, str(AI_MODEL_DIR))

import build_policy_release


def test_policy_release_is_complete_and_uses_single_version():
    release = build_policy_release.build_release()
    metadata = release["metadata"]

    assert metadata["version"] == "2026-07-18-r2"
    assert metadata["district_count"] == 150
    assert metadata["resource_count"] == 25
    assert metadata["resource_count_by_mode"] == {"pediatric": 6, "senior": 19}
    assert metadata["route_count"] == 5100
    assert metadata["successful_route_count"] == 5100
    assert metadata["missing_route_count"] == 0
    assert len(release["hospitals"]) == 25
    assert len(release["vulnerability"]["features"]) == 150
    assert len(release["candidates"]) == 9
    assert release["optimization"]["metadata"]["version"] == metadata["version"]
    assert (
        release["optimization"]["metadata"]["matrix_source_sha256"]
        == metadata["source_sha256"]
    )
