# -*- coding: utf-8 -*-
"""
대구광역시 응급의료기관 Open API 수집 → daegu_er_hospitals.json

API: 국립중앙의료원_전국 응급의료기관 정보 조회 서비스 (ErmctInfoInqireService)
  1) getEmrrmRltmUsefulSckbdInfoInqire — STAGE1/STAGE2 대구 응급기관 목록 (hpid)
  2) getEgytBassInfoInqire — (선택) hpid·dutyAddr 매칭. 기본 건너뜀(429 방지)
  3) er_hospital_coord_supplement.json — 좌표·tier 보강

  Bass API 사용: USE_BASS_API=1 python backend/scripts/04_fetch_daegu_er_hospitals.py

사용법:
  API_KEY 변수 또는 .env DATA_GO_KR_API_KEY 설정 후
  python backend/scripts/04_fetch_daegu_er_hospitals.py
"""

from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path
from typing import Any
from xml.etree import ElementTree as ET

import pandas as pd
import requests

try:
    import xmltodict
except ImportError:  # pragma: no cover
    xmltodict = None  # type: ignore[assignment]

from data_paths import (
    DAEGU_ER_HOSPITALS_JSON,
    ER_HOSPITAL_COORD_SUPPLEMENT_JSON,
    sync_to_frontend_assets,
)

# ── API 설정 (키는 직접 입력 가능) ───────────────────────────────────────────
API_KEY = "YOUR_API_KEY_HERE"

BASE_URL = "https://apis.data.go.kr/B552657/ErmctInfoInqireService"
BED_OPERATION = "getEmrrmRltmUsefulSckbdInfoInqire"
BASS_OPERATION = "getEgytBassInfoInqire"

REGION_STAGE1 = "대구광역시"
DAEGU_SIGUNGU = [
    "중구", "동구", "서구", "남구", "북구",
    "수성구", "달서구", "달성군", "군위군",
]

NUM_OF_ROWS_BED = 100
NUM_OF_ROWS_BASS = 2000
REQUEST_TIMEOUT = 30
BED_SLEEP_SEC = 0.25
BASS_SLEEP_SEC = 1.2
MAX_RETRIES = 6
RETRY_BACKOFF_SEC = 5.0

OUTPUT = DAEGU_ER_HOSPITALS_JSON
ENV_FILE = Path(__file__).resolve().parents[2] / ".env"

TIER1_KEYWORDS = ("권역응급", "전문응급", "권역응급의료센터", "전문응급의료센터")
TIER2_KEYWORDS = ("지역응급", "지역응급의료기관", "지역응급의료센터")

# API 병원명 → 표시용 정규 이름 (중복 제거)
CANONICAL_DISPLAY_NAMES: dict[str, str] = {
    "계명대학교대구동산병원": "계명대학교 동산병원",
    "계명대학교동산병원": "계명대학교 동산병원",
    "의료법인구의료재단구병원": "구병원",
    "(재)미리내천주성삼성직수도회천주성삼병원": "천주성삼병원",
    "한국보훈복지의료공단대구보훈병원": "대구보훈병원",
    "대구가톨릭대학교칠곡가톨릭병원": "대구가톨릭대학교 칠곡가톨릭병원",
}


def _read_env_file(name: str) -> str | None:
    if not ENV_FILE.exists():
        return None
    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, _, value = stripped.partition("=")
        if key.strip() == name:
            return value.strip().strip('"').strip("'")
    return None


def resolve_api_key() -> str:
    key = (
        os.environ.get("DATA_GO_KR_API_KEY")
        or _read_env_file("DATA_GO_KR_API_KEY")
        or API_KEY
    ).strip()
    if not key or key == "YOUR_API_KEY_HERE":
        print(
            "오류: API_KEY를 설정하세요.\n"
            "  - 스크립트 상단 API_KEY = '...'\n"
            "  - 또는 .env / 환경변수 DATA_GO_KR_API_KEY",
            file=sys.stderr,
        )
        sys.exit(1)
    return key


def _get_with_retry(url: str, params: dict[str, str]) -> str:
    for attempt in range(1, MAX_RETRIES + 1):
        response = requests.get(url, params=params, timeout=REQUEST_TIMEOUT)
        if response.status_code == 429:
            wait = RETRY_BACKOFF_SEC * attempt
            print(f"  429 — {wait:.0f}초 후 재시도 ({attempt}/{MAX_RETRIES})")
            time.sleep(wait)
            continue
        response.raise_for_status()
        return response.text
    raise RuntimeError("API 요청 한도 초과(429). 잠시 후 다시 실행하세요.")


