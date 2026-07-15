import json
import logging
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/optimal-locations", tags=["Optimal Locations"])

logger = logging.getLogger(__name__)
OPTIMAL_LOCATIONS_FILE = (
    Path(__file__).resolve().parents[4] / "data" / "processed" / "optimal_locations.json"
)

@router.get("", response_model=list[dict[str, Any]])
def get_optimal_locations() -> list[dict[str, Any]]:
    """
    AI 파이프라인에서 생성된 최적 거점 데이터를 반환합니다.
    """
    if not OPTIMAL_LOCATIONS_FILE.exists():
        raise HTTPException(status_code=503, detail="Optimal-location analysis is not available yet")

    try:
        data = json.loads(OPTIMAL_LOCATIONS_FILE.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        logger.exception("Failed to read optimal-location analysis")
        raise HTTPException(status_code=500, detail="Optimal-location analysis is invalid") from exc

    if not isinstance(data, list) or not all(isinstance(item, dict) for item in data):
        logger.error("Invalid optimal-location payload type: %s", type(data).__name__)
        raise HTTPException(status_code=500, detail="Optimal-location analysis has an invalid schema")

    return data
