# -*- coding: utf-8 -*-
"""mock_medical_data.json 생성 — 행정동별 응급·병상 mock (지역 현실 + tier 분리)."""

from __future__ import annotations

import json
import random
from enum import Enum
from pathlib import Path

import pandas as pd

RANDOM_SEED = 42
GOLDEN_TIME_MINUTES = 15

URBAN_SGG = frozenset({"수성구", "중구"})
OUTSKIRTS_SGG = frozenset({"달성군", "군위군"})

TIER1_ERS = [
    "경북대학교병원",
    "영남대학교병원",
    "계명대학교 동산병원",
    "대구가톨릭대학교병원",
    "칠곡경북대학교병원",
]

TIER2_ERS = [
    "곽병원",
    "구병원",
    "삼일병원",
    "대구파티마병원",
]

# 대구광역시 달빛어린이병원 지정기관 6개소 (2026.06 기준, 대구시 보건)
# https://www.daegu.go.kr/health/index.do?menu_id=00936060
MOONLIGHT_HOSPITALS = [
    "한영한마음아동병원",
    "율하연합소아청소년과의원",
    "우리허브병원",
    "열린아동병원",
    "우리아이아동병원",
    "바른연합소아청소년과의원",
]

SGG_MOONLIGHT_DEFAULT: dict[str, str] = {
    "남구": "한영한마음아동병원",
    "동구": "율하연합소아청소년과의원",
    "북구": "우리아이아동병원",
    "달서구": "열린아동병원",
    "달성군": "우리허브병원",
    "수성구": "율하연합소아청소년과의원",
    "중구": "한영한마음아동병원",
    "서구": "바른연합소아청소년과의원",
    "군위군": "율하연합소아청소년과의원",
}

PEDIATRIC_ER_NAME = "달빛어린이병원"
PEDIATRIC_GAP_KM = 10.0

from data_paths import (
    DAEGU_DONG_GEOJSON,
    MOCK_HOSPITALS_JSON,
    MOCK_MEDICAL_DATA_JSON,
    REGION_INDICATORS_CSV,
    sync_to_frontend_assets,
)

CSV_PATH = REGION_INDICATORS_CSV
GEOJSON_PATH = DAEGU_DONG_GEOJSON
HOSPITALS_PATH = MOCK_HOSPITALS_JSON
OUTPUT = MOCK_MEDICAL_DATA_JSON


class AccessTier(str, Enum):
    URBAN = "urban"
    OUTSKIRTS = "outskirts"
    MIDDLE = "middle"


def to_adm_nm(full_name: str) -> str:
    return full_name.removeprefix("대구광역시 ").strip()


def classify_tier(sgg: str) -> AccessTier:
    if sgg in URBAN_SGG:
        return AccessTier.URBAN
    if sgg in OUTSKIRTS_SGG:
        return AccessTier.OUTSKIRTS
    return AccessTier.MIDDLE


def distance_tier1_for(access: AccessTier) -> float:
    """권역·대형 응급까지 거리."""
    if access is AccessTier.URBAN:
        return round(random.uniform(0.8, 2.9), 1)
    if access is AccessTier.OUTSKIRTS:
        return round(random.uniform(15.0, 24.0), 1)
    return round(random.uniform(4.0, 12.0), 1)


def distance_tier2_for(access: AccessTier, distance_tier1: float) -> float:
    """준종합 응급 — 대형보다 가깝거나 비슷한 생활권 거리."""
    if access is AccessTier.URBAN:
        raw = round(random.uniform(0.5, 2.5), 1)
    elif access is AccessTier.OUTSKIRTS:
        raw = round(random.uniform(8.0, 14.5), 1)
    else:
        raw = round(random.uniform(2.0, 8.0), 1)
    return round(min(raw, max(0.5, distance_tier1 - 0.3)), 1)


def golden_time_missed_for_tier(access: AccessTier, distance_tier1: float) -> bool:
    if access is AccessTier.URBAN:
        return False
    if access is AccessTier.OUTSKIRTS:
        return True
    travel_min = distance_tier1 * 2.0 + random.uniform(3.0, 7.0)
    return travel_min > GOLDEN_TIME_MINUTES


def pediatric_er_distance_for_tier(access: AccessTier) -> float:
    if access is AccessTier.URBAN:
        return round(random.uniform(1.0, 5.0), 1)
    if access is AccessTier.OUTSKIRTS:
        return round(random.uniform(20.0, 40.0), 1)
    return round(random.uniform(6.0, 18.0), 1)


