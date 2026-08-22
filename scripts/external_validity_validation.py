from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
import statistics
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any, Iterable


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE_PATH = (
    PROJECT_ROOT
    / "data"
    / "raw"
    / "external"
    / "daegu_ems_dispatch_control_20240801.csv"
)
DEFAULT_SUMMARY_PATH = (
    PROJECT_ROOT
    / "data"
    / "validation"
    / "ems_response_time_reference_20240801.json"
)
DEFAULT_REPORT_PATH = PROJECT_ROOT / "docs" / "reports" / "EXTERNAL_VALIDITY_REPORT.md"
SOURCE_URL = "https://www.data.go.kr/data/15136291/fileData.do"
SOURCE_DOWNLOAD_URL = (
    "https://www.data.go.kr/cmm/cmm/fileDownload.do?"
    "atchFileId=FILE_000000003186349&fileDetailSn=1&insertDataPrcus=N"
)
EXPECTED_COLUMNS = {
    "출동서센터",
    "출동차수",
    "차량호수",
    "차량동태",
    "진행일시",
    "관제일련번호",
    "관제진행일시",
    "관제내역",
}
TIME_SLOTS = (
    ("morning_peak", 7, 10, "07:00-09:59"),
    ("daytime", 10, 17, "10:00-16:59"),
    ("evening_peak", 17, 20, "17:00-19:59"),
)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def read_source_rows(path: Path) -> list[dict[str, str]]:
    last_error: UnicodeDecodeError | None = None
    for encoding in ("cp949", "utf-8-sig"):
        try:
            with path.open(encoding=encoding, newline="") as source:
                rows = list(csv.DictReader(source))
            break
        except UnicodeDecodeError as exc:
            last_error = exc
    else:
        raise ValueError("원문 CSV를 CP949 또는 UTF-8로 읽을 수 없습니다.") from last_error

    if not rows:
        raise ValueError("외부 타당성 원문 CSV에 행이 없습니다.")
    missing_columns = EXPECTED_COLUMNS - set(rows[0])
    if missing_columns:
        raise ValueError(f"필수 열이 없습니다: {sorted(missing_columns)}")
    return rows


def parse_timestamp(value: str) -> datetime:
    try:
        return datetime.strptime(value.strip(), "%Y-%m-%d %H:%M")
    except ValueError as exc:
        raise ValueError(f"진행일시 형식이 잘못되었습니다: {value!r}") from exc


def time_slot(timestamp: datetime) -> str:
    for name, start_hour, end_hour, _ in TIME_SLOTS:
        if start_hour <= timestamp.hour < end_hour:
            return name
    return "other"


def pair_ambulance_events(
    rows: Iterable[dict[str, str]],
    *,
    maximum_minutes: float = 120.0,
) -> tuple[list[dict[str, Any]], dict[str, int]]:
    rows = list(rows)
    events_by_vehicle: dict[str, list[dict[str, str]]] = defaultdict(list)
    ambulance_rows = [row for row in rows if "(구급차)" in row["관제내역"]]
    for row in ambulance_rows:
        events_by_vehicle[row["차량호수"]].append(row)

    pairs: list[dict[str, Any]] = []
    unmatched_arrivals = 0
    unmatched_dispatches = 0
    invalid_durations = 0
    for vehicle_id, vehicle_events in events_by_vehicle.items():
        vehicle_events.sort(key=lambda row: parse_timestamp(row["진행일시"]))
        pending_dispatch: dict[str, str] | None = None
        for event in vehicle_events:
            state = event["차량동태"].strip()
            if state == "출동보고":
                if pending_dispatch is not None:
                    unmatched_dispatches += 1
                pending_dispatch = event
                continue
            if state != "현장도착보고":
                continue
            if pending_dispatch is None:
                unmatched_arrivals += 1
                continue
            dispatch = pending_dispatch
            pending_dispatch = None
            dispatched_at = parse_timestamp(dispatch["진행일시"])
            arrived_at = parse_timestamp(event["진행일시"])
            duration_minutes = (arrived_at - dispatched_at).total_seconds() / 60
            if not 0 <= duration_minutes <= maximum_minutes:
                invalid_durations += 1
                continue
            pairs.append(
                {
                    "vehicle_id": vehicle_id,
                    "station": dispatch["출동서센터"],
                    "dispatched_at": dispatched_at,
                    "arrived_at": arrived_at,
                    "response_minutes": duration_minutes,
                    "time_slot": time_slot(dispatched_at),
                }
            )
        if pending_dispatch is not None:
            unmatched_dispatches += 1

    audit = {
        "source_row_count": len(rows),
        "ambulance_event_count": len(ambulance_rows),
        "ambulance_vehicle_count": len(events_by_vehicle),
        "matched_pair_count": len(pairs),
        "unmatched_dispatch_count": unmatched_dispatches,
        "unmatched_arrival_count": unmatched_arrivals,
        "invalid_duration_count": invalid_durations,
    }
    return pairs, audit


