# -*- coding: utf-8 -*-
"""병원 공식 분류 → 대시보드 카테고리 매핑."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from app.services.hospital_mapping import HPID_TO_NAME, NAME_TO_HPID

_MAPPING_PATH = Path(__file__).resolve().parent.parent / "config" / "hospital_category_mapping.json"
_TIER_TO_CATEGORY = {1: "large", 2: "secondary", 3: "moonlightPediatric"}


def _load_mapping() -> dict[str, Any]:
    return json.loads(_MAPPING_PATH.read_text(encoding="utf-8"))


def resolve_dashboard_category(
    facility_id: str | None,
    facility_name: str,
    official_type_name: str = "",
    is_moonlight: bool = False,
) -> str:
    config = _load_mapping()
    by_id: dict[str, str] = config.get("by_facility_id", {})

    if facility_id and facility_id in by_id:
        return by_id[facility_id]

    canonical_id = NAME_TO_HPID.get(facility_name)
    if canonical_id and canonical_id in by_id:
        return by_id[canonical_id]

    moonlight_ids = set(config.get("moonlight_facility_ids", []))
    if facility_id in moonlight_ids or canonical_id in moonlight_ids or is_moonlight:
        return "moonlightPediatric"

    text = official_type_name or ""
    for rule in config.get("official_type_rules", []):
        if not rule.get("active", True):
            continue
        if any(keyword in text for keyword in rule.get("match_keywords", [])):
            return str(rule["dashboard_category"])

    return "secondary"


def apply_hospital_mapping(facilities: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """기관별 단일 dashboard_category 부여 — large > moonlightPediatric > secondary 우선."""
    config = _load_mapping()
    priority = config.get("priority", ["large", "secondary", "moonlightPediatric"])
    priority_rank = {name: idx for idx, name in enumerate(priority)}

    merged: dict[str, dict[str, Any]] = {}
    for facility in facilities:
        facility_id = facility.get("facility_id") or NAME_TO_HPID.get(facility.get("facility_name", ""))
        if not facility_id:
            facility_id = f"name:{facility.get('facility_name')}::{facility.get('address')}"

        category = resolve_dashboard_category(
            facility_id if not str(facility_id).startswith("name:") else None,
            facility.get("facility_name", ""),
            facility.get("official_type_name", ""),
            bool(facility.get("is_moonlight")),
        )
        facility["dashboard_category"] = category
        facility["facility_id"] = facility_id

        existing = merged.get(facility_id)
        if existing is None:
            merged[facility_id] = facility
            continue

        existing_rank = priority_rank.get(existing.get("dashboard_category", ""), 99)
        new_rank = priority_rank.get(category, 99)
        if new_rank < existing_rank:
            merged[facility_id] = facility
        elif new_rank == existing_rank:
            merged[facility_id]["is_moonlight"] = existing.get("is_moonlight") or facility.get("is_moonlight")
            merged[facility_id]["is_pediatric_center"] = (
                existing.get("is_pediatric_center") or facility.get("is_pediatric_center")
            )

    return list(merged.values())


def tier_from_dashboard_category(category: str) -> int:
    for tier, mapped in _TIER_TO_CATEGORY.items():
        if mapped == category:
            return tier
    return 2


def seed_facilities_from_static() -> list[dict[str, Any]]:
    """final_hospitals.json + HPID 매핑으로 정적 시드 목록 생성."""
    project_dir = Path(__file__).resolve().parents[3]
    hospitals_path = project_dir / "data" / "processed" / "final_hospitals.json"
    rows = json.loads(hospitals_path.read_text(encoding="utf-8"))

    facilities: list[dict[str, Any]] = []
    for row in rows:
        name = row["name"]
        tier = int(row["tier"])
        category = _TIER_TO_CATEGORY.get(tier, "secondary")
        facility_id = NAME_TO_HPID.get(name) or f"static:{name}"
        facilities.append(
            {
                "facility_id": facility_id,
                "facility_name": name,
                "official_type_code": None,
                "official_type_name": f"tier{tier}",
                "dashboard_category": category,
                "address": row.get("address"),
                "sido_name": "대구광역시",
                "sigungu_name": (row.get("address") or "").split(" ")[1] if row.get("address") else "",
                "latitude": row.get("lat"),
                "longitude": row.get("lng"),
                "phone": row.get("tel"),
                "emergency_phone": None,
                "is_moonlight": tier == 3,
                "is_pediatric_center": tier == 3,
            }
        )
    return facilities
