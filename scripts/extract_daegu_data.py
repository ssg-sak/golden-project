#!/usr/bin/env python3
"""원본을 변경하지 않고 대구광역시 관련 공공데이터를 추출한다."""

from __future__ import annotations

import argparse
import csv
import hashlib
import io
import zipfile
from pathlib import Path

import pandas as pd


DAEGU_DISTRICTS = ["중구", "동구", "서구", "남구", "북구", "수성구", "달서구", "달성군", "군위군"]


def trim(value: object) -> str:
    if value is None or pd.isna(value):
        return ""
    return str(value).strip()


def trim_frame(frame: pd.DataFrame) -> pd.DataFrame:
    return frame.map(trim)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def read_excel_member(archive: zipfile.ZipFile, member: str) -> tuple[pd.DataFrame, list[str]]:
    payload = io.BytesIO(archive.read(member))
    excel = pd.ExcelFile(payload)
    sheet = next(name for name in excel.sheet_names if name != "Sheet1")
    frame = pd.read_excel(excel, sheet_name=sheet, dtype=str, keep_default_na=False)
    return trim_frame(frame), excel.sheet_names


def find_member(members: list[str], prefix: str) -> str:
    matches = [name for name in members if Path(name).name.startswith(prefix)]
    if len(matches) != 1:
        raise ValueError(f"ZIP 구성에서 {prefix!r} 파일을 하나로 확정할 수 없습니다: {matches}")
    return matches[0]


def extract_medical(source: Path, destination: Path) -> dict[str, object]:
    with zipfile.ZipFile(source) as archive:
        members = [item.filename for item in archive.infolist()]
        excel_members = [name for name in members if name.lower().endswith(".xlsx")]
        hospital_member = find_member(excel_members, "1.")
        pharmacy_member = find_member(excel_members, "2.")
        facility_member = find_member(excel_members, "3.")
        hospitals, hospital_sheets = read_excel_member(archive, hospital_member)
        pharmacies, pharmacy_sheets = read_excel_member(archive, pharmacy_member)
        facilities, facility_sheets = read_excel_member(archive, facility_member)

    filter_column = "시도코드명"
    if filter_column not in hospitals or filter_column not in pharmacies:
        raise KeyError(f"의료기관 필터 컬럼이 없습니다: {filter_column}")
    daegu_hospitals = hospitals[hospitals[filter_column].isin(["대구", "대구광역시"])].copy()
    daegu_pharmacies = pharmacies[pharmacies[filter_column].isin(["대구", "대구광역시"])].copy()

    identifier = "암호화요양기호"
    bed_columns = [column for column in facilities.columns if "병상수" in column]
    supplement_columns = [column for column in ["설립구분코드", "설립구분코드명"] if column in facilities]
    facility_subset = facilities[[identifier, *supplement_columns, *bed_columns]].drop_duplicates(identifier)
    daegu_hospitals = daegu_hospitals.merge(facility_subset, on=identifier, how="left", validate="one_to_one")

    all_columns = list(daegu_hospitals.columns)
    all_columns.extend(column for column in daegu_pharmacies.columns if column not in all_columns)
    combined = pd.concat(
        [daegu_hospitals.reindex(columns=all_columns), daegu_pharmacies.reindex(columns=all_columns)],
        ignore_index=True,
    ).fillna("")
    combined.to_csv(destination, index=False, encoding="utf-8-sig", lineterminator="\n")
    return {
        "zip_members": members,
        "source_rows": len(hospitals) + len(pharmacies),
        "hospital_rows": len(hospitals),
        "pharmacy_rows": len(pharmacies),
        "facility_rows": len(facilities),
        "output_rows": len(combined),
        "output_columns": len(combined.columns),
        "hospital_member": hospital_member,
        "pharmacy_member": pharmacy_member,
        "facility_member": facility_member,
        "sheets": {
            hospital_member: hospital_sheets,
            pharmacy_member: pharmacy_sheets,
            facility_member: facility_sheets,
        },
        "columns": list(combined.columns),
        "filter": "시도코드명 값이 '대구' 또는 '대구광역시'",
    }


def read_csv_rows(path: Path, encoding: str) -> list[list[str]]:
    with path.open("r", encoding=encoding, newline="") as handle:
        return [[cell.strip() for cell in row] for row in csv.reader(handle)]


def write_csv_rows(path: Path, rows: list[list[str]]) -> None:
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        csv.writer(handle, lineterminator="\n").writerows(rows)