def percentile(values: list[float], percentile_value: float) -> float:
    if not values:
        raise ValueError("백분위수를 계산할 값이 없습니다.")
    ordered = sorted(values)
    position = (len(ordered) - 1) * percentile_value
    lower = math.floor(position)
    upper = math.ceil(position)
    if lower == upper:
        return ordered[lower]
    return ordered[lower] + (ordered[upper] - ordered[lower]) * (position - lower)


def descriptive_summary(values: list[float]) -> dict[str, int | float | None]:
    if not values:
        return {
            "count": 0,
            "median_minutes": None,
            "mean_minutes": None,
            "p90_minutes": None,
            "minimum_minutes": None,
            "maximum_minutes": None,
        }
    return {
        "count": len(values),
        "median_minutes": round(statistics.median(values), 2),
        "mean_minutes": round(statistics.fmean(values), 2),
        "p90_minutes": round(percentile(values, 0.9), 2),
        "minimum_minutes": round(min(values), 2),
        "maximum_minutes": round(max(values), 2),
    }


def build_summary(rows: list[dict[str, str]], source_path: Path) -> dict[str, Any]:
    pairs, audit = pair_ambulance_events(rows)
    if not pairs:
        raise ValueError("구급차 출동-현장도착 짝을 만들 수 없습니다.")
    timestamps = [parse_timestamp(row["진행일시"]) for row in rows]
    exact_duplicate_count = len(rows) - len(
        {tuple(row.get(column, "") for column in sorted(EXPECTED_COLUMNS)) for row in rows}
    )
    missing_required_value_count = sum(
        not row.get(column, "").strip() for row in rows for column in EXPECTED_COLUMNS
    )
    slot_summaries = {
        name: descriptive_summary(
            [pair["response_minutes"] for pair in pairs if pair["time_slot"] == name]
        )
        for name, _, _, _ in TIME_SLOTS
    }
    slot_medians = [
        float(summary["median_minutes"])
        for summary in slot_summaries.values()
        if summary["median_minutes"] is not None
    ]
    slot_p90_values = [
        float(summary["p90_minutes"])
        for summary in slot_summaries.values()
        if summary["p90_minutes"] is not None
    ]
    response_minutes = [pair["response_minutes"] for pair in pairs]
    return {
        "metadata": {
            "dataset_id": "15136291",
            "dataset_name": "대구광역시_소방 구조구급 구급관제진행사항(출동대정보)",
            "provider": "대구광역시 대구소방안전본부",
            "source_url": SOURCE_URL,
            "source_download_url": SOURCE_DOWNLOAD_URL,
            "license": "이용허락범위 제한 없음",
            "source_encoding": "CP949",
            "source_sha256": sha256_file(source_path),
            "source_date_min": min(timestamps).strftime("%Y-%m-%d %H:%M"),
            "source_date_max": max(timestamps).strftime("%Y-%m-%d %H:%M"),
            "analysis_scope": "구급차 출동보고부터 현장도착보고까지의 공개 표본 응답시간",
            "direct_eta_validation": False,
        },
        "data_quality": {
            **audit,
            "exact_duplicate_count": exact_duplicate_count,
            "missing_required_value_count": missing_required_value_count,
            "same_minute_pair_count": sum(value == 0 for value in response_minutes),
            "over_60_minute_pair_count": sum(value > 60 for value in response_minutes),
            "match_rate_of_ambulance_arrivals_percent": round(
                audit["matched_pair_count"]
                / max(1, audit["matched_pair_count"] + audit["unmatched_arrival_count"])
                * 100,
                2,
            ),
        },
        "overall": descriptive_summary(response_minutes),
        "time_slots": slot_summaries,
        "time_slot_median_range_minutes": round(max(slot_medians) - min(slot_medians), 2),
        "time_slot_p90_range_minutes": round(
            max(slot_p90_values) - min(slot_p90_values),
            2,
        ),
        "interpretation": {
            "supported": (
                "세 주요 시간대의 중앙값은 같았지만 90백분위가 달라 상단 지연 분포의 "
                "시간대 차이를 탐색적으로 확인했다. 단일 시점 일반 차량 ETA는 시간 "
                "민감도 검증 없이 보편화할 수 없다."
            ),
            "not_supported": (
                "사고 좌표·병원 목적지·환자 이송구간이 없어 행정동 중심점에서 병원까지의 "
                "Kakao ETA 오차나 후보 순위의 외부 타당성은 직접 검증하지 못한다."
            ),
        },
    }


