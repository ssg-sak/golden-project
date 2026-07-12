# -*- coding: utf-8 -*-
"""건강보험심사평가원 병원·의료기관 상세정보 API 클라이언트."""
from __future__ import annotations

import asyncio
import logging
from typing import Any
from xml.etree import ElementTree as ET

import httpx

from app.core.env import env_str

logger = logging.getLogger(__name__)

HOSPITAL_LIST_URL = "https://apis.data.go.kr/B551182/hospInfoServicev2/getHospBasisList"
EQUIPMENT_LIST_URL = "https://apis.data.go.kr/B551182/MdcinHshldInfoService/getMedOftInfoList"
DAEGU_SIDO_CODE = "230000"
REQUEST_TIMEOUT_SEC = 4.0
EQUIPMENT_BUDGET_SEC = 1.5
MAX_CONCURRENCY = 8


def get_null_hira_data(hospital_names: list[str]) -> dict[str, dict[str, Any]]:
    return {name: {} for name in hospital_names}


def _items(xml_text: str) -> list[dict[str, str]]:
    root = ET.fromstring(xml_text)
    result_code = root.findtext("./header/resultCode")
    if result_code and result_code != "00":
        raise ValueError(f"HIRA service error: {result_code}")
    return [
        {child.tag: (child.text or "").strip() for child in item if child.tag}
        for item in root.findall("./body/items/item")
    ]


def _integer(value: str | None) -> int | None:
    try:
        return int(value) if value not in (None, "") else None
    except ValueError:
        return None


def _equipment_status(rows: list[dict[str, str]]) -> dict[str, bool]:
    status: dict[str, bool] = {}
    for row in rows:
        name = row.get("oftCdNm") or row.get("eqpNm") or row.get("oftNm")
        count = _integer(row.get("oftCnt") or row.get("eqpCnt") or row.get("cnt"))
        if name:
            status[name] = count is None or count > 0
    return status


async def _request_rows(
    client: httpx.AsyncClient,
    url: str,
    api_key: str,
    *,
    num_of_rows: str = "100",
    **params: str,
) -> list[dict[str, str]]:
    response = await client.get(
        url,
        params={"ServiceKey": api_key, "pageNo": "1", "numOfRows": num_of_rows, **params},
    )
    response.raise_for_status()
    return _items(response.text)


async def _fetch_equipment(
    client: httpx.AsyncClient,
    semaphore: asyncio.Semaphore,
    api_key: str,
    hospital_name: str,
    ykiho: str,
) -> tuple[str, dict[str, bool]]:
    async with semaphore:
        try:
            rows = await _request_rows(client, EQUIPMENT_LIST_URL, api_key, ykiho=ykiho)
            return hospital_name, _equipment_status(rows)
        except (httpx.HTTPError, ET.ParseError, ValueError) as exc:
            # httpx 예외 문자열에는 인증키가 포함된 URL이 들어갈 수 있으므로 출력하지 않는다.
            logger.warning("[hira] %s 장비 조회 실패: %s", hospital_name, type(exc).__name__)
            return hospital_name, {}


async def fetch_hira_data_async(hospital_names: list[str]) -> dict[str, dict[str, Any]]:
    api_key = env_str("HIRA_API_KEY") or env_str("DATA_GO_KR_API_KEY")
    if not api_key or api_key == "YOUR_API_KEY_HERE":
        return get_null_hira_data(hospital_names)

    result = get_null_hira_data(hospital_names)
    timeout = httpx.Timeout(REQUEST_TIMEOUT_SEC)
    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            basis_rows = await _request_rows(
                client,
                HOSPITAL_LIST_URL,
                api_key,
                num_of_rows="1000",
                sidoCd=DAEGU_SIDO_CODE,
            )
        except (httpx.HTTPError, ET.ParseError, ValueError) as exc:
            logger.warning("[hira] 병원 기본목록 조회 실패: %s", type(exc).__name__)
            return result

        targets = set(hospital_names)
        ykiho_by_name: dict[str, str] = {}
        for row in basis_rows:
            name = row.get("yadmNm", "")
            if name not in targets:
                continue
            hospital_data: dict[str, Any] = {"hira_source": "api"}
            doctors_count = _integer(row.get("drTotCnt"))
            if doctors_count is not None:
                hospital_data["doctors_count"] = doctors_count
            result[name] = hospital_data
            if row.get("ykiho"):
                ykiho_by_name[name] = row["ykiho"]

        semaphore = asyncio.Semaphore(MAX_CONCURRENCY)
        tasks = [
            asyncio.create_task(_fetch_equipment(client, semaphore, api_key, name, ykiho))
            for name, ykiho in ykiho_by_name.items()
        ]
        if tasks:
            done, pending = await asyncio.wait(tasks, timeout=EQUIPMENT_BUDGET_SEC)
            for task in pending:
                task.cancel()
            for task in done:
                name, equipment = task.result()
                if equipment:
                    result[name]["equipment_status"] = equipment

    return result


def merge_hira_into_hospitals(
    hospitals: list[dict[str, Any]],
    hira_by_name: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    return [dict(hospital, **hira_by_name.get(str(hospital.get("name", "")), {})) for hospital in hospitals]
