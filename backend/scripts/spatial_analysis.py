# -*- coding: utf-8 -*-
"""
[1단계] 응급의료 사각지대 공간 분석 — GeoJSON 생성

입력:
  - data/raw/population/daegu_population_real.csv  (동이름, 65세이상_인구, 0~9세_인구)
  - data/processed/final_hospitals.json

처리:
  1) 오픈소스 행정동 GeoJSON → 대구광역시 필터
  2) 인구 CSV Left Join (동이름)
  3) 폴리곤 Centroid + 최근접 병원 직선거리(km)
  4) vulnerability_index = min_dist_to_hospital × (65세이상_인구 + 0~9세_인구)

출력:
  - frontend/src/data/daegu_vulnerability.geojson  (프론트 정본)
  - data/processed/daegu_vulnerability.geojson       (백엔드 정본)

사용법:
  python backend/scripts/spatial_analysis.py
"""

from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

import geopandas as gpd
import pandas as pd
import requests
from shapely.geometry import Point

from data_paths import (
    ANALYSIS_DAEGU_VULNERABILITY_GEOJSON,
    ANALYSIS_DIR,
    DAEGU_VULNERABILITY_GEOJSON,
    FINAL_HOSPITALS_JSON,
    FRONTEND_DATA_DIR,
    RAW_DAEGU_DONG_GEOJSON,
    RAW_DAEGU_POPULATION_REAL_CSV,
    ensure_data_dirs,
    sync_to_frontend_assets,
)

GEOJSON_URL = (
    "https://raw.githubusercontent.com/vuski/admdongkor/master/"
    "ver20230701/HangJeongDong_ver20230701.geojson"
)
SIDO_NAME = "대구광역시"
METRIC_CRS = "EPSG:5179"
OUTPUT_FRONTEND = FRONTEND_DATA_DIR / "daegu_vulnerability.geojson"


def normalize_join_key(name: str) -> str:
    """통계청·GeoJSON 동이름 표기 통일."""
    short = name.removeprefix(f"{SIDO_NAME} ").strip()
    return short.replace("·", ".").replace(",", ".").replace(" ", "")


def to_short_adm_nm(full_name: str) -> str:
    return full_name.removeprefix(f"{SIDO_NAME} ").strip()


def download_daegu_geojson(dest: Path) -> gpd.GeoDataFrame:
    print(f"[1/4] 행정동 GeoJSON 다운로드: {GEOJSON_URL}")
    response = requests.get(GEOJSON_URL, timeout=120)
    response.raise_for_status()
    data = response.json()

    features = [
        feature
        for feature in data.get("features", [])
        if feature.get("properties", {}).get("sidonm") == SIDO_NAME
    ]
    if not features:
        raise RuntimeError(f"{SIDO_NAME} 행정동을 찾지 못했습니다.")

    collection = {"type": "FeatureCollection", "features": features}
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(collection, ensure_ascii=False), encoding="utf-8")

    gdf = gpd.GeoDataFrame.from_features(features, crs="EPSG:4326")
    print(f"      → {dest} ({len(gdf)}개 동)")
    return gdf


def load_population(csv_path: Path) -> pd.DataFrame:
    pop = pd.read_csv(csv_path, encoding="utf-8-sig")
    required = {"동이름", "65세이상_인구", "0~9세_인구"}
    missing = required - set(pop.columns)
    if missing:
        raise ValueError(f"인구 CSV 필수 컬럼 누락: {sorted(missing)}")

    pop = pop.copy()
    pop["join_key"] = pop["동이름"].astype(str).map(normalize_join_key)
    pop["취약인구"] = pop["65세이상_인구"] + pop["0~9세_인구"]
    return pop


def load_hospitals(path: Path) -> gpd.GeoDataFrame:
    hospitals = json.loads(path.read_text(encoding="utf-8"))
    return gpd.GeoDataFrame(
        hospitals,
        geometry=[Point(item["lng"], item["lat"]) for item in hospitals],
        crs="EPSG:4326",
    )


def merge_population(gdf: gpd.GeoDataFrame, pop: pd.DataFrame) -> gpd.GeoDataFrame:
    print("[2/4] 인구 CSV 병합 (동이름 Left Join)")

    frame = gdf.copy()
    frame["adm_nm"] = frame["adm_nm"].astype(str)
    frame["동이름"] = frame["adm_nm"].map(to_short_adm_nm)
    frame["join_key"] = frame["adm_nm"].map(normalize_join_key)

    merged = frame.merge(
        pop[["join_key", "65세이상_인구", "0~9세_인구", "취약인구"]],
        on="join_key",
        how="left",
    )
    merged["65세이상_인구"] = merged["65세이상_인구"].fillna(0).astype(int)
    merged["0~9세_인구"] = merged["0~9세_인구"].fillna(0).astype(int)
    merged["취약인구"] = merged["취약인구"].fillna(0).astype(int)

    matched = int((merged["취약인구"] > 0).sum())
    print(f"      인구 매칭: {matched}/{len(merged)}")
    return merged.drop(columns=["join_key"])