def parse_xml_items(xml_text: str) -> tuple[list[dict[str, Any]], int]:
    if xmltodict is not None:
        parsed = xmltodict.parse(xml_text)
        body = parsed.get("response", {}).get("body", {})
        total = int(body.get("totalCount") or 0)
        items_node = body.get("items")
        if not items_node:
            return [], total
        item = items_node.get("item")
        if item is None:
            return [], total
        if isinstance(item, dict):
            return [item], total
        return list(item), total

    root = ET.fromstring(xml_text)
    body = root.find("body")
    if body is None:
        return [], 0
    total_el = body.find("totalCount")
    total = int(total_el.text or 0) if total_el is not None else 0
    items_el = body.find("items")
    if items_el is None:
        return [], total

    rows: list[dict[str, Any]] = []
    for item_el in items_el.findall("item"):
        row: dict[str, Any] = {}
        for child in item_el:
            if child.tag and child.text is not None:
                row[child.tag] = child.text
        rows.append(row)
    return rows, total


def pick_field(row: dict[str, Any], *keys: str) -> str:
    lowered = {str(k).lower(): v for k, v in row.items()}
    for key in keys:
        val = row.get(key)
        if val is not None and str(val).strip():
            return str(val).strip()
        val = lowered.get(key.lower())
        if val is not None and str(val).strip():
            return str(val).strip()
    return ""


def display_name(api_name: str) -> str:
    return CANONICAL_DISPLAY_NAMES.get(api_name, api_name)


def is_daegu_address(addr: str) -> bool:
    return REGION_STAGE1 in addr


def classify_tier(duty_div_nam: str, duty_emcls_name: str) -> int | None:
    text = f"{duty_emcls_name} {duty_div_nam}".strip()
    if not text:
        return None
    if any(kw in text for kw in TIER1_KEYWORDS):
        return 1
    if any(kw in text for kw in TIER2_KEYWORDS):
        return 2
    return None


def fetch_daegu_er_hpids(service_key: str) -> dict[str, str]:
    """[1단계] STAGE1=대구광역시 + 시군구별 응급기관 hpid 수집."""
    hpids: dict[str, str] = {}
    url = f"{BASE_URL}/{BED_OPERATION}"

    for sgg in DAEGU_SIGUNGU:
        params = {
            "serviceKey": service_key,
            "STAGE1": REGION_STAGE1,
            "STAGE2": sgg,
            "pageNo": "1",
            "numOfRows": str(NUM_OF_ROWS_BED),
        }
        xml_text = _get_with_retry(url, params)
        items, total = parse_xml_items(xml_text)
        for row in items:
            hpid = pick_field(row, "hpid")
            name = pick_field(row, "dutyName", "dutyname")
            if hpid and name:
                hpids[hpid] = name
        print(f"  {sgg}: {total}건 → 누적 {len(hpids)}곳")
        time.sleep(BED_SLEEP_SEC)

    return hpids


