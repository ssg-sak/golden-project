# -*- coding: utf-8 -*-
"""
통계청(KOSIS) 5세별 주민등록인구 CSV → daegu_population.csv 변환.

입력: data/raw/population/kosis_dong_5yr_population_202606.csv (cp949)
출력: data/raw/population/daegu_population.csv
      컬럼: 동이름(시군구+동), 65세이상_인구, 0~9세_인구

사용법:
  python backend/scripts/07_parse_kosis_population.py
  python backend/scripts/07_parse_kosis_population.py path/to/kosis.csv
"""

from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path

from data_paths import (
    RAW_DAEGU_POPULATION_CSV,
    RAW_KOSIS_POPULATION_CSV,
    RAW_POPULATION_DIR,
    ensure_data_dirs,
)

AGE_0_4_IDX = 0
AGE_5_9_IDX = 1
AGE_65_START_IDX = 2
TOTAL_POP_LABEL = "총인구수 (명)"
SIDO_NAME = "대구광역시"
OUTPOST_PARENT_NAMES = {
    "논공읍공단출장소": "논공읍",
    "다사읍서재출장소": "다사읍",
}


def parse_int(value: str) -> int:
    return int(value.replace(",", "").strip() or "0")


def is_sgg_row(name: str) -> bool:
    return name.endswith("구") or name.endswith("군")


def parse_kosis_csv(source: Path) -> list[dict[str, int | str]]:
    with source.open(encoding="cp949", newline="") as handle:
        rows = list(csv.reader(handle))

    records_by_name: dict[str, dict[str, int | str]] = {}
    current_sgg: str | None = None

    for row in rows[2:]:
        if len(row) < 3:
            continue

        region_name = row[0].strip()
        metric = row[1].strip()

        if metric != TOTAL_POP_LABEL:
            continue
        if region_name == SIDO_NAME:
            continue
        if is_sgg_row(region_name):
            current_sgg = region_name
            continue
        if current_sgg is None:
            continue
        if "출장소" in region_name and region_name not in OUTPOST_PARENT_NAMES:
            raise ValueError(f"합산할 부모 행정동을 알 수 없는 출장소입니다: {region_name}")

        values = [parse_int(value) for value in row[2:]]
        age_0_9 = values[AGE_0_4_IDX] + values[AGE_5_9_IDX]
        age_65_plus = sum(values[AGE_65_START_IDX:])
        parent_region_name = OUTPOST_PARENT_NAMES.get(region_name, region_name)
        full_name = f"{current_sgg} {parent_region_name}"
        existing = records_by_name.get(full_name)
        if existing is None:
            records_by_name[full_name] = {
                "동이름": full_name,
                "65세이상_인구": age_65_plus,
                "0~9세_인구": age_0_9,
            }
            continue

        # 출장소는 별도 생활권이 아니라 부모 읍 통계에 합산해야 원본 총합이 보존된다.
        existing["65세이상_인구"] = int(existing["65세이상_인구"]) + age_65_plus
        existing["0~9세_인구"] = int(existing["0~9세_인구"]) + age_0_9

    return list(records_by_name.values())


def resolve_source(path: Path | None) -> Path:
    if path is not None:
        return path
    if RAW_KOSIS_POPULATION_CSV.exists():
        return RAW_KOSIS_POPULATION_CSV

    candidates = sorted(
        RAW_POPULATION_DIR.glob("*.csv"),
        key=lambda item: item.stat().st_mtime,
        reverse=True,
    )
    for candidate in candidates:
        if candidate.name == RAW_DAEGU_POPULATION_CSV.name:
            continue
        return candidate

    raise FileNotFoundError(
        "KOSIS 원본 CSV를 찾을 수 없습니다. "
        f"{RAW_KOSIS_POPULATION_CSV} 에 저장하거나 경로를 인자로 넘겨 주세요."
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="KOSIS 인구 CSV → daegu_population.csv")
    parser.add_argument(
        "source",
        nargs="?",
        type=Path,
        help="통계청 5세별 주민등록인구 CSV (미지정 시 data/raw/population/ 기본 경로)",
    )
    args = parser.parse_args()

    ensure_data_dirs()
    source = resolve_source(args.source)
    if not source.exists():
        print(f"[ERROR] 원본 없음: {source}", file=sys.stderr)
        return 1

    records = parse_kosis_csv(source)
    if not records:
        print("[ERROR] 파싱된 행정동이 없습니다.", file=sys.stderr)
        return 1

    RAW_DAEGU_POPULATION_CSV.parent.mkdir(parents=True, exist_ok=True)
    with RAW_DAEGU_POPULATION_CSV.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=["동이름", "65세이상_인구", "0~9세_인구"],
        )
        writer.writeheader()
        writer.writerows(records)

    print("=" * 60)
    print("07_parse_kosis_population.py")
    print(f"  원본: {source}")
    print(f"  출력: {RAW_DAEGU_POPULATION_CSV}")
    print(f"  행정동: {len(records)}개")
    print("=" * 60)
    return 0


if __name__ == "__main__":
    sys.exit(main())
