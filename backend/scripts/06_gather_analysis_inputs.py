# -*- coding: utf-8 -*-
"""
분석용 입력 데이터를 data/analysis/ 한 폴더로 모읍니다.

복사 대상:
  - final_hospitals.json  ← data/processed/final_hospitals.json
  - daegu_dong.geojson    ← data/raw/geo/daegu_dong.geojson

인구 CSV(daegu_population.csv)는 통계청(SGIS/KOSIS) 데이터를
data/raw/population/ 에 넣은 뒤 본 스크립트를 다시 실행하세요.

사용법:
  python backend/scripts/06_gather_analysis_inputs.py
"""

from __future__ import annotations

import shutil
import sys

from data_paths import (
    ANALYSIS_DAEGU_DONG_GEOJSON,
    ANALYSIS_DAEGU_POPULATION_CSV,
    ANALYSIS_DAEGU_VULNERABILITY_GEOJSON,
    ANALYSIS_DIR,
    ANALYSIS_FINAL_HOSPITALS_JSON,
    DAEGU_VULNERABILITY_GEOJSON,
    FINAL_HOSPITALS_JSON,
    RAW_DAEGU_DONG_GEOJSON,
    RAW_DAEGU_POPULATION_CSV,
    ensure_data_dirs,
)


def copy_if_exists(src, dest, label: str) -> bool:
    if not src.exists():
        print(f"  [SKIP] {label}: 원본 없음 → {src}")
        return False
    shutil.copy2(src, dest)
    print(f"  [OK]   {label}")
    print(f"         {src}")
    print(f"      →  {dest}")
    return True


def main() -> int:
    print("=" * 60)
    print("06_gather_analysis_inputs.py")
    print(f"출력 폴더: {ANALYSIS_DIR}")
    print("=" * 60)

    ensure_data_dirs()

    ok = 0
    if copy_if_exists(FINAL_HOSPITALS_JSON, ANALYSIS_FINAL_HOSPITALS_JSON, "final_hospitals.json"):
        ok += 1
    if copy_if_exists(RAW_DAEGU_DONG_GEOJSON, ANALYSIS_DAEGU_DONG_GEOJSON, "daegu_dong.geojson"):
        ok += 1

    if copy_if_exists(RAW_DAEGU_POPULATION_CSV, ANALYSIS_DAEGU_POPULATION_CSV, "daegu_population.csv"):
        ok += 1
    else:
        print("  [INFO] daegu_population.csv — 통계청 데이터 준비 후")
        print(f"         07_parse_kosis_population.py 실행 → {RAW_DAEGU_POPULATION_CSV}")

    if copy_if_exists(DAEGU_VULNERABILITY_GEOJSON, ANALYSIS_DAEGU_VULNERABILITY_GEOJSON, "daegu_vulnerability.geojson"):
        ok += 1

    print("-" * 60)
    print(f"완료: 핵심 {ok}/2 파일 (병원·행정동) | analysis 폴더")
    return 0 if ok >= 2 else 1


if __name__ == "__main__":
    sys.exit(main())
