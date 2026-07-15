from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parents[1]

VULNERABILITY_INPUT = PROJECT_ROOT / "frontend" / "src" / "data" / "daegu_vulnerability.geojson"
HOSPITALS_INPUT = PROJECT_ROOT / "frontend" / "src" / "data" / "final_hospitals.json"
STABLE_CANDIDATES_INPUT = PROJECT_ROOT / "frontend" / "public" / "data" / "stable_policy_candidates.json"
TRACE_CANDIDATES_INPUT = PROJECT_ROOT / "frontend" / "public" / "data" / "accessibility_candidate_trace.json"

PROCESSED_VULNERABILITY_OUTPUT = PROJECT_ROOT / "data" / "processed" / "daegu_vulnerability.geojson"
FRONTEND_VULNERABILITY_OUTPUT = PROJECT_ROOT / "frontend" / "src" / "data" / "daegu_vulnerability.geojson"
MATRIX_OUTPUT = PROJECT_ROOT / "data" / "processed" / "travel_time_accessibility_matrix.json"
PUBLIC_MATRIX_OUTPUT = PROJECT_ROOT / "frontend" / "public" / "data" / "travel_time_accessibility_matrix.json"
STABLE_CANDIDATES_OUTPUT = PROJECT_ROOT / "frontend" / "public" / "data" / "stable_policy_candidates.json"
TRACE_CANDIDATES_OUTPUT = PROJECT_ROOT / "frontend" / "public" / "data" / "accessibility_candidate_trace.json"
REPORT_OUTPUT = PROJECT_ROOT / "docs" / "reports" / "travel_time_accessibility_model_report_20260715.md"

MOONLIGHT_NAMES = {
    "바른연합소아청소년과의원",
    "열린아동병원",
    "우리아이아동병원",
    "우리허브병원",
    "율하연합소아청소년과의원",
    "한영한마음아동병원",
}


def read_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    radius_km = 6371.0088
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lng2 - lng1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    return 2 * radius_km * math.asin(math.sqrt(a))


def road_factor(distance_km: float) -> float:
    if distance_km < 1:
        return 1.8
    if distance_km < 3:
        return 1.55
    if distance_km < 8:
        return 1.35
    if distance_km < 20:
        return 1.25
    return 1.18


def average_speed_kmh(distance_km: float) -> float:
    if distance_km < 3:
        return 24
    if distance_km < 8:
        return 32
    if distance_km < 20:
        return 42
    return 50


def estimated_drive(distance_km: float) -> tuple[float, float]:
    road_km = distance_km * road_factor(distance_km)
    base_delay_min = 3.5
    eta_min = base_delay_min + (road_km / average_speed_kmh(distance_km)) * 60
    return round(road_km, 3), round(eta_min, 2)


def prop_value(props: dict[str, Any], preferred: str, fallback_index: int, default: Any = 0) -> Any:
    if preferred in props:
        return props[preferred]
    keys = list(props.keys())
    if fallback_index < len(keys):
        return props.get(keys[fallback_index], default)
    return default


def district_record(feature: dict[str, Any]) -> dict[str, Any]:
    props = feature["properties"]
    return {
        "adm_nm": str(props.get("adm_nm", "")),
        "dong_name": str(prop_value(props, "동이름", 1, props.get("adm_nm", ""))),
        "center_lat": float(props.get("center_lat") or 0),
        "center_lng": float(props.get("center_lng") or 0),
        "vulnerable_population": int(float(prop_value(props, "취약인구", 4, 0) or 0)),
    }


def is_emergency_relevant(hospital: dict[str, Any]) -> bool:
    tier = int(hospital.get("tier") or 0)
    name = str(hospital.get("name") or "")
    return tier in {1, 2} or name in MOONLIGHT_NAMES or tier == 3


def nearest_by_eta(
    district: dict[str, Any],
    resources: list[dict[str, Any]],
) -> dict[str, Any]:
    best: dict[str, Any] | None = None
    for resource in resources:
        direct_km = haversine_km(
            district["center_lat"],
            district["center_lng"],
            float(resource["lat"]),
            float(resource["lng"]),
        )
        road_km, eta_min = estimated_drive(direct_km)
        row = {
            "resource_id": resource.get("id") or resource.get("name"),
            "resource_name": resource.get("name") or f"candidate-{resource.get('id')}",
            "direct_distance_km": round(direct_km, 3),
            "road_distance_km": road_km,
            "eta_minutes": eta_min,
            "tier": resource.get("tier"),
        }
        if best is None or eta_min < best["eta_minutes"]:
            best = row
    if best is None:
        return {
            "resource_id": None,
            "resource_name": None,
            "direct_distance_km": None,
            "road_distance_km": None,
            "eta_minutes": None,
            "tier": None,
        }
    return best


