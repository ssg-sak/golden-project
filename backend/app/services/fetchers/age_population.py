# -*- coding: utf-8 -*-
from __future__ import annotations

import csv
import hashlib
import io
import json
import re
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable

import httpx


MOIS_AGE_PAGE_URL = "https://jumin.mois.go.kr/ageStatMonth.do"
MOIS_AGE_CSV_URL = "https://jumin.mois.go.kr/downloadCsvAge.do"
DAEGU_SIDO_CODE = "2700000000"
DAEGU_SGG_CODES = (
    "2711000000",
    "2714000000",
    "2717000000",
    "2720000000",
    "2723000000",
    "2726000000",
    "2729000000",
    "2771000000",
    "2772000000",
)
DAEGU_ADMIN_SUBUNIT_PARENTS = {
    "2771025400": "2771025300",  # 논공읍공단출장소 -> 논공읍
    "2771025700": "2771025600",  # 다사읍서재출장소 -> 다사읍
}
EXPECTED_DAEGU_ADMIN_DONG_COUNT = 150
REGION_PATTERN = re.compile(r"^(.*?)\s*\((\d{10})\)\s*$")


class AgePopulationNotPublished(RuntimeError):
    """요청한 기준월의 공식 연령별 인구가 아직 공표되지 않은 상태."""


class AgePopulationValidationError(RuntimeError):
    """공식 응답의 구조나 값이 분석 계약을 만족하지 않는 상태."""


@dataclass(frozen=True)
class AgePopulationRecord:
    admin_dong_code: str
    admin_dong_name: str
    total_population: int
    senior_population: int
    pediatric_population: int


@dataclass(frozen=True)
class AgePopulationDataset:
    source_month: str
    records: tuple[AgePopulationRecord, ...]
    official_csv: bytes


def _decode_official_csv(content: bytes) -> str:
    for encoding in ("utf-8-sig", "cp949"):
        try:
            decoded = content.decode(encoding)
        except UnicodeDecodeError:
            continue
        if "행정구역" in decoded:
            return decoded
    raise AgePopulationValidationError("공식 연령별 CSV의 문자 인코딩을 확인할 수 없습니다.")


def _number(value: str | None) -> int:
    normalized = str(value or "").replace(",", "").strip()
    if not normalized:
        return 0
    try:
        number = int(normalized)
    except ValueError as exc:
        raise AgePopulationValidationError(f"인구 값이 숫자가 아닙니다: {value!r}") from exc
    if number < 0:
        raise AgePopulationValidationError("인구 값에 음수가 포함되어 있습니다.")
    return number


def _month_label(source_month: str) -> str:
    if not re.fullmatch(r"\d{6}", source_month):
        raise ValueError("source_month는 YYYYMM 형식이어야 합니다.")
    return f"{source_month[:4]}년{source_month[4:]}월"


def parse_official_age_csv(content: bytes, source_month: str) -> list[AgePopulationRecord]:
    decoded = _decode_official_csv(content)
    reader = csv.DictReader(io.StringIO(decoded))
    fieldnames = reader.fieldnames or []
    month_label = _month_label(source_month)
    expected_total_column = f"{month_label}_계_총인구수"
    age_columns = {age: f"{month_label}_계_{age}세" for age in range(100)}
    age_columns[100] = f"{month_label}_계_100세 이상"
    required_columns = {
        "행정구역",
        expected_total_column,
        *(age_columns.values()),
    }
    if not required_columns.issubset(fieldnames):
        if not any(field.startswith(month_label) for field in fieldnames):
            raise AgePopulationNotPublished(
                f"{source_month} 공식 연령별 인구가 아직 공표되지 않았습니다."
            )
        missing = sorted(required_columns - set(fieldnames))
        raise AgePopulationValidationError(
            "공식 연령별 CSV 필수 열이 누락됐습니다: " + ", ".join(missing[:5])
        )

    records: list[AgePopulationRecord] = []
    for row in reader:
        match = REGION_PATTERN.match(str(row.get("행정구역") or "").strip())
        if match is None:
            continue
        full_name, admin_code = match.groups()
        if not admin_code.startswith("27") or admin_code in {
            DAEGU_SIDO_CODE,
            *DAEGU_SGG_CODES,
        }:
            continue
        admin_name = full_name.removeprefix("대구광역시 ").strip()
        total_population = _number(row.get(expected_total_column))
        pediatric_population = sum(_number(row.get(age_columns[age])) for age in range(10))
        senior_population = sum(_number(row.get(age_columns[age])) for age in range(65, 101))
        records.append(
            AgePopulationRecord(
                admin_dong_code=admin_code,
                admin_dong_name=admin_name,
                total_population=total_population,
                senior_population=senior_population,
                pediatric_population=pediatric_population,
            )
        )
    return records