def bed_shortage_for_tier(
    access: AccessTier,
    distance_tier1: float,
    is_golden_time_missed: bool,
) -> float:
    if access is AccessTier.URBAN:
        base = random.uniform(5.0, 28.0)
    elif access is AccessTier.OUTSKIRTS:
        base = random.uniform(65.0, 95.0)
    else:
        base = distance_tier1 * 3.0 + random.uniform(15.0, 35.0)
        if is_golden_time_missed:
            base += 12.0
    return round(max(0.0, min(100.0, base)), 1)


def nearest_moonlight_for(sgg: str) -> str:
    """시군구 권역에 맞는 달빛어린이병원 (목업용 휴리스틱)."""
    default = SGG_MOONLIGHT_DEFAULT.get(sgg)
    if default:
        if sgg == "달서구" and random.random() < 0.35:
            return "바른연합소아청소년과의원"
        return default
    return random.choice(MOONLIGHT_HOSPITALS)


def ring_centroid(ring: list[list[float]]) -> tuple[float, float]:
    """GeoJSON 링 [[lng, lat], ...] → (lat, lng) 평균 중심."""
    lats = [pt[1] for pt in ring]
    lngs = [pt[0] for pt in ring]
    return round(sum(lats) / len(lats), 6), round(sum(lngs) / len(lngs), 6)


def feature_centroid(geometry: dict) -> tuple[float, float]:
    if geometry["type"] == "Polygon":
        return ring_centroid(geometry["coordinates"][0])
    # MultiPolygon — 가장 큰 외곽 링 사용
    largest = max(geometry["coordinates"], key=lambda poly: len(poly[0]))
    return ring_centroid(largest[0])


def load_dong_centroids() -> dict[str, tuple[float, float]]:
    geojson = json.loads(GEOJSON_PATH.read_text(encoding="utf-8"))
    centroids: dict[str, tuple[float, float]] = {}
    for feature in geojson["features"]:
        adm_nm = to_adm_nm(feature["properties"]["adm_nm"])
        centroids[adm_nm] = feature_centroid(feature["geometry"])
    return centroids


def load_hospital_coords() -> dict[str, tuple[float, float]]:
    hospitals = json.loads(HOSPITALS_PATH.read_text(encoding="utf-8"))
    return {h["name"]: (float(h["lat"]), float(h["lng"])) for h in hospitals}


def hospital_coords_for(
    hospitals: dict[str, tuple[float, float]], name: str
) -> dict[str, float]:
    lat, lng = hospitals[name]
    return {"lat": lat, "lng": lng}


def build_record(
    full_dong: str,
    sgg: str,
    centroids: dict[str, tuple[float, float]],
    hospitals: dict[str, tuple[float, float]],
) -> dict:
    adm_nm = to_adm_nm(full_dong)
    access = classify_tier(sgg)

    distance_tier1 = distance_tier1_for(access)
    distance_tier2 = distance_tier2_for(access, distance_tier1)
    pediatric_er_distance_km = pediatric_er_distance_for_tier(access)
    is_golden_time_missed = golden_time_missed_for_tier(access, distance_tier1)
    bed_shortage_index = bed_shortage_for_tier(
        access, distance_tier1, is_golden_time_missed
    )

    nearest_tier1_er = random.choice(TIER1_ERS)
    nearest_tier2_er = random.choice(TIER2_ERS)
    nearest_pediatric_er = nearest_moonlight_for(sgg)

    if adm_nm == "달성군 구지면":
        nearest_tier1_er = "계명대학교 동산병원"
        nearest_tier2_er = "대구파티마병원"
        nearest_pediatric_er = "우리허브병원"
        distance_tier1 = 18.0
        distance_tier2 = 11.5
        pediatric_er_distance_km = 32.5

    center_lat, center_lng = centroids[adm_nm]
    t1 = hospital_coords_for(hospitals, nearest_tier1_er)
    t2 = hospital_coords_for(hospitals, nearest_tier2_er)
    ped = hospital_coords_for(hospitals, nearest_pediatric_er)

    return {
        "adm_nm": adm_nm,
        "center_lat": center_lat,
        "center_lng": center_lng,
        "nearest_tier1_er": nearest_tier1_er,
        "tier1_er_lat": t1["lat"],
        "tier1_er_lng": t1["lng"],
        "distance_tier1": float(distance_tier1),
        "nearest_tier2_er": nearest_tier2_er,
        "tier2_er_lat": t2["lat"],
        "tier2_er_lng": t2["lng"],
        "distance_tier2": float(distance_tier2),
        "nearest_pediatric_er": nearest_pediatric_er,
        "pediatric_er_lat": ped["lat"],
        "pediatric_er_lng": ped["lng"],
        "pediatric_er_distance_km": float(pediatric_er_distance_km),
        "is_golden_time_missed": is_golden_time_missed,
        "bed_shortage_index": bed_shortage_index,
    }