def normalize(values: list[float], value: float) -> float:
    min_value = min(values)
    max_value = max(values)
    if math.isclose(max_value, min_value):
        return 0.0
    return (value - min_value) / (max_value - min_value) * 100


def build_matrix(
    districts: list[dict[str, Any]],
    hospitals: list[dict[str, Any]],
    candidates: list[dict[str, Any]],
) -> dict[str, Any]:
    relevant_hospitals = [hospital for hospital in hospitals if is_emergency_relevant(hospital)]
    district_rows = []

    for district in districts:
        nearest = nearest_by_eta(district, relevant_hospitals)
        district_rows.append(
            {
                "adm_nm": district["adm_nm"],
                "dong_name": district["dong_name"],
                "center_lat": district["center_lat"],
                "center_lng": district["center_lng"],
                "vulnerable_population": district["vulnerable_population"],
                "nearest_emergency_resource": nearest,
            }
        )

    candidate_rows = []
    for candidate in candidates:
        candidate_resource = {
            "id": f"{candidate.get('mode')}-{candidate.get('id')}",
            "name": f"{candidate.get('mode')} candidate {candidate.get('id')}",
            "lat": candidate["lat"],
            "lng": candidate["lng"],
            "tier": "candidate",
        }
        rows = []
        for district, district_row in zip(districts, district_rows):
            before = district_row["nearest_emergency_resource"]["eta_minutes"]
            direct_km = haversine_km(
                district["center_lat"],
                district["center_lng"],
                float(candidate["lat"]),
                float(candidate["lng"]),
            )
            after_road_km, after_eta = estimated_drive(direct_km)
            gain = max(0.0, float(before) - after_eta)
            is_covered_15 = after_eta <= 15
            is_covered_30 = after_eta <= 30
            if gain > 0:
                rows.append(
                    {
                        "adm_nm": district["adm_nm"],
                        "before_eta_minutes": round(float(before), 2),
                        "after_eta_minutes": after_eta,
                        "gain_minutes": round(gain, 2),
                        "after_road_distance_km": after_road_km,
                        "vulnerable_population": district["vulnerable_population"],
                        "covered_15min": is_covered_15,
                        "covered_30min": is_covered_30,
                        "weighted_gain": gain * district["vulnerable_population"],
                    }
                )
        rows.sort(key=lambda item: item["weighted_gain"], reverse=True)
        candidate_rows.append(
            summarize_candidate_time(candidate, rows, candidate_resource, districts)
        )

    return {
        "metadata": {
            "version": "2026-07-15",
            "method": "deterministic_estimated_drive_time",
            "description": "Haversine distance adjusted by road circuity factor, average speed, and base delay. Kakao API is reserved for sample validation and live detail lookup.",
            "resource_count": len(relevant_hospitals),
            "district_count": len(districts),
            "candidate_count": len(candidates),
        },
        "districts": district_rows,
        "candidates": candidate_rows,
    }


