from __future__ import annotations

import asyncio
from datetime import datetime
from typing import Any

import httpx

from app.services.fetchers.population_api import (
    PopulationAPIClient,
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
    ) -> tuple[list[dict[str, Any]], int]:
        del client, page_no
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
    assert rows == [{"admCd": "27110", "admNm": "중구"}]
    assert client.requested_months == ["202606"]


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
    assert rows == [{"admCd": "27110", "admNm": "중구"}]
    assert client.requested_months == ["202606", "202605"]