def normalize_age_records(
    records: Iterable[AgePopulationRecord],
    *,
    expected_count: int = EXPECTED_DAEGU_ADMIN_DONG_COUNT,
) -> tuple[AgePopulationRecord, ...]:
    source_records = list(records)
    source_names = {record.admin_dong_code: record.admin_dong_name for record in source_records}
    merged: dict[str, dict[str, int | str]] = {}
    seen_source_codes: set[str] = set()

    for record in source_records:
        if record.admin_dong_code in seen_source_codes:
            raise AgePopulationValidationError(
                f"공식 연령별 원천에 중복 행정동 코드가 있습니다: {record.admin_dong_code}"
            )
        seen_source_codes.add(record.admin_dong_code)
        target_code = DAEGU_ADMIN_SUBUNIT_PARENTS.get(
            record.admin_dong_code,
            record.admin_dong_code,
        )
        target_name = source_names.get(target_code, record.admin_dong_name)
        aggregate = merged.setdefault(
            target_code,
            {
                "admin_dong_name": target_name,
                "total_population": 0,
                "senior_population": 0,
                "pediatric_population": 0,
            },
        )
        aggregate["total_population"] = int(aggregate["total_population"]) + record.total_population
        aggregate["senior_population"] = int(aggregate["senior_population"]) + record.senior_population
        aggregate["pediatric_population"] = int(aggregate["pediatric_population"]) + record.pediatric_population

    normalized = tuple(
        AgePopulationRecord(
            admin_dong_code=code,
            admin_dong_name=str(values["admin_dong_name"]),
            total_population=int(values["total_population"]),
            senior_population=int(values["senior_population"]),
            pediatric_population=int(values["pediatric_population"]),
        )
        for code, values in sorted(merged.items())
    )
    total_population_sum = sum(record.total_population for record in normalized)
    vulnerable_population_sum = sum(
        record.senior_population + record.pediatric_population for record in normalized
    )
    if total_population_sum == 0 or vulnerable_population_sum == 0:
        raise AgePopulationNotPublished(
            "공식 화면에 기준월은 표시됐지만 연령별 값이 아직 채워지지 않았습니다."
        )
    if len(normalized) != expected_count:
        raise AgePopulationValidationError(
            f"대구 행정동 수가 {len(normalized)}개입니다. 예상값은 {expected_count}개입니다."
        )
    names = [record.admin_dong_name for record in normalized]
    if len(set(names)) != len(names):
        raise AgePopulationValidationError("정규화된 행정동 이름이 중복됩니다.")
    for record in normalized:
        if record.total_population <= 0:
            raise AgePopulationValidationError(
                f"총인구가 비어 있는 행정동이 있습니다: {record.admin_dong_name}"
            )
        vulnerable = record.senior_population + record.pediatric_population
        if vulnerable > record.total_population:
            raise AgePopulationValidationError(
                f"취약인구가 총인구보다 큽니다: {record.admin_dong_name}"
            )
    return normalized


def _request_body(source_month: str, sigungu_code: str) -> dict[str, str]:
    year, month = source_month[:4], source_month[4:]
    return {
        "sltOrgType": "2",
        "sltOrgLvl1": DAEGU_SIDO_CODE,
        "sltOrgLvl2": sigungu_code,
        "gender": "",
        "sum": "sum",
        "sltUndefType": "",
        "searchYearStart": year,
        "searchMonthStart": month,
        "searchYearEnd": year,
        "searchMonthEnd": month,
        "sltOrderType": "1",
        "sltOrderValue": "ASC",
        "sltArgTypes": "1",
        "sltArgTypeA": "0",
        "sltArgTypeB": "100",
        "category": "month",
    }


