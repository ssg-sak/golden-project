# -*- coding: utf-8 -*-
import pytest

from app.services.analysis_metrics import compute_high_risk_metrics, format_change_text
from app.services.fetchers.base import generate_hash, normalize_records_for_hash
from app.services.hospital_category import apply_hospital_mapping, seed_facilities_from_static


def test_hash_is_stable_for_same_payload():
    payload = [{"a": 1, "b": "x"}]
    assert generate_hash(payload) == generate_hash(payload)


def test_hash_ignores_record_order():
    a = [{"id": "1", "name": "A"}, {"id": "2", "name": "B"}]
    b = [{"id": "2", "name": "B"}, {"id": "1", "name": "A"}]
    assert generate_hash(normalize_records_for_hash(a)) == generate_hash(normalize_records_for_hash(b))


def test_hash_changes_when_field_changes():
    first = [{"id": "1", "name": "A"}]
    second = [{"id": "1", "name": "B"}]
    assert generate_hash(first) != generate_hash(second)


def test_change_text_variants():
    assert format_change_text(0) == "변화 없음"
    assert format_change_text(2) == "2 증가"
    assert format_change_text(-3) == "3 감소"


def test_high_risk_top_quarter_rule():
    indices = [100.0, 90.0, 80.0, 70.0]
    threshold, high_risk = compute_high_risk_metrics(indices)
    assert threshold == 90.0
    assert high_risk == 2


def test_static_hospital_seed_regression_counts():
    facilities = seed_facilities_from_static()
    assert len(facilities) == 25
    assert sum(1 for f in facilities if f["dashboard_category"] == "large") == 6
    assert sum(1 for f in facilities if f["dashboard_category"] == "secondary") == 13
    assert sum(1 for f in facilities if f["dashboard_category"] == "moonlightPediatric") == 6


def test_hospital_mapping_deduplicates_by_id():
    rows = [
        {
            "facility_id": "A2800003",
            "facility_name": "경북대학교병원",
            "official_type_name": "지역응급의료센터",
            "address": "대구",
            "sido_name": "대구광역시",
            "latitude": 35.8,
            "longitude": 128.6,
            "is_moonlight": False,
        },
        {
            "facility_id": "A2800003",
            "facility_name": "경북대학교병원",
            "official_type_name": "권역응급의료센터",
            "address": "대구",
            "sido_name": "대구광역시",
            "latitude": 35.8,
            "longitude": 128.6,
            "is_moonlight": False,
        },
    ]
    mapped = apply_hospital_mapping(rows)
    assert len(mapped) == 1
    assert mapped[0]["dashboard_category"] == "large"
