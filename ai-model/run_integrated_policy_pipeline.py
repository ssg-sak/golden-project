from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from build_actual_road_accessibility import (
    ANALYSIS_VERSION,
    MATRIX_PATH,
    OPTIMIZATION_PATH,
    load_inputs,
    read_json,
    validate_matrix_source,
    validate_release_inputs,
)


PROJECT_ROOT = Path(__file__).resolve().parents[1]
AI_MODEL_DIR = PROJECT_ROOT / "ai-model"
PROCESSED_HOSPITALS_PATH = PROJECT_ROOT / "data" / "processed" / "final_hospitals.json"
PUBLIC_HOSPITAL_OUTPUTS = [
    PROJECT_ROOT / "data" / "analysis" / "final_hospitals.json",
    PROJECT_ROOT / "frontend" / "src" / "data" / "final_hospitals.json",
    PROJECT_ROOT / "frontend" / "src" / "assets" / "final_hospitals.json",
]
ROLLBACK_OUTPUTS = [
    PROJECT_ROOT / "data" / "processed" / "candidate_sensitivity_analysis.json",
    PROJECT_ROOT / "docs" / "reports" / "candidate_sensitivity_analysis_report_20260715.md",
    PROJECT_ROOT / "data" / "processed" / "accessibility_candidate_trace.json",
    PROJECT_ROOT / "frontend" / "public" / "data" / "accessibility_candidate_trace.json",
    PROJECT_ROOT / "docs" / "reports" / "accessibility_candidate_trace_report_20260715.md",
    PROJECT_ROOT / "frontend" / "public" / "data" / "stable_policy_candidates.json",
    PROJECT_ROOT / "data" / "processed" / "actual_road_accessibility_matrix.json",
    PROJECT_ROOT / "frontend" / "public" / "data" / "actual_road_accessibility_matrix.json",
    PROJECT_ROOT / "data" / "processed" / "policy_location_optimization.json",
    PROJECT_ROOT / "frontend" / "public" / "data" / "policy_location_optimization.json",
    PROJECT_ROOT / "data" / "processed" / "daegu_vulnerability.geojson",
    PROJECT_ROOT / "data" / "analysis" / "daegu_vulnerability.geojson",
    PROJECT_ROOT / "frontend" / "src" / "data" / "daegu_vulnerability.geojson",
    PROJECT_ROOT / "frontend" / "src" / "assets" / "daegu_vulnerability.geojson",
    PROJECT_ROOT / "data" / "processed" / "stable_policy_candidates_overview_20260715.png",
    PROJECT_ROOT / "data" / "processed" / "policy_release.json",
    PROJECT_ROOT / "frontend" / "public" / "data" / "policy_release.json",
    *PUBLIC_HOSPITAL_OUTPUTS,
]


def run_step(label: str, script_name: str, *arguments: str) -> None:
    command = [sys.executable, str(AI_MODEL_DIR / script_name), *arguments]
    print(f"\n[{label}] {' '.join(command)}")
    environment = {
        **os.environ,
        "PYTHONIOENCODING": "utf-8",
        "PYTHONUTF8": "1",
        "LOKY_MAX_CPU_COUNT": str(os.cpu_count() or 1),
    }
    subprocess.run(command, cwd=PROJECT_ROOT, check=True, env=environment)


def backup_outputs(backup_dir: Path) -> dict[Path, Path | None]:
    backups: dict[Path, Path | None] = {}
    for index, output_path in enumerate(ROLLBACK_OUTPUTS):
        if not output_path.exists():
            backups[output_path] = None
            continue
        backup_path = backup_dir / f"{index:02d}-{output_path.name}"
        shutil.copy2(output_path, backup_path)
        backups[output_path] = backup_path
    return backups


def restore_outputs(backups: dict[Path, Path | None]) -> None:
    for output_path, backup_path in backups.items():
        if backup_path is None:
            if output_path.exists():
                output_path.unlink()
            continue
        output_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(backup_path, output_path)


def promote_validated_hospital_inputs() -> None:
    for output_path in PUBLIC_HOSPITAL_OUTPUTS:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(PROCESSED_HOSPITALS_PATH, output_path)


