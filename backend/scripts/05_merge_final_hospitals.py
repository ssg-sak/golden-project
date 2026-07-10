# -*- coding: utf-8 -*-
"""
대구 응급실(Tier 1·2) + 달빛어린이병원(Tier 3) → final_hospitals.json

입력:
  - data/processed/daegu_er_hospitals.json  (04_fetch_daegu_er_hospitals.py 결과)
  - 내장 TIER3_MOONLIGHT_HOSPITALS         (대구시 보건 공식 6곳)

출력:
  - data/processed/final_hospitals.json
  - frontend/src/assets/final_hospitals.json (동기화)

사용법:
  python backend/scripts/05_merge_final_hospitals.py
"""

from __future__ import annotations

import json
import sys
from typing import Any

import pandas as pd

from data_paths import (
    DAEGU_ER_HOSPITALS_JSON,
    FINAL_HOSPITALS_JSON,
    sync_to_frontend_assets,
    sync_to_frontend_data,
)

# 대구광역시 보건 — 달빛어린이병원 지정 6곳 (2026.06 기준)
# 좌표: 주소 지오코딩(mock_hospitals.json과 동기화)
TIER3_MOONLIGHT_HOSPITALS: list[dict[str, Any]] = [
    {
        "name": "한영한마음아동병원",
        "address": "대구광역시 남구 월배로 468",
        "lat": 35.8307406,
        "lng": 128.5514851,
        "tier": 3,
    },
    {
        "name": "율하연합소아청소년과의원",
        "address": "대구광역시 동구 안심로16길 47",
        "lat": 35.8633811,
        "lng": 128.6937882,
        "tier": 3,
    },
    {
        "name": "우리허브병원",
        "address": "대구광역시 달성군 현풍읍 테크노상업로 30",
        "lat": 35.6902741,
        "lng": 128.453075,
        "tier": 3,
    },
    {
        "name": "열린아동병원",
        "address": "대구광역시 달서구 달구벌대로 1542",
        "lat": 35.8504785,
        "lng": 128.5397056,
        "tier": 3,
    },
    {
        "name": "우리아이아동병원",
        "address": "대구광역시 북구 동북로 244",
        "lat": 35.8980181,
        "lng": 128.6130061,
        "tier": 3,
    },
    {
        "name": "바른연합소아청소년과의원",
        "address": "대구광역시 달서구 조암로 149",
        "lat": 35.8230817,
        "lng": 128.521687,
        "tier": 3,
    },
]


def normalize_hospital_record(record: dict[str, Any]) -> dict[str, Any]:
    """API 스키마(dutyName/wgs84*) 또는 프론트 스키마(name/lat/lng) → 통일."""
    name = str(record.get("name") or record.get("dutyName") or "").strip()
    address = str(record.get("address") or record.get("dutyAddr") or "").strip()
    lat = record.get("lat", record.get("wgs84Lat"))
    lng = record.get("lng", record.get("wgs84Lon"))
    tier = int(record.get("tier", 0))

    if not name or lat is None or lng is None or tier not in (1, 2, 3):
        raise ValueError(f"병원 레코드 필드 누락: {record}")

    return {
        "name": name,
        "lat": round(float(lat), 7),
        "lng": round(float(lng), 7),
        "tier": tier,
        "address": address,
    }


def load_er_hospitals() -> list[dict[str, Any]]:
    if not DAEGU_ER_HOSPITALS_JSON.exists():
        print(
            f"❌ {DAEGU_ER_HOSPITALS_JSON} 없음. "
            "먼저 python backend/scripts/04_fetch_daegu_er_hospitals.py 실행",
            file=sys.stderr,
        )
        sys.exit(1)

    raw = json.loads(DAEGU_ER_HOSPITALS_JSON.read_text(encoding="utf-8"))
    if isinstance(raw, dict) and "records" in raw:
        rows = raw["records"]
    elif isinstance(raw, list):
        rows = raw
    else:
        print("❌ daegu_er_hospitals.json 형식 오류", file=sys.stderr)
        sys.exit(1)

    hospitals = [normalize_hospital_record(row) for row in rows]
    print(f"✅ 응급실(Tier 1·2) 로드: {len(hospitals)}건")
    return hospitals


def load_tier3_hospitals() -> list[dict[str, Any]]:
    hospitals = [normalize_hospital_record(row) for row in TIER3_MOONLIGHT_HOSPITALS]
    print(f"✅ 달빛어린이병원(Tier 3) 로드: {len(hospitals)}건")
    return hospitals


def dedupe_by_name(
    er_rows: list[dict[str, Any]],
    tier3_rows: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """이름 기준 중복 제거 — ER(tier 1·2) 우선."""
    by_name: dict[str, dict[str, Any]] = {}
    for row in er_rows:
        by_name[row["name"]] = row
    for row in tier3_rows:
        by_name.setdefault(row["name"], row)
    return list(by_name.values())


def merge_final_hospitals() -> list[dict[str, Any]]:
    er_rows = load_er_hospitals()
    tier3_rows = load_tier3_hospitals()
    merged = dedupe_by_name(er_rows, tier3_rows)

    df = pd.DataFrame(merged).sort_values(["tier", "name"]).reset_index(drop=True)
    print(f"✅ 병합 완료: 총 {len(df)}건 (Tier 1·2: {len(er_rows)}, Tier 3: {len(tier3_rows)})")
    print(df.groupby("tier").size().to_string())

    return [normalize_hospital_record(row) for row in df.to_dict(orient="records")]


def main() -> None:
    payload = merge_final_hospitals()

    FINAL_HOSPITALS_JSON.parent.mkdir(parents=True, exist_ok=True)
    FINAL_HOSPITALS_JSON.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    synced_assets = sync_to_frontend_assets(FINAL_HOSPITALS_JSON)
    synced_data = sync_to_frontend_data(FINAL_HOSPITALS_JSON)

    print(f"\n🎉 저장: {FINAL_HOSPITALS_JSON}")
    print(f"   동기화(assets): {synced_assets}")
    print(f"   동기화(data): {synced_data}")
    print("   지도 마커는 frontend/src/assets/final_hospitals.json 을 사용합니다.")


if __name__ == "__main__":
    main()
