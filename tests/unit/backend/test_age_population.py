from __future__ import annotations

import asyncio
import csv
import io

import httpx
import pytest

from app.services.fetchers.age_population import (
    AgePopulationClient,
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


def test_age_population_request_retries_temporary_transport_error() -> None:
    request_count = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal request_count
        request_count += 1
        if request_count < 3:
            raise httpx.ReadTimeout("temporary timeout", request=request)
        return httpx.Response(200, text="ok")

    async def run() -> httpx.Response:
        population_client = AgePopulationClient(
            max_attempts=3,
            retry_delay_seconds=0,
        )
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            return await population_client._request(client, "GET", "https://test.local")

    response = asyncio.run(run())

    assert response.status_code == 200
    assert request_count == 3


def test_age_population_request_does_not_retry_permanent_client_error() -> None:
    request_count = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal request_count
        request_count += 1
        return httpx.Response(404, request=request)

    async def run() -> None:
        population_client = AgePopulationClient(
            max_attempts=3,
            retry_delay_seconds=0,
        )
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            await population_client._request(client, "GET", "https://test.local")

    with pytest.raises(httpx.HTTPStatusError):
        asyncio.run(run())

    assert request_count == 1
