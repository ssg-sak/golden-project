#!/usr/bin/env python3
"""심평원 2026.3 원본 ZIP에서 대구 의료인력·장비 대체 자료를 생성한다."""
from __future__ import annotations

import argparse
import io
import zipfile
from pathlib import Path

import pandas as pd


def read_member(archive: zipfile.ZipFile, marker: str) -> pd.DataFrame:
    members = [name for name in archive.namelist() if marker in Path(name).name and name.endswith(".xlsx")]
    if len(members) != 1:
        raise ValueError(f"{marker} 파일을 하나로 확정할 수 없습니다: {members}")
    return pd.read_excel(io.BytesIO(archive.read(members[0])), sheet_name=0, dtype=str).fillna("")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--medical-zip", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=Path("data/processed/daegu_hira_infrastructure.csv"))
    args = parser.parse_args()

    with zipfile.ZipFile(args.medical_zip) as archive:
        hospitals = read_member(archive, "1.병원정보")
        equipment = read_member(archive, "05_의료장비정보")

    daegu = hospitals[hospitals["시도코드명"].isin(["대구", "대구광역시"])].copy()
    equipment = equipment[equipment["암호화요양기호"].isin(set(daegu["암호화요양기호"]))].copy()
    equipment["장비대수"] = pd.to_numeric(equipment["장비대수"], errors="coerce").fillna(0)
    core = equipment[equipment["장비코드명"].isin(["CT", "MRI"])].pivot_table(
        index="암호화요양기호", columns="장비코드명", values="장비대수", aggfunc="sum", fill_value=0
    )
    core.columns = [f"{name}보유대수" for name in core.columns]
    core = core.reset_index()

    columns = ["암호화요양기호", "요양기관명", "총의사수", "의과전문의 인원수"]
    result = daegu[columns].merge(core, on="암호화요양기호", how="left").fillna(0)
    for column in ["CT보유대수", "MRI보유대수"]:
        if column not in result:
            result[column] = 0
    args.output.parent.mkdir(parents=True, exist_ok=True)
    result.to_csv(args.output, index=False, encoding="utf-8-sig", lineterminator="\n")
    print(f"대구 의료기관 {len(result)}곳의 의료인력·핵심장비 대체 자료를 저장했습니다.")


if __name__ == "__main__":
    main()
