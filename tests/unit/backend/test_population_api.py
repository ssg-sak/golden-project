from __future__ import annotations

import asyncio
from datetime import datetime
from typing import Any

import httpx
import pytest

from app.services.data_validation import DataValidationError
from app.services.fetchers.population_api import (
    DAEGU_ADMIN_SUBUNIT_PARENTS,
    DAEGU_SGG_ADMIN_CODES,
    EXPECTED_DAEGU_ADMIN_DONG_COUNT,
    PAGE_SIZE,
    PopulationAPIClient,
    PopulationAPIConfigurationError,
    _merge_admin_subunits,
    _parse_api_item,
    _validate_official_population,
    latest_completed_population_yyyymm,
)


class StubPopulationClient(PopulationAPIClient):
    def __init__(
        self,
        responses: dict[str, list[dict[str, Any]] | Exception],
    ) -> None:
        self.service_key = "test-key"
        self.responses = responses
        self.requested_months: list[str] = []

    async def _fetch_page(
        self,
        client: httpx.AsyncClient,
        yyyymm: str,
        page_no: int,
        admin_code: str,
    ) -> tuple[list[dict[str, Any]], int]:
        del client, page_no, admin_code
        self.requested_months.append(yyyymm)
        response = self.responses.get(yyyymm, [])
        if isinstance(response, Exception):
            raise response
        return response, len(response)


def test_latest_completed_population_month_excludes_current_month() -> None:
    assert latest_completed_population_yyyymm(datetime(2026, 7, 26)) == "202606"
    assert latest_completed_population_yyyymm(datetime(2026, 8, 1)) == "202607"


def test_population_client_starts_from_latest_completed_month() -> None:
    client = StubPopulationClient(
        {
            "202606": [{"admCd": "27110", "admNm": "중구"}],
        }
    )

    month, rows = asyncio.run(
        client.find_latest_month_and_fetch(datetime(2026, 7, 26))
    )

    assert month == "202606"
    assert rows == [
        {"admCd": "27110", "admNm": "중구"}
        for _ in DAEGU_SGG_ADMIN_CODES
    ]
    assert client.requested_months == ["202606"] * len(DAEGU_SGG_ADMIN_CODES)


def test_population_client_continues_to_older_month_after_source_error() -> None:
    client = StubPopulationClient(
        {
            "202606": RuntimeError("not published"),
            "202605": [{"admCd": "27110", "admNm": "중구"}],
        }
    )

    month, rows = asyncio.run(
        client.find_latest_month_and_fetch(datetime(2026, 7, 26))
    )

    assert month == "202605"
    assert rows == [
        {"admCd": "27110", "admNm": "중구"}
        for _ in DAEGU_SGG_ADMIN_CODES
    ]
    assert client.requested_months == ["202606"] + ["202605"] * len(
        DAEGU_SGG_ADMIN_CODES
    )


def test_population_api_uses_current_contract_and_parses_response() -> None:
    captured_params: dict[str, str] = {}

    async def handler(request: httpx.Request) -> httpx.Response:
        captured_params.update(dict(request.url.params))
        return httpx.Response(
            200,
            headers={"content-type": "application/json"},
            json={
                "Response": {
                    "head": {
                        "resultCode": "00",
                        "resultMsg": "NORMAL_SERVICE",
                        "totalCount": "1",
                    },
                    "items": {
                        "item": {
                            "statsYm": "202607",
                            "admmCd": "27110517",
                            "dongNm": "동인동",
                        }
                    },
                }
            },
        )

    async def run() -> tuple[list[dict[str, Any]], int]:
        client = PopulationAPIClient()
        client.service_key = "test-key"
        async with httpx.AsyncClient(
            transport=httpx.MockTransport(handler)
        ) as http_client:
            return await client._fetch_page(
                http_client,
                "202607",
                1,
                DAEGU_SGG_ADMIN_CODES[0],
            )

    rows, total = asyncio.run(run())

    assert rows == [
        {"statsYm": "202607", "admmCd": "27110517", "dongNm": "동인동"}
    ]
    assert total == 1
    assert captured_params == {
        "serviceKey": "test-key",
        "admmCd": DAEGU_SGG_ADMIN_CODES[0],
        "srchFrYm": "202607",
        "srchToYm": "202607",
        "lv": "3",
        "regSeCd": "1",
        "type": "JSON",
        "pageNo": "1",
        "numOfRows": str(PAGE_SIZE),
    }