def summarize_candidate_time(
    candidate: dict[str, Any],
    improved_rows: list[dict[str, Any]],
    candidate_resource: dict[str, Any],
    districts: list[dict[str, Any]],
) -> dict[str, Any]:
    population = sum(row["vulnerable_population"] for row in improved_rows)
    weighted_before = sum(row["before_eta_minutes"] * row["vulnerable_population"] for row in improved_rows)
    weighted_after = sum(row["after_eta_minutes"] * row["vulnerable_population"] for row in improved_rows)
    weighted_gain = sum(row["weighted_gain"] for row in improved_rows)

    before_avg = weighted_before / population if population else None
    after_avg = weighted_after / population if population else None
    gain_avg = weighted_gain / population if population else None

    covered_15_population = sum(row["vulnerable_population"] for row in improved_rows if row["covered_15min"])
    covered_30_population = sum(row["vulnerable_population"] for row in improved_rows if row["covered_30min"])
    total_population = sum(row["vulnerable_population"] for row in districts)

    p_median_score = weighted_after / population if population else None
    mclp_15_ratio = covered_15_population / total_population if total_population else 0
    mclp_30_ratio = covered_30_population / total_population if total_population else 0

    return {
        "id": candidate.get("id"),
        "mode": candidate.get("mode"),
        "candidate_resource_id": candidate_resource["id"],
        "before_avg_eta_minutes": round(before_avg, 2) if before_avg is not None else None,
        "after_avg_eta_minutes": round(after_avg, 2) if after_avg is not None else None,
        "accessibility_gain_minutes": round(gain_avg, 2) if gain_avg is not None else None,
        "p_median_weighted_eta_minutes": round(p_median_score, 2) if p_median_score is not None else None,
        "mclp_15min_population": covered_15_population,
        "mclp_15min_coverage_ratio": round(mclp_15_ratio, 4),
        "mclp_30min_population": covered_30_population,
        "mclp_30min_coverage_ratio": round(mclp_30_ratio, 4),
        "time_based_score": round((gain_avg or 0) * math.log1p(population) + mclp_30_ratio * 100, 3),
        "time_improved_district_count": len(improved_rows),
        "time_improved_population": population,
        "top_time_improved_districts": improved_rows[:8],
    }


def update_vulnerability_geojson(geojson: dict[str, Any], matrix: dict[str, Any]) -> dict[str, Any]:
    by_adm = {row["adm_nm"]: row for row in matrix["districts"]}
    raw_scores = []
    for feature in geojson["features"]:
        props = feature["properties"]
        adm_nm = str(props.get("adm_nm", ""))
        row = by_adm.get(adm_nm)
        if not row:
            raw_scores.append(0.0)
            continue
        eta = float(row["nearest_emergency_resource"]["eta_minutes"] or 0)
        pop = int(row["vulnerable_population"])
        raw_scores.append(math.log1p(eta) * pop)

    for feature, score in zip(geojson["features"], raw_scores):
        props = feature["properties"]
        adm_nm = str(props.get("adm_nm", ""))
        row = by_adm.get(adm_nm)
        props["distance_vdi_log"] = props.get("vdi_log", props.get("vulnerability_index", 0))
        props["distance_vulnerability_index"] = props.get("vulnerability_index", 0)
        props["travel_time_vulnerability_index"] = round(score, 2)
        props["travel_time_vdi_log"] = round(score, 2)
        props["travel_time_vdi_norm"] = round(normalize(raw_scores, score), 2)
        props["vulnerability_index"] = round(score, 2)
        props["vdi_log"] = round(score, 2)
        props["vdi_norm"] = round(normalize(raw_scores, score), 2)
        props["accessibility_metric"] = "estimated_drive_time"
        if row:
            nearest = row["nearest_emergency_resource"]
            props["travel_time_minutes"] = nearest["eta_minutes"]
            props["road_distance_km"] = nearest["road_distance_km"]
            props["direct_distance_km"] = nearest["direct_distance_km"]
            props["nearest_hospital_name"] = nearest["resource_name"]
            props["nearest_hospital_tier"] = nearest["tier"]
            props["min_dist_to_hospital"] = nearest["direct_distance_km"]
    return geojson


def merge_candidate_metrics(candidates: list[dict[str, Any]], matrix: dict[str, Any]) -> list[dict[str, Any]]:
    metrics = {
        (row["mode"], row["id"]): row
        for row in matrix["candidates"]
    }
    updated = []
    for candidate in candidates:
        metric = metrics.get((candidate.get("mode"), candidate.get("id")))
        if not metric:
            updated.append(candidate)
            continue
        merged = {
            **candidate,
            "accessibility_metric": "estimated_drive_time",
            "before_avg_eta_minutes": metric["before_avg_eta_minutes"],
            "after_avg_eta_minutes": metric["after_avg_eta_minutes"],
            "accessibility_gain_minutes": metric["accessibility_gain_minutes"],
            "p_median_weighted_eta_minutes": metric["p_median_weighted_eta_minutes"],
            "mclp_15min_population": metric["mclp_15min_population"],
            "mclp_15min_coverage_ratio": metric["mclp_15min_coverage_ratio"],
            "mclp_30min_population": metric["mclp_30min_population"],
            "mclp_30min_coverage_ratio": metric["mclp_30min_coverage_ratio"],
            "time_based_score": metric["time_based_score"],
            "time_improved_district_count": metric["time_improved_district_count"],
            "time_improved_population": metric["time_improved_population"],
            "top_time_improved_districts": metric["top_time_improved_districts"],
        }
        if metric["time_based_score"] is not None:
            merged["score"] = metric["time_based_score"]
        updated.append(merged)
    return updated


