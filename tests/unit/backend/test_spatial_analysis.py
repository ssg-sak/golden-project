from __future__ import annotations

import sys
from pathlib import Path

import geopandas as gpd
import pytest


PROJECT_ROOT = Path(__file__).resolve().parents[3]
BACKEND_SCRIPTS_DIR = PROJECT_ROOT / "backend" / "scripts"
if str(BACKEND_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_SCRIPTS_DIR))

import spatial_analysis


def test_nearest_hospital_uses_position_when_source_index_has_gaps(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    districts = gpd.GeoDataFrame(
        {
            "취약인구": [100],
            "65세이상_인구": [60],
            "0~9세_인구": [40],
        },
        geometry=gpd.points_from_xy([128.6000], [35.8700]),
        crs="EPSG:4326",
    )
    hospitals = gpd.GeoDataFrame(
        {
            "name": ["서쪽병원", "최근접병원", "동쪽병원"],
            "tier": [2, 1, 3],
            "address": ["서쪽", "가까움", "동쪽"],
        },
        geometry=gpd.points_from_xy(
            [128.5000, 128.6001, 128.7000],
            [35.8700, 35.8700, 35.8700],
        ),
        index=[0, 5, 9],
        crs="EPSG:4326",
    )
    monkeypatch.setattr(spatial_analysis, "load_hospitals", lambda _: hospitals)

    result = spatial_analysis.compute_distances_and_index(
        districts,
        Path("unused.json"),
    )

    assert result.iloc[0]["nearest_hospital_name"] == "최근접병원"
    assert result.iloc[0]["nearest_hospital_tier"] == 1
