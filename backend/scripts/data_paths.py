# -*- coding: utf-8 -*-
"""프로젝트 루트 data/ 경로 상수 — 정본(processed) + 프론트 assets 동기화."""

from __future__ import annotations

import shutil
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPTS_DIR.parent
PROJECT_DIR = BACKEND_DIR.parent

DATA_DIR = PROJECT_DIR / "data"
RAW_DIR = DATA_DIR / "raw"
PROCESSED_DIR = DATA_DIR / "processed"
RAW_GEO_DIR = RAW_DIR / "geo"
RAW_POPULATION_DIR = RAW_DIR / "population"

FRONTEND_ASSETS_DIR = PROJECT_DIR / "frontend" / "src" / "assets"
FRONTEND_DATA_DIR = PROJECT_DIR / "frontend" / "src" / "data"

# 정본 (프로젝트 루트 data/)
REGION_INDICATORS_CSV = PROCESSED_DIR / "region_indicators.csv"
DAEGU_DONG_GEOJSON = PROCESSED_DIR / "daegu-dong.geojson"
MOCK_MEDICAL_DATA_JSON = PROCESSED_DIR / "mock_medical_data.json"
MOCK_HOSPITALS_JSON = PROCESSED_DIR / "mock_hospitals.json"
DAEGU_ER_HOSPITALS_JSON = PROCESSED_DIR / "daegu_er_hospitals.json"
FINAL_HOSPITALS_JSON = PROCESSED_DIR / "final_hospitals.json"
DAEGU_VULNERABILITY_GEOJSON = PROCESSED_DIR / "daegu_vulnerability.geojson"
ER_HOSPITAL_COORD_SUPPLEMENT_JSON = PROCESSED_DIR / "er_hospital_coord_supplement.json"

RAW_DAEGU_DONG_GEOJSON = RAW_GEO_DIR / "daegu_dong.geojson"
# 통계청(KOSIS) 5세별 주민등록인구 원본 CSV
RAW_KOSIS_POPULATION_CSV = RAW_POPULATION_DIR / "kosis_dong_5yr_population_202606.csv"
# 파싱 결과 — 시군구+동이름 (예: 중구 삼덕동)
RAW_DAEGU_POPULATION_CSV = RAW_POPULATION_DIR / "daegu_population.csv"
RAW_DAEGU_POPULATION_REAL_CSV = RAW_POPULATION_DIR / "daegu_population_real.csv"

# 분석 스크립트 입력 묶음 (한 폴더)
ANALYSIS_DIR = DATA_DIR / "analysis"
ANALYSIS_FINAL_HOSPITALS_JSON = ANALYSIS_DIR / "final_hospitals.json"
ANALYSIS_DAEGU_DONG_GEOJSON = ANALYSIS_DIR / "daegu_dong.geojson"
ANALYSIS_DAEGU_POPULATION_CSV = ANALYSIS_DIR / "daegu_population.csv"
ANALYSIS_DAEGU_VULNERABILITY_GEOJSON = ANALYSIS_DIR / "daegu_vulnerability.geojson"


def ensure_data_dirs() -> None:
    RAW_GEO_DIR.mkdir(parents=True, exist_ok=True)
    RAW_POPULATION_DIR.mkdir(parents=True, exist_ok=True)
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    ANALYSIS_DIR.mkdir(parents=True, exist_ok=True)


def sync_to_frontend_assets(processed_file: Path) -> Path:
    """정본(processed) → Vite 번들용 frontend/src/assets 복사."""
    FRONTEND_ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    dest = FRONTEND_ASSETS_DIR / processed_file.name
    shutil.copy2(processed_file, dest)
    return dest


def sync_to_frontend_data(processed_file: Path) -> Path:
    """정본(processed) → frontend/src/data 복사 (React import 경로)."""
    FRONTEND_DATA_DIR.mkdir(parents=True, exist_ok=True)
    dest = FRONTEND_DATA_DIR / processed_file.name
    shutil.copy2(processed_file, dest)
    return dest
