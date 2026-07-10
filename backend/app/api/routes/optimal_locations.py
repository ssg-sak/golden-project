import json
import os
from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/optimal-locations", tags=["Optimal Locations"])

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OPTIMAL_LOCATIONS_FILE = os.path.join(
    BASE_DIR, "..", "..", "..", "..", "data", "processed", "optimal_locations.json"
)

@router.get("", response_model=List[Dict[str, Any]])
def get_optimal_locations():
    """
    AI 파이프라인에서 생성된 최적 거점 데이터를 반환합니다.
    """
    try:
        if not os.path.exists(OPTIMAL_LOCATIONS_FILE):
            return []
            
        with open(OPTIMAL_LOCATIONS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            
        return data
    except Exception as e:
        # JSON 디코딩 에러 등 장애 시 시스템 크래시를 막고 빈 배열로 폴백 (우아한 성능 저하 방어 기제)
        print(f"[optimal_locations] Failed to load data, returning empty array. Error: {str(e)}")
        return []
