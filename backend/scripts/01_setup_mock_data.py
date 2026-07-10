# -*- coding: utf-8 -*-
"""
대구 골든타임 — MVP Mock 데이터 자동 생성

1) 대구광역시 행정동 GeoJSON 다운로드·필터·저장
2) 행정동별 Mock 지표 생성
3) 행정서비스 소외 지수 산출 후 CSV 저장
"""

from __future__ import annotations

import json
import random
import sys
from pathlib import Path

import pandas as pd
import requests

RANDOM_SEED = 42

GEOJSON_URL = (
    "https://raw.githubusercontent.com/vuski/admdongkor/master/"
    "ver20230701/HangJeongDong_ver20230701.geojson"
)

from data_paths import (
    PROCESSED_DIR,
    RAW_GEO_DIR,
    RAW_DAEGU_DONG_GEOJSON,
    REGION_INDICATORS_CSV,
    ensure_data_dirs,
)

SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent

OUTPUT_GEOJSON = RAW_DAEGU_DONG_GEOJSON
OUTPUT_CSV = REGION_INDICATORS_CSV

SIDO_NAME = "대구광역시"


def download_and_filter_geojson(url: str) -> dict:
    print(f"[1/3] GeoJSON 다운로드: {url}")
    response = requests.get(url, timeout=120)
    response.raise_for_status()
    data = response.json()

    features = data.get("features", [])
    filtered = [
        f
        for f in features
        if f.get("properties", {}).get("sidonm") == SIDO_NAME
    ]

    if not filtered:
        raise ValueError(f"'{SIDO_NAME}' 행정동을 찾지 못했습니다.")

    print(f"      → {len(filtered)}개 행정동 필터 완료")
    return {"type": "FeatureCollection", "features": filtered}


def save_geojson(data: dict, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    print(f"      → 저장: {path}")


def generate_mock_indicators(features: list[dict]) -> pd.DataFrame:
    print("[2/3] Mock 지표 생성")
    random.seed(RANDOM_SEED)
    rows = []

    for feature in features:
        props = feature["properties"]
        adm_nm = props.get("adm_nm", "")
        parts = adm_nm.replace(SIDO_NAME, "").strip().split()
        sgg = parts[0] if parts else ""

        rows.append(
            {
                "시도": SIDO_NAME,
                "시군구": sgg,
                "행정동": adm_nm,
                "청년_인구수": random.randint(100, 5000),
                "평균_월세_만원": random.randint(20, 70),
                "버스정류장_수": random.randint(2, 25),
                "병원_약국_수": random.randint(1, 20),
                "행정복지센터_접근성_점수": round(random.uniform(15, 90), 1),
            }
        )

    return pd.DataFrame(rows)


def normalize_series(series: pd.Series) -> pd.Series:
    min_val = series.min()
    max_val = series.max()
    if max_val == min_val:
        return pd.Series([0.5] * len(series), index=series.index)
    return (series - min_val) / (max_val - min_val)


def compute_exclusion_score(df: pd.DataFrame) -> pd.DataFrame:
    print("[3/3] 소외 지수 산출")
    df = df.copy()

    demand = (
        0.40 * normalize_series(df["청년_인구수"])
        + 0.35 * normalize_series(df["평균_월세_만원"])
    )
    infra = (
        normalize_series(df["버스정류장_수"])
        + normalize_series(df["병원_약국_수"])
        + normalize_series(df["행정복지센터_접근성_점수"])
    ) / 3

    raw = 0.55 * demand + 0.45 * (1 - infra)
    df["소외_지수"] = (1 + 99 * raw).round(1)

    return df


def main() -> None:
    ensure_data_dirs()
    geojson = download_and_filter_geojson(GEOJSON_URL)
    save_geojson(geojson, OUTPUT_GEOJSON)

    df = generate_mock_indicators(geojson["features"])
    df = compute_exclusion_score(df)

    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUTPUT_CSV, index=False, encoding="utf-8-sig")
    print(f"      → 저장: {OUTPUT_CSV} ({len(df)}행)")
    print("완료!")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"오류: {exc}", file=sys.stderr)
        sys.exit(1)