def build_report(matrix: dict[str, Any]) -> str:
    lines = [
        "# 교통망 기반 접근성 모델 구현 보고서",
        "- 작성일: 2026-07-15",
        "- 방식: 로컬 재현 가능한 추정 주행시간 행렬",
        "- 목적: 정책 화면 취약지 분석과 후보지 평가를 직선거리 중심에서 이동시간 중심으로 전환",
        "",
        "## 산출물",
        "",
        "| 산출물 | 설명 |",
        "|---|---|",
        "| `data/processed/travel_time_accessibility_matrix.json` | 행정동-응급기관, 행정동-후보지 이동시간 행렬 |",
        "| `data/processed/daegu_vulnerability.geojson` | 이동시간 기반 VDI로 갱신된 취약지 GeoJSON |",
        "| `frontend/public/data/stable_policy_candidates.json` | p-median/MCLP 이동시간 지표가 포함된 후보지 데이터 |",
        "",
        "## 후보지 이동시간 지표 요약",
        "",
        "| 모드 | 후보 | 평균 개선분 | p-median ETA | MCLP 15분 | MCLP 30분 | 점수 |",
        "|---|---:|---:|---:|---:|---:|---:|",
    ]
    for row in matrix["candidates"]:
        lines.append(
            "| {mode} | {id} | {gain}분 | {pmedian}분 | {m15}% | {m30}% | {score} |".format(
                mode=row["mode"],
                id=row["id"],
                gain=row["accessibility_gain_minutes"],
                pmedian=row["p_median_weighted_eta_minutes"],
                m15=round(row["mclp_15min_coverage_ratio"] * 100, 1),
                m30=round(row["mclp_30min_coverage_ratio"] * 100, 1),
                score=row["time_based_score"],
            )
        )
    lines.extend(
        [
            "",
            "## 재현성 처리",
            "",
            "- 대량 외부 API 호출 대신 결정론적 추정식을 사용했다.",
            "- 모든 행정동/후보지 조합의 결과를 JSON 행렬로 저장했다.",
            "- Kakao ETA는 상세 화면의 실시간 확인 및 향후 샘플 검증용으로 분리했다.",
            "",
            "## 한계",
            "",
            "- 실제 교통 체증, 신호, 구급차 우선 통행, 시간대별 속도는 반영하지 않는다.",
            "- 공식 정책 판단에는 실제 도로망 또는 공공/상용 라우팅 API 기반 검증이 추가로 필요하다.",
        ]
    )
    return "\n".join(lines) + "\n"


def main() -> None:
    geojson = read_json(VULNERABILITY_INPUT)
    districts = [district_record(feature) for feature in geojson["features"]]
    hospitals = read_json(HOSPITALS_INPUT)
    stable_candidates = read_json(STABLE_CANDIDATES_INPUT)
    trace_candidates = read_json(TRACE_CANDIDATES_INPUT) if TRACE_CANDIDATES_INPUT.exists() else []

    matrix = build_matrix(districts, hospitals, stable_candidates)
    updated_geojson = update_vulnerability_geojson(geojson, matrix)
    updated_stable = merge_candidate_metrics(stable_candidates, matrix)
    updated_trace = merge_candidate_metrics(trace_candidates, matrix) if trace_candidates else trace_candidates

    write_json(MATRIX_OUTPUT, matrix)
    write_json(PUBLIC_MATRIX_OUTPUT, matrix)
    write_json(PROCESSED_VULNERABILITY_OUTPUT, updated_geojson)
    write_json(FRONTEND_VULNERABILITY_OUTPUT, updated_geojson)
    write_json(STABLE_CANDIDATES_OUTPUT, updated_stable)
    if updated_trace:
        write_json(TRACE_CANDIDATES_OUTPUT, updated_trace)
    REPORT_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    REPORT_OUTPUT.write_text(build_report(matrix), encoding="utf-8")

    print(f"wrote {MATRIX_OUTPUT}")
    print(f"wrote {PROCESSED_VULNERABILITY_OUTPUT}")
    print(f"wrote {STABLE_CANDIDATES_OUTPUT}")


if __name__ == "__main__":
    main()
