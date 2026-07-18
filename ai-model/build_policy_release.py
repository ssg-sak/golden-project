from __future__ import annotations

import hashlib
import json
import shutil
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[1]
VERSION = "2026-07-18-r2"
RELEASED_AT = "2026-07-18T00:00:00+09:00"

HOSPITALS_PATH = PROJECT_ROOT / "data" / "processed" / "final_hospitals.json"
VULNERABILITY_PATH = PROJECT_ROOT / "data" / "processed" / "daegu_vulnerability.geojson"
POPULATION_PATH = PROJECT_ROOT / "data" / "raw" / "population" / "daegu_population_real.csv"
POPULATION_MANIFEST_PATH = POPULATION_PATH.with_suffix(".manifest.json")
SENSITIVITY_PATH = PROJECT_ROOT / "data" / "processed" / "candidate_sensitivity_analysis.json"
MATRIX_PATH = PROJECT_ROOT / "data" / "processed" / "actual_road_accessibility_matrix.json"
OPTIMIZATION_PATH = PROJECT_ROOT / "data" / "processed" / "policy_location_optimization.json"
CANDIDATES_PATH = PROJECT_ROOT / "frontend" / "public" / "data" / "stable_policy_candidates.json"
TRACE_PATH = PROJECT_ROOT / "frontend" / "public" / "data" / "accessibility_candidate_trace.json"
PROCESSED_RELEASE_PATH = PROJECT_ROOT / "data" / "processed" / "policy_release.json"
PUBLIC_RELEASE_PATH = PROJECT_ROOT / "frontend" / "public" / "data" / "policy_release.json"


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = path.with_suffix(path.suffix + ".tmp")
    temporary_path.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    json.loads(temporary_path.read_text(encoding="utf-8"))
    try:
        temporary_path.replace(path)
    except PermissionError:
        shutil.copyfile(temporary_path, path)
        temporary_path.unlink()


