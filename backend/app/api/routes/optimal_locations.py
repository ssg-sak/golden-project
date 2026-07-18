import json
import logging
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/optimal-locations", tags=["Optimal Locations"])

logger = logging.getLogger(__name__)
POLICY_RELEASE_FILE = (
    Path(__file__).resolve().parents[4] / "data" / "processed" / "policy_release.json"
)

@router.get("", response_model=list[dict[str, Any]])
def get_optimal_locations() -> list[dict[str, Any]]:
    """
    AI 파이프라인에서 생성된 최적 거점 데이터를 반환합니다.
    """
    if not POLICY_RELEASE_FILE.exists():
        raise HTTPException(status_code=503, detail="Optimal-location analysis is not available yet")

    try:
        release = json.loads(POLICY_RELEASE_FILE.read_text(encoding="utf-8"))
        data = release["candidates"]
    except (OSError, UnicodeError, json.JSONDecodeError, KeyError, TypeError) as exc:
        logger.exception("Failed to read optimal-location analysis")
        raise HTTPException(status_code=500, detail="Optimal-location analysis is invalid") from exc

    if (
        not isinstance(data, list)
        or len(data) != 9
        or not all(isinstance(item, dict) for item in data)
    ):
        logger.error("Invalid optimal-location payload type: %s", type(data).__name__)
        raise HTTPException(status_code=500, detail="Optimal-location analysis has an invalid schema")

    return data
