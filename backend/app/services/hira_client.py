# -*- coding: utf-8 -*-
"""건강보험심사평가원 병원·의료기관 상세정보 API 클라이언트."""
from __future__ import annotations

import asyncio
import csv
import logging
import re
from pathlib import Path
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
PROJECT_ROOT = Path(__file__).resolve().parents[3]
HIRA_SNAPSHOT_PATH = PROJECT_ROOT / "data" / "processed" / "daegu_hira_infrastructure.csv"


def _normalize_name(value: str) -> str:
    value = re.sub(r"\([^)]*\)", "", value)
    value = re.sub(r"^(의료법인|학교법인|재단법인|사회복지법인)", "", value)
    return re.sub(r"[^0-9A-Za-z가-힣]", "", value)


def _snapshot_name(api_name: str, targets: list[str]) -> str | None:
    normalized = _normalize_name(api_name)
    target_map = {_normalize_name(name): name for name in targets}
    if normalized in target_map:
        return target_map[normalized]
    candidates = [name for key, name in target_map.items() if len(key) >= 3 and (key in normalized or normalized in key)]
    return candidates[0] if len(candidates) == 1 else None


def load_hira_snapshot(hospital_names: list[str]) -> dict[str, dict[str, Any]]:
    result = get_null_hira_data(hospital_names)
    if not HIRA_SNAPSHOT_PATH.exists():
        return result
    with HIRA_SNAPSHOT_PATH.open("r", encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            name = _snapshot_name(row.get("요양기관명", ""), hospital_names)
            if name is None:
                continue
            doctors = _integer(row.get("총의사수"))
            result[name] = {
                "hira_source": "api",
                "hira_reference_date": "2026.03",
                "hira_equipment_status": "snapshot",
                "hira_equipment_message": "심평원 장비 정보는 2026.03 오프라인 스냅샷 기준입니다.",
                "equipment_status": {
                    "CT": (_integer(row.get("CT보유대수")) or 0) > 0,
                    "MRI": (_integer(row.get("MRI보유대수")) or 0) > 0,
                },
            }
            if doctors is not None:
                result[name]["doctors_count"] = doctors
    return result


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
        return int(float(value)) if value not in (None, "") else None
    except (TypeError, ValueError):
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
) -> tuple[str, dict[str, Any]]:
    async with semaphore:
        try:
            rows = await _request_rows(client, EQUIPMENT_LIST_URL, api_key, ykiho=ykiho)
            return hospital_name, {
                "equipment_status": _equipment_status(rows),
                "hira_equipment_status": "ok",
            }
        except httpx.HTTPStatusError as exc:
            response_text = exc.response.text[:160].replace("\n", " ").replace("\r", " ")
            logger.warning(
                "[hira] %s 장비 조회 실패: HTTP %s %s",
                hospital_name,
                exc.response.status_code,
                response_text,
            )
            return hospital_name, {
                "hira_equipment_status": "failed",
                "hira_equipment_message": f"심평원 장비 조회 실패 HTTP {exc.response.status_code}",
            }
        except (httpx.HTTPError, ET.ParseError, ValueError) as exc:
            # httpx 예외 문자열에는 인증키가 포함된 URL이 들어갈 수 있으므로 출력하지 않는다.
            logger.warning("[hira] %s 장비 조회 실패: %s", hospital_name, type(exc).__name__)
            return hospital_name, {
                "hira_equipment_status": "failed",
                "hira_equipment_message": f"심평원 장비 조회 실패 {type(exc).__name__}",
            }


async def fetch_hira_data_async(hospital_names: list[str]) -> dict[str, dict[str, Any]]:
    api_key = env_str("HIRA_API_KEY") or env_str("DATA_GO_KR_API_KEY")
    snapshot = load_hira_snapshot(hospital_names)
    if not api_key or api_key == "YOUR_API_KEY_HERE":
        return snapshot

    result = snapshot
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
            result[name] = {**result.get(name, {}), **hospital_data}
            if row.get("ykiho"):
                ykiho_by_name[name] = row["ykiho"]

        semaphore = asyncio.Semaphore(MAX_CONCURRENCY)
        tasks = [
            asyncio.create_task(_fetch_equipment(client, semaphore, api_key, name, ykiho))
            for name, ykiho in ykiho_by_name.items()
            if "equipment_status" not in result.get(name, {})
        ]
        if tasks:
            done, pending = await asyncio.wait(tasks, timeout=EQUIPMENT_BUDGET_SEC)
            for task in pending:
                task.cancel()
            for task in done:
                name, equipment_result = task.result()
                result[name] = {**result.get(name, {}), **equipment_result}

    return result


def merge_hira_into_hospitals(
    hospitals: list[dict[str, Any]],
    hira_by_name: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    return [dict(hospital, **hira_by_name.get(str(hospital.get("name", "")), {})) for hospital in hospitals]