def payload_hash(payload: Any) -> str:
    serialized = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def file_hash(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def candidate_identity(row: dict[str, Any]) -> tuple[str, int, float, float]:
    return (
        str(row.get("mode")),
        int(row.get("id")),
        round(float(row.get("lat")), 7),
        round(float(row.get("lng")), 7),
    )


def validate_release_parts(
    hospitals: list[dict[str, Any]],
    vulnerability: dict[str, Any],
    matrix: dict[str, Any],
    optimization: dict[str, Any],
    candidates: list[dict[str, Any]],
    trace: list[dict[str, Any]],
    population_manifest: dict[str, Any],
    sensitivity: list[dict[str, Any]],
) -> None:
    features = vulnerability.get("features", [])
    errors: list[str] = []
    if len(hospitals) != 25:
        errors.append(f"기관 {len(hospitals)}개")
    if len({str(row.get("name")) for row in hospitals}) != 25:
        errors.append("기관명 중복")
    if "계명대학교대구동산병원" not in {str(row.get("name")) for row in hospitals}:
        errors.append("계명대학교대구동산병원 누락")
    if len(features) != 150:
        errors.append(f"행정동 {len(features)}개")
    district_names = [str(row.get("properties", {}).get("adm_nm")) for row in features]
    if len(set(district_names)) != 150:
        errors.append("행정동명 중복")
    if any(float(row.get("lat", 0)) == 0 or float(row.get("lng", 0)) == 0 for row in hospitals):
        errors.append("기관 좌표 누락")
    if len(candidates) != 9 or len(trace) != 9:
        errors.append(
            f"후보 산출물 불일치 candidates={len(candidates)}, trace={len(trace)}"
        )
    elif {candidate_identity(row) for row in candidates} != {
        candidate_identity(row) for row in trace
    }:
        errors.append("후보 정본과 후보 추적의 mode/id/좌표 불일치")

    matrix_metadata = matrix.get("metadata", {})
    optimization_metadata = optimization.get("metadata", {})
    if matrix_metadata.get("version") != VERSION:
        errors.append("도로 행렬 버전 불일치")
    if optimization_metadata.get("version") != VERSION:
        errors.append("최적화 버전 불일치")
    if matrix_metadata.get("source_sha256") != optimization_metadata.get("matrix_source_sha256"):
        errors.append("도로 행렬·최적화 입력 해시 불일치")
    if matrix_metadata.get("route_result_sha256") != optimization_metadata.get(
        "matrix_route_result_sha256"
    ):
        errors.append("도로 행렬·최적화 경로 결과 해시 불일치")
    if int(matrix_metadata.get("resource_count", 0)) != 25:
        errors.append("도로 행렬 기관 수 불일치")
    if matrix_metadata.get("resource_count_by_mode") != {"pediatric": 6, "senior": 19}:
        errors.append("모드별 기관 수 불일치")
    if int(matrix_metadata.get("requested_route_count", 0)) != 5100:
        errors.append("요청 경로 수 불일치")
    if int(matrix_metadata.get("successful_route_count", 0)) != 5100:
        errors.append("성공 경로 수 불일치")
    if int(matrix_metadata.get("missing_route_count", 0)) != 0:
        errors.append("누락 경로 존재")
    route_provenance = matrix_metadata.get("route_provenance", {})
    coordinate_snap_audit = route_provenance.get("coordinate_snap_audit", {})
    snap_route_count = int(route_provenance.get("coordinate_snap_route_count", 0))
    if int(coordinate_snap_audit.get("route_count", -1)) != snap_route_count:
        errors.append("좌표 보정 경로 감사 개수 불일치")
    if len(coordinate_snap_audit.get("route_details", [])) != snap_route_count:
        errors.append("좌표 보정 경로 상세 목록 불일치")
    if float(coordinate_snap_audit.get("max_snap_distance_km", 0)) > float(
        coordinate_snap_audit.get("allowed_max_snap_distance_km", 0)
    ):
        errors.append("좌표 보정 거리 허용 한도 초과")
    if any(row.get("analysis_version") != VERSION for row in candidates):
        errors.append("후보 분석 버전 불일치")

    vulnerability_metadata = vulnerability.get("metadata", {})
    population_base_month = str(population_manifest.get("population_base_month") or "")
    population_source_hash = str(population_manifest.get("source_sha256") or "")
    if not population_base_month:
        errors.append("인구 manifest 기준월 누락")
    if int(population_manifest.get("district_count", 0)) != len(features):
        errors.append("인구 manifest 행정동 수 불일치")
    if str(population_manifest.get("source_file") or "") != POPULATION_PATH.name:
        errors.append("인구 manifest 원본 파일명 불일치")
    if not POPULATION_PATH.exists() or file_hash(POPULATION_PATH) != population_source_hash:
        errors.append("인구 원본 파일 해시 불일치")
    if vulnerability_metadata.get("population_base_month") != population_base_month:
        errors.append("취약성 산출물 인구 기준월 불일치")
    if vulnerability_metadata.get("population_source_sha256") != population_source_hash:
        errors.append("취약성 산출물 인구 원본 해시 불일치")

    sensitivity_by_mode = {
        str(row.get("mode")): row for row in sensitivity if isinstance(row, dict)
    }
    if set(sensitivity_by_mode) != {"pediatric", "senior"}:
        errors.append("민감도 분석 모드 불일치")
    for mode in ("pediatric", "senior"):
        result = sensitivity_by_mode.get(mode, {})
        if int(result.get("total_scenarios", 0)) != 240:
            errors.append(f"{mode} 민감도 조건 수 불일치")
        if int(result.get("completed_scenarios", 0)) != 240:
            errors.append(f"{mode} 민감도 완료 수 불일치")
    if errors:
        raise RuntimeError("정책 릴리스 검증 실패: " + "; ".join(errors))


def build_release() -> dict[str, Any]:
    hospitals = read_json(HOSPITALS_PATH)
    vulnerability = read_json(VULNERABILITY_PATH)
    matrix = read_json(MATRIX_PATH)
    optimization = read_json(OPTIMIZATION_PATH)
    candidates = read_json(CANDIDATES_PATH)
    trace = read_json(TRACE_PATH)
    population_manifest = read_json(POPULATION_MANIFEST_PATH)
    sensitivity = read_json(SENSITIVITY_PATH)
    validate_release_parts(
        hospitals,
        vulnerability,
        matrix,
        optimization,
        candidates,
        trace,
        population_manifest,
        sensitivity,
    )

    scores = [float(row["properties"]["vulnerability_index"]) for row in vulnerability["features"]]
    sorted_scores = sorted(scores, reverse=True)
    risk_threshold = sorted_scores[int(len(sorted_scores) * 0.25)]
    high_risk_count = sum(score >= risk_threshold for score in scores)
    matrix_metadata = matrix["metadata"]
    source_hash = str(matrix_metadata["source_sha256"])
    resource_count_by_mode = matrix_metadata["resource_count_by_mode"]
    population_base_month = str(population_manifest["population_base_month"])
    sensitivity_scenario_count = {
        str(row["mode"]): int(row["total_scenarios"]) for row in sensitivity
    }
    sensitivity_completed_count = {
        str(row["mode"]): int(row["completed_scenarios"]) for row in sensitivity
    }
    coordinate_snap_audit = matrix_metadata["route_provenance"]["coordinate_snap_audit"]

    return {
        "metadata": {
            "version": VERSION,
            "released_at": RELEASED_AT,
            "population_base_month": population_base_month,
            "population_source_sha256": str(population_manifest["source_sha256"]),
            "population_manifest_sha256": file_hash(POPULATION_MANIFEST_PATH),
            "district_count": len(vulnerability["features"]),
            "resource_count": len(hospitals),
            "resource_count_by_mode": resource_count_by_mode,
            "candidate_count": len(candidates),
            "risk_threshold": risk_threshold,
            "high_risk_district_count": high_risk_count,
            "route_count": int(matrix_metadata["requested_route_count"]),
            "successful_route_count": int(matrix_metadata["successful_route_count"]),
            "missing_route_count": int(matrix_metadata["missing_route_count"]),
            "source_sha256": source_hash,
            "route_result_sha256": str(matrix_metadata["route_result_sha256"]),
            "sensitivity_sha256": file_hash(SENSITIVITY_PATH),
            "sensitivity_scenario_count_per_mode": sensitivity_scenario_count,
            "sensitivity_completed_count_per_mode": sensitivity_completed_count,
            "coordinate_snap_route_count": int(coordinate_snap_audit["route_count"]),
            "coordinate_snap_average_distance_km": float(
                coordinate_snap_audit["average_snap_distance_km"]
            ),
            "coordinate_snap_max_distance_km": float(
                coordinate_snap_audit["max_snap_distance_km"]
            ),
            "content_sha256": {
                "hospitals": payload_hash(hospitals),
                "vulnerability": payload_hash(vulnerability),
                "candidates": payload_hash(candidates),
                "candidate_trace": payload_hash(trace),
                "sensitivity": payload_hash(sensitivity),
                "optimization": payload_hash(optimization),
            },
        },
        "hospitals": hospitals,
        "vulnerability": vulnerability,
        "candidates": candidates,
        "candidate_trace": trace,
        "optimization": optimization,
    }


def main() -> None:
    release = build_release()
    write_json(PROCESSED_RELEASE_PATH, release)
    write_json(PUBLIC_RELEASE_PATH, release)
    print(f"정책 릴리스 생성: {PUBLIC_RELEASE_PATH}")


if __name__ == "__main__":
    main()
