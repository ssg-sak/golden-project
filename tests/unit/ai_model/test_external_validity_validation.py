from __future__ import annotations

from pathlib import Path

import pytest

from external_validity_validation import (
    build_summary,
    descriptive_summary,
    pair_ambulance_events,
    read_source_rows,
    time_slot,
)


def _event(
    state: str,
    timestamp: str,
    *,
    vehicle_id: str = "100",
    detail: str = "[표본-구급(구급차)]상태",
) -> dict[str, str]:
    return {
        "출동서센터": "표본119안전센터",
        "출동차수": "1",
        "차량호수": vehicle_id,
        "차량동태": state,
        "진행일시": timestamp,
        "관제일련번호": "1",
        "관제진행일시": timestamp,
        "관제내역": detail,
    }


def test_pair_ambulance_events_matches_vehicle_state_transition() -> None:
    rows = [
        _event("출동보고", "2024-08-01 7:05"),
        _event("현장도착보고", "2024-08-01 7:14"),
        _event("출동보고", "2024-08-01 11:00", vehicle_id="200", detail="펌프차"),
    ]

    pairs, audit = pair_ambulance_events(rows)

    assert len(pairs) == 1
    assert pairs[0]["response_minutes"] == pytest.approx(9.0)
    assert pairs[0]["time_slot"] == "morning_peak"
    assert audit["ambulance_event_count"] == 2
    assert audit["matched_pair_count"] == 1


@pytest.mark.parametrize(
    ("hour", "expected"),
    [(7, "morning_peak"), (12, "daytime"), (18, "evening_peak"), (23, "other")],
)
def test_time_slot_boundaries(hour: int, expected: str) -> None:
    from datetime import datetime

    assert time_slot(datetime(2024, 8, 1, hour, 0)) == expected


def test_descriptive_summary_uses_interpolated_p90() -> None:
    summary = descriptive_summary([1.0, 2.0, 3.0, 4.0, 5.0])

    assert summary["median_minutes"] == pytest.approx(3.0)
    assert summary["p90_minutes"] == pytest.approx(4.6)


def test_build_summary_marks_reference_as_not_direct_eta_validation(tmp_path: Path) -> None:
    source_path = tmp_path / "sample.csv"
    source_path.write_bytes(b"source")
    rows = [
        _event("출동보고", "2024-08-01 17:00"),
        _event("현장도착보고", "2024-08-01 17:08"),
    ]

    summary = build_summary(rows, source_path)

    assert summary["metadata"]["direct_eta_validation"] is False
    assert summary["overall"]["count"] == 1
    assert summary["time_slots"]["evening_peak"]["median_minutes"] == 8.0


def test_read_source_rows_rejects_missing_column(tmp_path: Path) -> None:
    source_path = tmp_path / "invalid.csv"
    source_path.write_text("차량호수,차량동태\n100,출동보고\n", encoding="utf-8")

    with pytest.raises(ValueError, match="필수 열"):
        read_source_rows(source_path)