def test_population_api_maps_current_response_fields() -> None:
    parsed = _parse_api_item(
        {
            "statsYm": "202607",
            "admmCd": "27110517",
            "ctpvNm": "대구광역시",
            "dongNm": "동인동",
            "totNmprCnt": "12,345",
            "maleNmprCnt": "6,000",
            "femlNmprCnt": "6,345",
            "hhCnt": "5,500",
        },
        "2026.07",
    )

    assert parsed == {
        "base_month": "2026.07",
        "admin_dong_code": "27110517",
        "admin_dong_name": "동인동",
        "total_population": 12345,
        "male_population": 6000,
        "female_population": 6345,
        "household_count": 5500,
    }


def test_population_api_stops_immediately_on_unregistered_service_key() -> None:
    async def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            403,
            json={
                "OpenAPI_ServiceResponse": {
                    "cmmMsgHeader": {
                        "errMsg": "SERVICE_KEY_IS_NOT_REGISTERED_ERROR",
                        "returnAuthMsg": "등록되지 않은 서비스키",
                    }
                }
            },
        )

    async def run() -> None:
        client = PopulationAPIClient()
        client.service_key = "test-key"
        async with httpx.AsyncClient(
            transport=httpx.MockTransport(handler)
        ) as http_client:
            with pytest.raises(
                PopulationAPIConfigurationError,
                match="등록되지 않은 서비스키",
            ):
                await client._fetch_page(
                    http_client,
                    "202607",
                    1,
                    DAEGU_SGG_ADMIN_CODES[0],
                )
        assert client.request_count == 1

    asyncio.run(run())


def test_population_api_treats_official_no_data_as_unpublished_month() -> None:
    async def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            headers={"content-type": "application/json"},
            json={
                "Response": {
                    "head": {
                        "resultCode": "3",
                        "resultMsg": "NODATA_ERROR",
                        "totalCount": "0",
                    },
                    "items": "",
                }
            },
        )

    async def run() -> tuple[list[dict[str, Any]], int]:
        client = PopulationAPIClient()
        client.service_key = "test-key"
        async with httpx.AsyncClient(
            transport=httpx.MockTransport(handler)
        ) as http_client:
            return await client._fetch_page(
                http_client,
                "202607",
                1,
                DAEGU_SGG_ADMIN_CODES[0],
            )

    assert asyncio.run(run()) == ([], 0)


def _valid_population_rows() -> list[dict[str, Any]]:
    return [
        {
            "admin_dong_code": f"27{index:06d}",
            "total_population": 30,
            "male_population": 14,
            "female_population": 16,
            "household_count": 12,
        }
        for index in range(EXPECTED_DAEGU_ADMIN_DONG_COUNT)
    ]


def test_population_quality_gate_accepts_complete_consistent_rows() -> None:
    _validate_official_population(_valid_population_rows())


def test_population_admin_subunits_are_merged_without_total_loss() -> None:
    parent_code = DAEGU_ADMIN_SUBUNIT_PARENTS["2771025400"]
    rows = [
        {
            "base_month": "2026.06",
            "admin_dong_code": parent_code,
            "admin_dong_name": "논공읍",
            "total_population": 10,
            "male_population": 4,
            "female_population": 6,
            "household_count": 5,
        },
        {
            "base_month": "2026.06",
            "admin_dong_code": "2771025400",
            "admin_dong_name": "논공읍공단출장소",
            "total_population": 3,
            "male_population": 1,
            "female_population": 2,
            "household_count": 2,
        },
    ]

    merged = _merge_admin_subunits(rows)

    assert len(merged) == 1
    assert merged[0] == {
        "base_month": "2026.06",
        "admin_dong_code": parent_code,
        "admin_dong_name": "논공읍",
        "total_population": 13,
        "male_population": 5,
        "female_population": 8,
        "household_count": 7,
    }


def test_population_admin_subunit_requires_parent_row() -> None:
    child_code = "2771025400"
    with pytest.raises(DataValidationError, match="출장소 부모 행정동 누락"):
        _merge_admin_subunits(
            [
                {
                    "base_month": "2026.06",
                    "admin_dong_code": child_code,
                    "admin_dong_name": "논공읍공단출장소",
                    "total_population": 3,
                    "male_population": 1,
                    "female_population": 2,
                    "household_count": 2,
                }
            ]
        )


def test_population_quality_gate_rejects_gender_total_mismatch() -> None:
    rows = _valid_population_rows()
    rows[0]["male_population"] = 13

    with pytest.raises(DataValidationError, match="성별 인구 합계 불일치"):
        _validate_official_population(rows)