def validate_final_outputs() -> None:
    districts, hospitals, candidates = load_inputs()
    validate_release_inputs(districts, hospitals, candidates)
    matrix = read_json(MATRIX_PATH)
    validate_matrix_source(matrix, districts, hospitals, candidates)
    metadata = matrix["metadata"]
    expected_routes = len(districts) * (len(hospitals) + len(candidates))
    if metadata.get("version") != ANALYSIS_VERSION:
        raise RuntimeError("도로 경로 행렬의 분석 버전이 현재 릴리스와 다릅니다.")
    if int(metadata.get("requested_route_count", 0)) != expected_routes:
        raise RuntimeError("도로 경로 행렬의 요청 수가 현재 입력 구조와 다릅니다.")
    if int(metadata.get("successful_route_count", 0)) != expected_routes:
        raise RuntimeError("도로 경로 행렬에 성공하지 못한 경로가 남아 있습니다.")

    optimization = read_json(OPTIMIZATION_PATH)
    optimization_metadata = optimization.get("metadata", {})
    if optimization_metadata.get("version") != ANALYSIS_VERSION:
        raise RuntimeError("입지 최적화 결과의 분석 버전이 현재 릴리스와 다릅니다.")
    if optimization_metadata.get("matrix_source_sha256") != metadata.get("source_sha256"):
        raise RuntimeError("입지 최적화 결과가 현재 도로 경로 행렬에서 생성되지 않았습니다.")
    if optimization_metadata.get("matrix_route_result_sha256") != metadata.get(
        "route_result_sha256"
    ):
        raise RuntimeError("입지 최적화 결과의 도로 경로 결과 해시가 현재 행렬과 다릅니다.")

    trace = read_json(
        PROJECT_ROOT / "frontend" / "public" / "data" / "accessibility_candidate_trace.json"
    )
    if len(trace) != len(candidates):
        raise RuntimeError("정책 후보 정본과 후보 추적 데이터의 개수가 다릅니다.")
    candidate_keys = {
        (str(row["mode"]), int(row["candidate_id"]), round(float(row["lat"]), 7), round(float(row["lng"]), 7))
        for row in candidates
    }
    trace_keys = {
        (str(row["mode"]), int(row["id"]), round(float(row["lat"]), 7), round(float(row["lng"]), 7))
        for row in trace
    }
    if candidate_keys != trace_keys:
        raise RuntimeError("정책 후보 정본과 후보 추적 데이터의 ID 또는 좌표가 다릅니다.")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="K-Means 안정 후보부터 실제 도로망 입지 최적화까지 순서대로 실행합니다.",
    )
    parser.add_argument(
        "--offline",
        action="store_true",
        help="Kakao API를 호출하지 않고 기존 디스크 캐시만 사용합니다.",
    )
    parser.add_argument("--concurrency", type=int, default=5)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    districts, hospitals, candidates = load_inputs()
    validate_release_inputs(districts, hospitals, candidates)

    with tempfile.TemporaryDirectory(prefix="golden-policy-backup-") as temporary_dir:
        backups = backup_outputs(Path(temporary_dir))
        try:
            spatial_arguments = ["--offline"] if args.offline else []
            run_step(
                "1/7 행정동·인구·병원 공간 전처리",
                "../backend/scripts/spatial_analysis.py",
                *spatial_arguments,
            )
            run_step("2/7 후보 민감도 분석", "run_candidate_sensitivity_analysis.py")
            run_step("3/7 안정 후보 정본 생성", "build_stable_policy_candidates.py")
            run_step("4/7 후보 추적 데이터", "build_accessibility_candidate_trace.py")

            road_arguments = ["--cache-only"] if args.offline else ["--concurrency", str(max(1, args.concurrency))]
            run_step("5/7 실제 도로망 및 입지 최적화", "build_actual_road_accessibility.py", *road_arguments)
            run_step("6/7 최종 후보 시각화", "visualize_stable_policy_candidates.py")
            validate_final_outputs()
            promote_validated_hospital_inputs()
            run_step("7/7 단일 정책 릴리스 생성", "build_policy_release.py")
        except Exception:
            restore_outputs(backups)
            raise
    print("\n통합 정책 모델 파이프라인 완료")


if __name__ == "__main__":
    main()