def validate_records(records: list[dict], df: pd.DataFrame) -> None:
    by_sgg: dict[str, list[dict]] = {}
    for rec, sgg in zip(records, df["시군구"], strict=True):
        by_sgg.setdefault(sgg, []).append(rec)

    for sgg in URBAN_SGG:
        rows = by_sgg.get(sgg, [])
        assert all(r["distance_tier1"] < 3 for r in rows), f"{sgg} tier1 >= 3"
        assert all(r["distance_tier2"] < 3 for r in rows), f"{sgg} tier2 >= 3"
        assert all(not r["is_golden_time_missed"] for r in rows), f"{sgg} missed"

    for sgg in OUTSKIRTS_SGG:
        rows = by_sgg.get(sgg, [])
        assert all(r["distance_tier1"] >= 15 for r in rows), f"{sgg} tier1 < 15"
        assert all(r["is_golden_time_missed"] for r in rows), f"{sgg} not missed"
        assert all(r["distance_tier2"] < r["distance_tier1"] for r in rows), (
            f"{sgg} tier2 not closer than tier1"
        )

    for rec in records:
        assert rec["distance_tier2"] <= rec["distance_tier1"], (
            f"{rec['adm_nm']}: tier2 farther than tier1"
        )


def main() -> None:
    random.seed(RANDOM_SEED)
    df = pd.read_csv(CSV_PATH, encoding="utf-8")
    centroids = load_dong_centroids()
    hospitals = load_hospital_coords()

    records = [
        build_record(row["행정동"], row["시군구"], centroids, hospitals)
        for _, row in df.iterrows()
    ]
    validate_records(records, df)

    payload = {
        "meta": {
            "version": "mock-0.7",
            "pediatric_er_name": PEDIATRIC_ER_NAME,
            "pediatric_gap_km": PEDIATRIC_GAP_KM,
            "moonlight_hospitals": MOONLIGHT_HOSPITALS,
            "moonlight_source": "대구광역시 보건 — 달빛어린이병원 지정기관 6개소 (2026.06)",
            "region": "대구광역시",
            "record_count": len(records),
            "golden_time_minutes": GOLDEN_TIME_MINUTES,
            "hospital_tiers": {
                "1": "권역·대형 (중증 응급)",
                "2": "준종합 (일반 응급)",
                "3": "달빛어린이병원 (소아 응급)",
            },
            "regional_rules": {
                "urban": {
                    "sgg": sorted(URBAN_SGG),
                    "distance_tier1_km": "< 3",
                    "distance_tier2_km": "< 3",
                    "is_golden_time_missed": False,
                },
                "outskirts": {
                    "sgg": sorted(OUTSKIRTS_SGG),
                    "distance_tier1_km": ">= 15",
                    "distance_tier2_km": "8~14 (대형보다 가까움)",
                    "is_golden_time_missed": True,
                },
                "middle": "북·달서·동·서·남구 — tier2 < tier1, 골든타임은 tier1 기준",
                "pediatric_urban_km": "1~5",
                "pediatric_outskirts_km": "20~40",
            },
            "fields": {
                "adm_nm": "행정동 이름 (시군구 포함)",
                "center_lat": "행정동 폴리곤 중심 위도",
                "center_lng": "행정동 폴리곤 중심 경도",
                "nearest_tier1_er": "최근접 권역·대형 응급",
                "tier1_er_lat": "대형 응급 위도",
                "tier1_er_lng": "대형 응급 경도",
                "distance_tier1": "대형 응급 직선거리 km",
                "nearest_tier2_er": "최근접 준종합 응급",
                "tier2_er_lat": "준종합 응급 위도",
                "tier2_er_lng": "준종합 응급 경도",
                "distance_tier2": "준종합 응급 직선거리 km",
                "nearest_pediatric_er": "최근접 달빛어린이병원",
                "pediatric_er_lat": "달빛어린이병원 위도",
                "pediatric_er_lng": "달빛어린이병원 경도",
                "pediatric_er_distance_km": "달빛어린이병원 직선거리 km",
                "is_golden_time_missed": f"tier1 기준 {GOLDEN_TIME_MINUTES}분 이내 도달 실패",
                "bed_shortage_index": "인구 대비 병상 부족 (0~100)",
            },
        },
        "records": records,
    }

    OUTPUT.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    synced = sync_to_frontend_assets(OUTPUT)
    print(f"saved {OUTPUT} ({len(records)} records, {OUTPUT.stat().st_size} bytes)")
    print(f"synced {synced}")


if __name__ == "__main__":
    main()