def compute_distances_and_index(
    gdf: gpd.GeoDataFrame,
    hospitals_path: Path,
) -> gpd.GeoDataFrame:
    print("[3/4] Centroid · 최근접 병원 거리(km) 계산")

    metric_gdf = gdf.to_crs(METRIC_CRS)
    hospitals_metric = load_hospitals(hospitals_path).to_crs(METRIC_CRS)
    hospital_points = hospitals_metric.geometry

    centroids = metric_gdf.geometry.centroid
    centers_wgs = centroids.to_crs("EPSG:4326")

    min_dist_km: list[float] = []
    center_lats: list[float] = []
    center_lngs: list[float] = []
    nearest_names: list[str] = []
    nearest_tiers: list[int] = []
    nearest_addresses: list[str] = []

    for centroid, center_geo in zip(centroids, centers_wgs, strict=True):
        distances_m = hospital_points.distance(centroid)
        nearest_idx = distances_m.idxmin()
        nearest = hospitals_metric.loc[nearest_idx]
        min_dist_km.append(round(float(distances_m.min()) / 1000.0, 3))
        center_lats.append(round(center_geo.y, 6))
        center_lngs.append(round(center_geo.x, 6))
        nearest_names.append(str(nearest["name"]))
        nearest_tiers.append(int(nearest["tier"]))
        address = nearest.get("address", "")
        nearest_addresses.append("" if pd.isna(address) else str(address))

    metric_gdf["center_lat"] = center_lats
    metric_gdf["center_lng"] = center_lngs
    metric_gdf["min_dist_to_hospital"] = min_dist_km
    metric_gdf["nearest_hospital_name"] = nearest_names
    metric_gdf["nearest_hospital_tier"] = nearest_tiers
    metric_gdf["nearest_hospital_address"] = nearest_addresses

    print("[4/4] vulnerability_index 산출")
    print("      공식: min_dist_to_hospital × (65세이상_인구 + 0~9세_인구)")
    metric_gdf["vulnerability_index"] = (
        metric_gdf["min_dist_to_hospital"] * metric_gdf["취약인구"]
    ).round(2)

    return metric_gdf.to_crs("EPSG:4326")


def export_geojson(gdf: gpd.GeoDataFrame) -> None:
    ensure_data_dirs()
    FRONTEND_DATA_DIR.mkdir(parents=True, exist_ok=True)
    ANALYSIS_DIR.mkdir(parents=True, exist_ok=True)

    columns = [
        "adm_nm",
        "동이름",
        "65세이상_인구",
        "0~9세_인구",
        "취약인구",
        "center_lat",
        "center_lng",
        "min_dist_to_hospital",
        "nearest_hospital_name",
        "nearest_hospital_tier",
        "nearest_hospital_address",
        "vulnerability_index",
        "geometry",
    ]
    output = gdf[columns]

    output.to_file(DAEGU_VULNERABILITY_GEOJSON, driver="GeoJSON")
    output.to_file(OUTPUT_FRONTEND, driver="GeoJSON")
    shutil.copy2(DAEGU_VULNERABILITY_GEOJSON, ANALYSIS_DAEGU_VULNERABILITY_GEOJSON)
    sync_to_frontend_assets(DAEGU_VULNERABILITY_GEOJSON)

    zero_pop = int((output["취약인구"] == 0).sum())
    print("-" * 60)
    print(f"프론트 정본: {OUTPUT_FRONTEND}")
    print(f"백엔드 정본: {DAEGU_VULNERABILITY_GEOJSON}")
    print(f"행정동: {len(output)} | 취약인구 0인 동: {zero_pop}")
    print(
        "vulnerability_index "
        f"min={output['vulnerability_index'].min():.1f} "
        f"max={output['vulnerability_index'].max():.1f} "
        f"mean={output['vulnerability_index'].mean():.1f}"
    )


def main() -> int:
    print("=" * 60)
    print("spatial_analysis.py — [1단계] 공간 분석")
    print("=" * 60)

    if not RAW_DAEGU_POPULATION_REAL_CSV.exists():
        print(
            f"[ERROR] 인구 CSV 없음: {RAW_DAEGU_POPULATION_REAL_CSV}\n"
            "daegu_population_real.csv 를 data/raw/population/ 에 넣어 주세요.",
            file=sys.stderr,
        )
        return 1
    if not FINAL_HOSPITALS_JSON.exists():
        print(f"[ERROR] 병원 JSON 없음: {FINAL_HOSPITALS_JSON}", file=sys.stderr)
        return 1

    gdf = download_daegu_geojson(RAW_DAEGU_DONG_GEOJSON)
    pop = load_population(RAW_DAEGU_POPULATION_REAL_CSV)
    merged = merge_population(gdf, pop)
    result = compute_distances_and_index(merged, FINAL_HOSPITALS_JSON)
    export_geojson(result)

    print("=" * 60)
    return 0


if __name__ == "__main__":
    sys.exit(main())
