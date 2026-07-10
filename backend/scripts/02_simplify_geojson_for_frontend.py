# -*- coding: utf-8 -*-
"""
대구광역시 행정동 GeoJSON — 프론트엔드용 단순화

원본: data/raw/geo/daegu_dong.geojson
출력: data/processed/daegu-dong.geojson (+ frontend/src/assets 동기화)
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

from data_paths import (
    DAEGU_DONG_GEOJSON,
    RAW_DAEGU_DONG_GEOJSON,
    sync_to_frontend_assets,
)

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_DIR = SCRIPT_DIR.parent.parent

SOURCE = RAW_DAEGU_DONG_GEOJSON
OUTPUT = DAEGU_DONG_GEOJSON

MAPSHAPER_CMD = [
    "npx",
    "--yes",
    "mapshaper",
    str(SOURCE),
    "-simplify",
    "15%",
    "keep-shapes",
    "-filter-fields",
    "adm_nm,temp,sggnm",
    "-o",
    "format=geojson",
    str(OUTPUT),
]


def main() -> None:
    if not SOURCE.exists():
        print(f"원본 GeoJSON이 없습니다: {SOURCE}")
        print("먼저 실행: python backend/scripts/01_setup_mock_data.py")
        sys.exit(1)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    before_kb = SOURCE.stat().st_size / 1024
    print(f"[1/3] Mapshaper 단순화: {SOURCE.name} ({before_kb:.1f} KB)")

    subprocess.run(MAPSHAPER_CMD, check=True, cwd=PROJECT_DIR, shell=True)

    after_kb = OUTPUT.stat().st_size / 1024
    print(f"[2/3] 저장 완료: {OUTPUT.relative_to(PROJECT_DIR)} ({after_kb:.1f} KB)")

    synced = sync_to_frontend_assets(OUTPUT)
    print(f"[3/3] 프론트 동기화: {synced.relative_to(PROJECT_DIR)}")


if __name__ == "__main__":
    main()