def extract_population(source: Path, destination: Path) -> dict[str, object]:
    rows = read_csv_rows(source, "cp949")
    if len(rows) < 3 or rows[0][0] != "행정구역(시군구)별":
        raise ValueError("인구 CSV의 2행 헤더 구조가 예상과 다릅니다.")
    data_rows = rows[2:]
    allowed = {"대구광역시", *DAEGU_DISTRICTS}
    selected = [row for row in data_rows if row and row[0] in allowed]
    write_csv_rows(destination, [rows[0], rows[1], *selected])
    present = [name for name in DAEGU_DISTRICTS if any(row[0] == name for row in selected)]
    return {
        "source_rows": len(data_rows),
        "output_rows": len(selected),
        "output_columns": max(map(len, rows[:2])),
        "header_rows": 2,
        "columns": rows[:2],
        "filter": "행정구역(시군구)별 값이 '대구광역시' 또는 대구 9개 구·군 명칭과 일치",
        "present_districts": present,
        "missing_districts": [name for name in DAEGU_DISTRICTS if name not in present],
    }


def extract_admin(source: Path, destination: Path) -> dict[str, object]:
    rows = read_csv_rows(source, "cp949")
    header, data_rows = rows[0], rows[1:]
    try:
        top_code_index = header.index("최상위행정동코드")
        name_index = header.index("행정동명")
        code_index = header.index("행정동코드")
        parent_index = header.index("부모행정동코드")
    except ValueError as exc:
        raise ValueError(f"행정동 CSV 필수 컬럼이 없습니다: {exc}") from exc
    selected = [row for row in data_rows if len(row) > top_code_index and row[top_code_index] == "22"]
    write_csv_rows(destination, [header, *selected])
    district_codes = {
        row[code_index]: row[name_index]
        for row in selected
        if row[name_index] in DAEGU_DISTRICTS and row[parent_index] == row[code_index]
    }
    present = [name for name in DAEGU_DISTRICTS if name in district_codes.values()]
    return {
        "source_rows": len(data_rows),
        "output_rows": len(selected),
        "output_columns": len(header),
        "columns": header,
        "filter": "최상위행정동코드가 '22' (원본의 대구광역시 최상위 행에서 확인)",
        "present_districts": present,
        "missing_districts": [name for name in DAEGU_DISTRICTS if name not in present],
        "district_codes": district_codes,
    }


