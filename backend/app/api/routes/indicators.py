# -*- coding: utf-8 -*-
from pathlib import Path

import pandas as pd
from fastapi import APIRouter, HTTPException

router = APIRouter(tags=["indicators"])

PROJECT_DIR = Path(__file__).resolve().parents[4]
INDICATORS_CSV = PROJECT_DIR / "data" / "processed" / "region_indicators.csv"


@router.get("/indicators")
def get_indicators() -> list[dict]:
    """행정동별 지표 CSV(region_indicators.csv)를 JSON 배열로 반환."""
    if not INDICATORS_CSV.exists():
        raise HTTPException(
            status_code=503,
            detail="지표 데이터가 없습니다. python backend/scripts/01_setup_mock_data.py 를 실행하세요.",
        )

    try:
        df = pd.read_csv(INDICATORS_CSV, encoding="utf-8")
    except OSError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"지표 데이터 파일을 읽을 수 없습니다: {exc}",
        ) from exc
    except pd.errors.ParserError as exc:
        raise HTTPException(
            status_code=500,
            detail="지표 CSV 형식이 올바르지 않습니다.",
        ) from exc

    return df.to_dict(orient="records")
