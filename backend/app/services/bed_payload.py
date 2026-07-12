# -*- coding: utf-8 -*-
"""병상 페이로드 스키마 (캐시·실시간 공용)."""
from __future__ import annotations

from typing import Any


def bed_payload(
    hvec: int,
    hvoc: int,
    source: str,
    total_hvec: int | None = None,
    total_hvoc: int | None = None,
    severe_conditions: dict[str, Any] | None = None,
    operating_hours: str | None = None,
    equipment_status: dict[str, bool] | None = None,
    special_beds: dict[str, Any] | None = None,
    realtime_messages: list[str] | None = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "hvec": hvec,
        "hvoc": hvoc,
        # 시민용 수용 상태는 공식 화면과 동일하게 '응급실일반'만 기준으로 삼는다.
        "available_beds": hvec,
        "realtime_source": source,
        "total_hvec": total_hvec,
        "total_hvoc": total_hvoc,
        "total_beds": total_hvec,
    }
    if severe_conditions is not None:
        payload["severe_conditions"] = severe_conditions
    if operating_hours is not None:
        payload["operating_hours"] = operating_hours
    if equipment_status is not None:
        payload["equipment_status"] = equipment_status
    if special_beds is not None:
        payload["special_beds"] = special_beds
    if realtime_messages is not None:
        payload["realtime_messages"] = realtime_messages
    return payload


def null_bed_payload() -> dict[str, Any]:
    return {
        "hvec": None,
        "hvoc": None,
        "available_beds": None,
        "realtime_source": "unavailable",
        "severe_conditions": None,
        "operating_hours": None,
        "equipment_status": None,
        "special_beds": None,
        "realtime_messages": None,
    }