def make_report(paths: dict[str, Path], hashes: dict[str, str], results: dict[str, dict[str, object]]) -> str:
    medical, population, admin = results["medical"], results["population"], results["admin"]
    zip_lines = "\n".join(f"  - `{name}`" for name in medical["zip_members"])
    medical_columns = ", ".join(f"`{name}`" for name in medical["columns"])
    admin_columns = ", ".join(f"`{name}`" for name in admin["columns"])
    districts = ", ".join(population["present_districts"])
    return f"""# 대구광역시 원본 데이터 추출 보고서

## 처리 원칙

- 원본 3개 파일은 읽기 전용으로 사용했고 덮어쓰지 않았다.
- 모든 셀은 문자열로 읽어 앞뒤 공백만 제거했다.
- 결과 CSV는 한글 호환성을 위해 `UTF-8 with BOM`으로 저장했다.
- 원본 파일의 SHA-256을 처리 전후 비교해 불변을 확인했다.

## 원본 점검 결과

| 구분 | 원본 파일 | 형식/인코딩 | 원본 데이터 행 | 추출 행 | 결과 열 |
|---|---|---:|---:|---:|---:|
| 병·의원·약국 | `{paths['medical'].name}` | ZIP 내부 XLSX | {medical['source_rows']:,} | {medical['output_rows']:,} | {medical['output_columns']} |
| 인구 | `{paths['population'].name}` | CSV / CP949 / 2행 헤더 | {population['source_rows']:,} | {population['output_rows']:,} | {population['output_columns']} |
| 행정동 | `{paths['admin'].name}` | CSV / CP949 | {admin['source_rows']:,} | {admin['output_rows']:,} | {admin['output_columns']} |

원본 SHA-256:

- 병·의원·약국 ZIP: `{hashes['medical']}`
- 인구 CSV: `{hashes['population']}`
- 행정동 CSV: `{hashes['admin']}`

## ZIP 내부 파일 목록

{zip_lines}

사용 파일과 시트:

- 병·의원 기본정보: `{medical['hospital_member']}` / {medical['sheets'][medical['hospital_member']]}
- 약국 기본정보: `{medical['pharmacy_member']}` / {medical['sheets'][medical['pharmacy_member']]}
- 병상 보강용 시설정보: `{medical['facility_member']}` / {medical['sheets'][medical['facility_member']]}
- 병·의원 원본 {medical['hospital_rows']:,}행, 약국 원본 {medical['pharmacy_rows']:,}행, 시설정보 원본 {medical['facility_rows']:,}행이다.

## 필터 조건과 컬럼

### 병·의원·약국

- 조건: {medical['filter']}
- 병상 컬럼은 기본정보에 없어 시설정보를 `암호화요양기호`로 1:1 결합했다.
- 약국은 병상 정보가 적용되지 않으므로 해당 컬럼을 빈 값으로 유지했다.
- 결과 컬럼: {medical_columns}

### 시군구별 인구

- 조건: {population['filter']}
- 원본의 2행 헤더를 그대로 유지했다.
- 포함 구·군: {districts}
- 누락 구·군: {', '.join(population['missing_districts']) or '없음'}

### 행정동 정보

- 조건: {admin['filter']}
- 원본에는 `시도명`·`시군구명` 컬럼이 없고 코드 계층만 존재한다. 명칭 컬럼을 새로 만들지 않고 원본 9개 컬럼을 모두 유지했다.
- 결과 컬럼: {admin_columns}
- 누락 구·군: {', '.join(admin['missing_districts']) or '없음'}

## JOIN 후보

- 의료기관 ↔ 지역: `시군구코드`, `시군구코드명`, `읍면동`, `주소`
- 의료기관 기본 ↔ 시설 상세: `암호화요양기호`
- 인구 ↔ 지역: `행정구역(시군구)별`(명칭 JOIN)
- 행정동 계층: `행정동코드`, `부모행정동코드`, `최상위행정동코드`
- 주의: 의료기관의 심평원 `시군구코드`와 행정동 원본의 `행정동코드`는 코드 체계와 자릿수가 달라 직접 JOIN 전에 코드 사전 검증이 필요하다.

## 데이터 품질 및 오류·해결 기록

- 인구 CSV는 일반적인 단일 헤더가 아니라 2행 헤더다. 임의 병합하지 않고 두 행을 보존했다.
- 행정동 CSV는 시도·시군구·읍면동 명칭이 별도 열이 아니라 계층 행으로 섞여 있고, 같은 코드/명칭의 과거 개정 이력이 여러 행 존재한다. `배경여부`, `개정일자`, 연결·부모 코드 등 상태/이력 컬럼을 삭제하지 않았다.
- 행정동 원본에는 `시도명`이 없어 대구광역시 행의 `행정동코드`와 `최상위행정동코드`가 `22`임을 확인한 뒤 동일 최상위 코드로 추출했다.
- 병상 컬럼은 병·의원 기본정보가 아닌 시설정보에 있어 기관 식별값으로 결합했다. 약국에는 병상 값이 없다.
- 결과는 원본의 의미를 바꾸는 정규화, 명칭 치환, 결측치 보간을 하지 않았다.
"""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--medical-zip", type=Path, required=True)
    parser.add_argument("--population-csv", type=Path, required=True)
    parser.add_argument("--admin-csv", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, default=Path("data/processed"))
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    paths = {"medical": args.medical_zip, "population": args.population_csv, "admin": args.admin_csv}
    for path in paths.values():
        if not path.is_file():
            raise FileNotFoundError(path)
    hashes_before = {name: sha256(path) for name, path in paths.items()}
    args.output_dir.mkdir(parents=True, exist_ok=True)
    results = {
        "medical": extract_medical(paths["medical"], args.output_dir / "daegu_medical_facilities.csv"),
        "population": extract_population(paths["population"], args.output_dir / "daegu_population.csv"),
        "admin": extract_admin(paths["admin"], args.output_dir / "daegu_administrative_codes.csv"),
    }
    hashes_after = {name: sha256(path) for name, path in paths.items()}
    if hashes_before != hashes_after:
        raise RuntimeError("처리 중 원본 파일 해시가 변경되었습니다.")
    report = make_report(paths, hashes_before, results)
    (args.output_dir / "extraction_report.md").write_text(report, encoding="utf-8")
    for name, result in results.items():
        print(f"{name}: {result['output_rows']} rows, {result['output_columns']} columns")


if __name__ == "__main__":
    main()