class AgePopulationClient:
    def __init__(self, *, timeout_seconds: float = 45.0) -> None:
        self.timeout_seconds = timeout_seconds

    async def fetch_month(self, source_month: str) -> AgePopulationDataset:
        parsed_records: list[AgePopulationRecord] = []
        official_parts: list[str] = []
        headers = {
            "User-Agent": "GoldenGovernanceDataPipeline/1.0",
            "Referer": MOIS_AGE_PAGE_URL,
        }
        timeout = httpx.Timeout(self.timeout_seconds)
        async with httpx.AsyncClient(headers=headers, timeout=timeout, follow_redirects=True) as client:
            landing = await client.get(MOIS_AGE_PAGE_URL)
            landing.raise_for_status()
            for sigungu_code in DAEGU_SGG_CODES:
                body = _request_body(source_month, sigungu_code)
                await client.post(MOIS_AGE_PAGE_URL, data=body)
                response = await client.post(
                    MOIS_AGE_CSV_URL,
                    params={"searchYearMonth": "month", "xlsStats": "1"},
                    data=body,
                )
                response.raise_for_status()
                parsed_records.extend(parse_official_age_csv(response.content, source_month))
                official_parts.append(_decode_official_csv(response.content))

        normalized = normalize_age_records(parsed_records)
        combined_lines: list[str] = []
        expected_header: str | None = None
        for part in official_parts:
            lines = part.splitlines()
            if not lines:
                continue
            if expected_header is None:
                expected_header = lines[0]
                combined_lines.append(expected_header)
            elif lines[0] != expected_header:
                raise AgePopulationValidationError(
                    "구·군별 공식 연령 CSV의 열 구성이 서로 다릅니다."
                )
            combined_lines.extend(line for line in lines[1:] if line.strip())
        official_csv = ("\n".join(combined_lines) + "\n").encode("utf-8-sig")
        return AgePopulationDataset(
            source_month=source_month,
            records=normalized,
            official_csv=official_csv,
        )


def _canonical_csv_bytes(records: Iterable[AgePopulationRecord]) -> bytes:
    buffer = io.StringIO(newline="")
    writer = csv.DictWriter(
        buffer,
        fieldnames=["동이름", "65세이상_인구", "0~9세_인구"],
        lineterminator="\n",
    )
    writer.writeheader()
    for record in records:
        writer.writerow(
            {
                "동이름": record.admin_dong_name,
                "65세이상_인구": record.senior_population,
                "0~9세_인구": record.pediatric_population,
            }
        )
    return buffer.getvalue().encode("utf-8-sig")


def canonical_age_population_sha256(records: Iterable[AgePopulationRecord]) -> str:
    return hashlib.sha256(_canonical_csv_bytes(records)).hexdigest()


def write_age_population_dataset(
    dataset: AgePopulationDataset,
    project_root: Path,
    *,
    verified_at: datetime,
) -> tuple[Path, Path, Path]:
    population_dir = project_root / "data" / "raw" / "population"
    population_dir.mkdir(parents=True, exist_ok=True)
    official_path = population_dir / f"mois_age_population_{dataset.source_month}.csv"
    canonical_path = population_dir / "daegu_population_real.csv"
    manifest_path = canonical_path.with_suffix(".manifest.json")
    canonical_content = _canonical_csv_bytes(dataset.records)

    official_path.write_bytes(dataset.official_csv)
    canonical_path.write_bytes(canonical_content)
    manifest = {
        "manifest_version": 2,
        "population_base_month": f"{dataset.source_month[:4]}.{dataset.source_month[4:]}",
        "district_count": len(dataset.records),
        "source_file": canonical_path.name,
        "source_sha256": hashlib.sha256(canonical_content).hexdigest(),
        "official_source": "행정안전부 주민등록 인구통계 행정동별 연령별 인구현황",
        "official_source_url": MOIS_AGE_PAGE_URL,
        "official_source_file": official_path.name,
        "official_source_sha256": hashlib.sha256(dataset.official_csv).hexdigest(),
        "verified_at": verified_at.isoformat(),
        "collection_date_status": "자동 수집 및 구조 검증 완료",
    }
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return official_path, canonical_path, manifest_path
