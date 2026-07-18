# -*- coding: utf-8 -*-
import json

import pytest
from fastapi import HTTPException

from app.api.routes import optimal_locations
from app.services.fetchers.sgis import _normalize_dong_rows


def test_sgis_normalization_preserves_lineage_fields():
    rows = _normalize_dong_rows(
        [
            {
                "admin_dong_code": "2711010100",
                "admin_dong_name": "동인동",
                "sido_code": "27",
                "sigungu_code": "27110",
                "sido_name": "대구광역시",
                "sigungu_name": "중구",
                "full_address": "대구광역시 중구 동인동",
                "center_latitude": 35.87,
                "center_longitude": 128.60,
                "geometry": "verified-boundary-placeholder",
            }
        ]
    )

    assert rows[0]["sido_code"] == "27"
    assert rows[0]["sigungu_code"] == "27110"
    assert rows[0]["full_address"] == "대구광역시 중구 동인동"
    assert rows[0]["geometry"] == "verified-boundary-placeholder"


def test_optimal_locations_api_uses_current_policy_release(monkeypatch, tmp_path):
    release_path = tmp_path / "policy_release.json"
    release_path.write_text(
        json.dumps({"candidates": [{"id": index} for index in range(1, 10)]}),
        encoding="utf-8",
    )
    monkeypatch.setattr(optimal_locations, "POLICY_RELEASE_FILE", release_path)

    assert len(optimal_locations.get_optimal_locations()) == 9


def test_optimal_locations_api_rejects_legacy_candidate_count(monkeypatch, tmp_path):
    release_path = tmp_path / "policy_release.json"
    release_path.write_text(
        json.dumps({"candidates": [{"id": index} for index in range(1, 6)]}),
        encoding="utf-8",
    )
    monkeypatch.setattr(optimal_locations, "POLICY_RELEASE_FILE", release_path)

    with pytest.raises(HTTPException) as exc_info:
        optimal_locations.get_optimal_locations()

    assert exc_info.value.status_code == 500
