from __future__ import annotations

import csv
import importlib.util
import sys
from pathlib import Path

import pytest


SCRIPT_PATH = Path(__file__).resolve().parents[3] / "backend" / "scripts" / "07_parse_kosis_population.py"


def _load_parser_module():
    spec = importlib.util.spec_from_file_location("parse_kosis_population", SCRIPT_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError("KOSIS 인구 변환 모듈을 불러올 수 없습니다.")
    module = importlib.util.module_from_spec(spec)
    script_directory = str(SCRIPT_PATH.parent)
    sys.path.insert(0, script_directory)
    try:
        spec.loader.exec_module(module)
    finally:
        sys.path.remove(script_directory)
    return module


def _write_kosis_csv(path: Path, rows: list[list[str]]) -> None:
    with path.open("w", encoding="cp949", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerows(
            [
                ["통계표"],
                ["행정구역", "항목", "0~4세", "5~9세", "65~69세", "70세 이상"],
                *rows,
            ]
        )


def test_parse_kosis_csv_merges_outposts_into_parent_towns(tmp_path: Path) -> None:
    source = tmp_path / "population.csv"
    _write_kosis_csv(
        source,
        [
            ["달성군", "총인구수 (명)", ""],
            ["논공읍", "총인구수 (명)", "10", "20", "30", "40"],
            ["논공읍공단출장소", "총인구수 (명)", "1", "2", "3", "4"],
            ["다사읍", "총인구수 (명)", "100", "200", "300", "400"],
            ["다사읍서재출장소", "총인구수 (명)", "5", "6", "7", "8"],
        ],
    )

    records = _load_parser_module().parse_kosis_csv(source)

    assert records == [
        {"동이름": "달성군 논공읍", "65세이상_인구": 77, "0~9세_인구": 33},
        {"동이름": "달성군 다사읍", "65세이상_인구": 715, "0~9세_인구": 311},
    ]


def test_parse_kosis_csv_rejects_unknown_outpost(tmp_path: Path) -> None:
    source = tmp_path / "population.csv"
    _write_kosis_csv(
        source,
        [
            ["달성군", "총인구수 (명)", ""],
            ["새출장소", "총인구수 (명)", "1", "2", "3", "4"],
        ],
    )

    with pytest.raises(ValueError, match="부모 행정동"):
        _load_parser_module().parse_kosis_csv(source)
