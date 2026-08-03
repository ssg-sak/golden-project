from __future__ import annotations

import csv
import io

import pytest

from app.services.fetchers.age_population import (
    AgePopulationNotPublished,
    AgePopulationRecord,
    normalize_age_records,
    parse_official_age_csv,
)


def _official_csv(source_month: str, region: str, ages: list[int]) -> bytes:
    month_label = f"{source_month[:4]}년{source_month[4:]}월"
    fieldnames = [
        "행정구역",
        f"{month_label}_계_총인구수",
        f"{month_label}_계_연령구간인구수",
        *[
            f"{month_label}_계_{age}세" if age < 100 else f"{month_label}_계_100세 이상"
            for age in range(101)
        ],
    ]
    buffer = io.StringIO(newline="")
    writer = csv.DictWriter(buffer, fieldnames=fieldnames, lineterminator="\n")
    writer.writeheader()
    writer.writerow(
        {
            "행정구역": region,
            f"{month_label}_계_총인구수": sum(ages),
            f"{month_label}_계_연령구간인구수": sum(ages),
            **{
                (
                    f"{month_label}_계_{age}세"
                    if age < 100
                    else f"{month_label}_계_100세 이상"
                ): value
                for age, value in enumerate(ages)
            },
        }
    )
    return buffer.getvalue().encode("cp949")


def test_parse_official_age_csv_aggregates_required_age_groups() -> None:
    ages = list(range(101))
    content = _official_csv("202607", "대구광역시 중구 동인동(2711051700)", ages)

    records = parse_official_age_csv(content, "202607")

    assert records == [
        AgePopulationRecord(
            admin_dong_code="2711051700",
            admin_dong_name="중구 동인동",
            total_population=sum(ages),
            pediatric_population=sum(range(10)),
            senior_population=sum(range(65, 101)),
        )
    ]


def test_parse_official_age_csv_rejects_unpublished_month() -> None:
    content = _official_csv(
        "202606",
        "대구광역시 중구 동인동(2711051700)",
        [1] * 101,
    )

    with pytest.raises(AgePopulationNotPublished):
        parse_official_age_csv(content, "202607")


def test_normalize_age_records_merges_outpost_into_parent() -> None:
    records = [
        AgePopulationRecord("2771025300", "달성군 논공읍", 100, 30, 10),
        AgePopulationRecord("2771025400", "달성군 논공읍공단출장소", 20, 5, 2),
    ]

    normalized = normalize_age_records(records, expected_count=1)

    assert normalized == (
        AgePopulationRecord("2771025300", "달성군 논공읍", 120, 35, 12),
    )


def test_normalize_age_records_treats_zero_filled_new_month_as_unpublished() -> None:
    records = [
        AgePopulationRecord("2711051700", "중구 동인동", 0, 0, 0),
    ]

    with pytest.raises(AgePopulationNotPublished, match="아직 채워지지"):
        normalize_age_records(records, expected_count=1)