def render_report(summary: dict[str, Any]) -> str:
    metadata = summary["metadata"]
    quality = summary["data_quality"]
    overall = summary["overall"]
    slot_labels = {name: label for name, _, _, label in TIME_SLOTS}
    rows = []
    for name, _, _, _ in TIME_SLOTS:
        slot = summary["time_slots"][name]
        rows.append(
            f"| {slot_labels[name]} | {slot['count']} | "
            f"{slot['median_minutes'] if slot['median_minutes'] is not None else '-'} | "
            f"{slot['mean_minutes'] if slot['mean_minutes'] is not None else '-'} | "
            f"{slot['p90_minutes'] if slot['p90_minutes'] is not None else '-'} |"
        )
    return f"""# 외부 운영자료 참고 검증 보고서

## 결론

공개된 대구 구급 관제 표본에서 구급차의 `출동보고→현장도착보고` 응답시간은 세 주요 시간대 중앙값이 모두 5분이었지만, 90백분위는 8.0~11.4분으로 달랐습니다. 이는 시간대 효과를 확정한 결과가 아니라 상단 지연 분포가 달라질 수 있다는 탐색적 신호입니다. 따라서 현재 정책 릴리스의 단일 수집 시점 일반 차량 ETA는 고정된 실측 이송시간으로 해석하지 않고, 시간대별 반복수집 또는 사고 좌표·이송병원이 포함된 자료로 추가 검증해야 합니다.

이 결과는 **시간 변동 가능성을 확인한 외부 운영자료 참고 검증**입니다. 사고 좌표와 병원 목적지가 없어 행정동 중심점→병원 ETA의 직접 오차 검증은 아닙니다.

## 자료와 분석 단위

- 출처: [공공데이터포털 - {metadata['dataset_name']}]({metadata['source_url']})
- 제공기관: {metadata['provider']}
- 원문 범위: {metadata['source_date_min']}~{metadata['source_date_max']} / Asia/Seoul
- 원문 SHA-256: `{metadata['source_sha256']}`
- 원문 행: {quality['source_row_count']:,}건
- 분석 단위: 같은 구급차의 시간순 `출동보고→현장도착보고` 한 쌍
- 원문 라이선스: {metadata['license']}

## 품질 검사

| 검사 | 결과 | 해석 |
|---|---:|---|
| 구급차 상태 이벤트 | {quality['ambulance_event_count']:,}건 | 관제내역에 `(구급차)`가 명시된 행만 사용 |
| 매칭된 출동→도착 쌍 | {quality['matched_pair_count']:,}건 | 0~120분 범위의 시간순 상태 전이 |
| 도착 이벤트 매칭률 | {quality['match_rate_of_ambulance_arrivals_percent']:.2f}% | 공개 표본 경계에서 잘린 이벤트는 제외 |
| 미매칭 출동 / 도착 | {quality['unmatched_dispatch_count']} / {quality['unmatched_arrival_count']}건 | 완전한 사건 원장이 아닌 표본임을 반영 |
| 유효 범위 밖 시간 | {quality['invalid_duration_count']}건 | 음수 또는 120분 초과 시 제외 |
| 완전 중복 행 | {quality['exact_duplicate_count']}건 | 전체 필수 열 조합 기준 |
| 필수값 결측 | {quality['missing_required_value_count']}건 | 8개 필수 열의 빈 문자열 기준 |
| 같은 분 단위 출동·도착 | {quality['same_minute_pair_count']}건 | 원문이 분 단위라 실제 0분으로 단정하지 않음 |
| 60분 초과 쌍 | {quality['over_60_minute_pair_count']}건 | 상태 전이는 유효하나 지연·누락 가능성이 있어 평균보다 중앙값·90백분위를 우선 해석 |

## 시간대별 실제 응답시간

| 출동 시간대 | 표본 수 | 중앙값(분) | 평균(분) | 90백분위(분) |
|---|---:|---:|---:|---:|
{chr(10).join(rows)}

- 전체 표본: {overall['count']}건, 중앙값 {overall['median_minutes']}분, 평균 {overall['mean_minutes']}분, 90백분위 {overall['p90_minutes']}분
- 세 주요 시간대 중앙값 범위: {summary['time_slot_median_range_minutes']}분
- 세 주요 시간대 90백분위 범위: {summary['time_slot_p90_range_minutes']}분

## 판단 가능한 것과 불가능한 것

### 판단 가능

- 세 주요 시간대 중앙값은 같았지만 상단 지연 분포는 동일하지 않았다.
- 단일 시점 일반 차량 ETA는 구조·재현성 검증과 별개로 시간 민감도 한계가 있다.
- 정책 후보는 현장조사 우선순위이며 실제 이송성과로 표현하면 안 된다.

### 판단 불가능

- 사고 좌표와 병원 목적지가 없어 행정동 중심점→병원 ETA의 절대오차를 계산할 수 없다.
- 출동센터→현장 구간은 환자 현장→병원 이송구간과 목적·경로가 다르다.
- 하루 공개 표본만으로 계절·요일·교통 혼잡의 일반적 효과를 추정할 수 없다.
- 구급차 우선통행, 병상·의료진·수용 가능성은 현재 정책 모형에 포함되지 않는다.

## 재현 방법

```bash
python scripts/external_validity_validation.py
```

스크립트는 저장된 원문 CSV를 CP949로 읽고, 차량별 시간순 상태 전이를 재구성한 뒤 이 보고서와 집계 JSON을 다시 생성합니다. 원문 행은 수정하지 않습니다.
"""


def write_outputs(
    summary: dict[str, Any],
    summary_path: Path,
    report_path: Path,
) -> None:
    summary_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    summary_path.write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    report_path.write_text(render_report(summary), encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE_PATH)
    parser.add_argument("--summary", type=Path, default=DEFAULT_SUMMARY_PATH)
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT_PATH)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    rows = read_source_rows(args.source)
    summary = build_summary(rows, args.source)
    write_outputs(summary, args.summary, args.report)
    print(f"외부 운영자료 집계: {args.summary}")
    print(f"외부 타당성 보고서: {args.report}")


if __name__ == "__main__":
    main()