def enrich_from_bass(
    service_key: str, target_hpids: dict[str, str]
) -> dict[str, dict[str, Any]]:
    """[2단계] getEgytBassInfoInqire — hpid 매칭 + dutyAddr 대구 검증."""
    remaining = set(target_hpids)
    matched: dict[str, dict[str, Any]] = {}
    page_no = 1
    total_count: int | None = None
    url = f"{BASE_URL}/{BASS_OPERATION}"

    while remaining:
        params = {
            "serviceKey": service_key,
            "pageNo": str(page_no),
            "numOfRows": str(NUM_OF_ROWS_BASS),
        }
        try:
            xml_text = _get_with_retry(url, params)
        except RuntimeError:
            print("  Bass API 한도 초과 — supplement로 이어갑니다.")
            break

        items, total = parse_xml_items(xml_text)
        if total_count is None:
            total_count = total
            max_page = max(1, (total + NUM_OF_ROWS_BASS - 1) // NUM_OF_ROWS_BASS)
            print(f"  전국 {total_count:,}건, 최대 {max_page}페이지 스캔")

        if not items:
            break

        for row in items:
            hpid = pick_field(row, "hpid")
            if hpid not in remaining:
                continue

            duty_addr = pick_field(row, "dutyAddr", "dutyaddr")
            if not is_daegu_address(duty_addr):
                continue

            lat_raw = pick_field(row, "wgs84Lat", "wgs84lat")
            lng_raw = pick_field(row, "wgs84Lon", "wgs84lon")
            if not lat_raw or not lng_raw:
                continue

            api_name = pick_field(row, "dutyName", "dutyname") or target_hpids[hpid]
            duty_div = pick_field(row, "dutyDivNam", "dutydivnam")
            duty_emcls = pick_field(row, "dutyEmclsName", "dutyemclsname")
            tier = classify_tier(duty_div, duty_emcls)
            if tier is None:
                continue

            matched[hpid] = {
                "dutyName": display_name(api_name),
                "dutyAddr": duty_addr,
                "wgs84Lat": float(lat_raw),
                "wgs84Lon": float(lng_raw),
                "dutyDivNam": duty_div or duty_emcls,
                "dutyEmclsName": duty_emcls,
                "tier": tier,
                "source": "api",
            }
            remaining.discard(hpid)

        print(f"  p.{page_no}: {len(matched)}/{len(target_hpids)} 매칭")
        if page_no * NUM_OF_ROWS_BASS >= (total_count or 0):
            break
        page_no += 1
        time.sleep(BASS_SLEEP_SEC)

    return matched


def load_supplement_lookup() -> dict[str, dict[str, Any]]:
    lookup: dict[str, dict[str, Any]] = {}
    if not ER_HOSPITAL_COORD_SUPPLEMENT_JSON.exists():
        return lookup
    for entry in json.loads(
        ER_HOSPITAL_COORD_SUPPLEMENT_JSON.read_text(encoding="utf-8")
    ):
        for alias in entry.get("matchNames", [entry.get("name", "")]):
            lookup[alias] = entry
    return lookup


def enrich_from_supplement(
    target_hpids: dict[str, str],
    existing: dict[str, dict[str, Any]],
    supplement: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    """[3단계] Bass 미매칭 병원 — supplement 좌표 보강."""
    extra: list[dict[str, Any]] = []
    matched_hpids = set(existing)

    for hpid, api_name in target_hpids.items():
        if hpid in matched_hpids:
            continue
        entry = supplement.get(api_name)
        if not entry:
            print(f"  supplement 없음: {api_name}", file=sys.stderr)
            continue
        extra.append(
            {
                "dutyName": entry["name"],
                "dutyAddr": entry["address"],
                "wgs84Lat": float(entry["lat"]),
                "wgs84Lon": float(entry["lng"]),
                "dutyDivNam": "supplement",
                "dutyEmclsName": "",
                "tier": int(entry["tier"]),
                "source": "supplement",
            }
        )

    return extra


def dedupe_records(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """표시 이름 기준 중복 제거 — API 출처 우선."""
    by_name: dict[str, dict[str, Any]] = {}
    for rec in records:
        name = rec["dutyName"]
        prev = by_name.get(name)
        if prev is None:
            by_name[name] = rec
            continue
        if prev.get("source") != "api" and rec.get("source") == "api":
            by_name[name] = rec
    return list(by_name.values())


def records_to_dataframe(records: list[dict[str, Any]]) -> pd.DataFrame:
    if not records:
        return pd.DataFrame(
            columns=[
                "dutyName", "dutyAddr", "wgs84Lat", "wgs84Lon",
                "dutyDivNam", "dutyEmclsName", "tier",
            ]
        )
    df = pd.DataFrame(records)
    return df.sort_values(["tier", "dutyName"]).reset_index(drop=True)


def should_use_bass_api() -> bool:
    return os.environ.get("USE_BASS_API", "").strip().lower() in {"1", "true", "yes"}


def fetch_daegu_er_hospitals(service_key: str) -> pd.DataFrame:
    print("[1/2] 대구 응급기관 목록 (STAGE1=대구광역시)")
    target_hpids = fetch_daegu_er_hpids(service_key)
    print(f"      → {len(target_hpids)}곳")

    bass_matched: dict[str, dict[str, Any]] = {}
    if should_use_bass_api():
        print("[2/2] 좌표·분류 (getEgytBassInfoInqire)")
        bass_matched = enrich_from_bass(service_key, target_hpids)
    else:
        print("[2/2] Bass API 건너뜀 (429 방지) — supplement 좌표 사용")

    supplement = load_supplement_lookup()
    records = list(bass_matched.values())
    records.extend(enrich_from_supplement(target_hpids, bass_matched, supplement))
    records = dedupe_records(records)

    return records_to_dataframe(records)


def to_frontend_json(df: pd.DataFrame) -> list[dict[str, Any]]:
    return [
        {
            "name": row["dutyName"],
            "lat": round(float(row["wgs84Lat"]), 7),
            "lng": round(float(row["wgs84Lon"]), 7),
            "tier": int(row["tier"]),
            "address": row["dutyAddr"],
        }
        for _, row in df.iterrows()
    ]


def main() -> None:
    service_key = resolve_api_key()
    print(f"수집 시작 — {REGION_STAGE1}")
    df = fetch_daegu_er_hospitals(service_key)

    if df.empty:
        print("경고: 결과 없음", file=sys.stderr)
        sys.exit(2)

    api_n = int((df.get("source", pd.Series()) == "api").sum()) if "source" in df else 0
    print(f"\n가공 완료: {len(df)}곳 (API {api_n}, supplement {len(df) - api_n})")
    print(df.groupby("tier").size().to_string())
    cols = ["dutyName", "dutyDivNam", "tier"]
    if "source" in df.columns:
        cols.append("source")
    print("\n", df[cols].to_string(index=False))

    payload = to_frontend_json(df)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    synced = sync_to_frontend_assets(OUTPUT)
    print(f"\n저장: {OUTPUT}")
    print(f"동기화: {synced}")
    print("\n다음: python backend/scripts/05_merge_final_hospitals.py  (Tier 3 병합 → final_hospitals.json)")


if __name__ == "__main__":
    main()
