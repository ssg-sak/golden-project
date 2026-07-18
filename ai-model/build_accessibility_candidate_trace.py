from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parents[1]

CANDIDATE_FILES = {
    "pediatric": PROJECT_ROOT / "frontend" / "public" / "data" / "optimal_locations_pediatric.json",
    "senior": PROJECT_ROOT / "frontend" / "public" / "data" / "optimal_locations_senior.json",
}
VULNERABILITY_GEOJSON = PROJECT_ROOT / "data" / "processed" / "daegu_vulnerability.geojson"
HOSPITALS_JSON = PROJECT_ROOT / "data" / "processed" / "final_hospitals.json"
OUTPUT_JSON = PROJECT_ROOT / "data" / "processed" / "accessibility_candidate_trace.json"
PUBLIC_OUTPUT_JSON = PROJECT_ROOT / "frontend" / "public" / "data" / "accessibility_candidate_trace.json"
OUTPUT_REPORT = PROJECT_ROOT / "docs" / "reports" / "accessibility_candidate_trace_report_20260715.md"


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    radius_km = 6371.0088
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lng2 - lng1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    return 2 * radius_km * math.asin(math.sqrt(a))


def read_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def district_name(properties: dict[str, Any]) -> str:
    full_name = str(properties.get("adm_nm", "")).replace("대구광역시 ", "").strip()
    return str(properties.get("동이름") or full_name)


def to_district_record(feature: dict[str, Any]) -> dict[str, Any]:
    properties = feature["properties"]
    return {
        "adm_nm": district_name(properties),
        "center_lat": float(properties.get("center_lat") or 0),
        "center_lng": float(properties.get("center_lng") or 0),
        "vulnerable_population": int(float(properties.get("취약인구") or 0)),
        "min_dist_to_hospital": float(properties.get("min_dist_to_hospital") or 0),
        "nearest_hospital_name": properties.get("nearest_hospital_name"),
        "vdi_log": float(properties.get("vdi_log") or properties.get("vulnerability_index") or 0),
    }


def nearest_hospital(candidate: dict[str, Any], hospitals: list[dict[str, Any]]) -> tuple[str | None, float | None]:
    nearest_name: str | None = None
    nearest_distance: float | None = None

    for hospital in hospitals:
        if "lat" not in hospital or "lng" not in hospital:
            continue
        distance = haversine_km(candidate["lat"], candidate["lng"], float(hospital["lat"]), float(hospital["lng"]))
        if nearest_distance is None or distance < nearest_distance:
            nearest_name = str(hospital.get("name") or "")
            nearest_distance = distance

    return nearest_name, nearest_distance


def candidate_group(candidate: dict[str, Any], covered_districts: list[dict[str, Any]]) -> str:
    has_gunwi = any(str(row["adm_nm"]).startswith("군위군") for row in covered_districts)
    if candidate["lat"] >= 36 or (has_gunwi and candidate.get("demand", 0) < 20):
        return "separate_region"
    if candidate.get("demand", 0) < 10:
        return "hold"
    return "main_daegu"


def summarize_candidate(
    mode: str,
    candidate: dict[str, Any],
    districts: list[dict[str, Any]],
    hospitals: list[dict[str, Any]],
) -> dict[str, Any]:
    improved: list[dict[str, Any]] = []

    for district in districts:
        after = haversine_km(
            district["center_lat"],
            district["center_lng"],
            float(candidate["lat"]),
            float(candidate["lng"]),
        )
        before = float(district["min_dist_to_hospital"])
        gain = before - after
        if gain <= 0:
            continue

        vulnerable_population = int(district["vulnerable_population"])
        improved.append(
            {
                "adm_nm": district["adm_nm"],
                "before_distance_km": round(before, 3),
                "after_distance_km": round(after, 3),
                "gain_km": round(gain, 3),
                "vulnerable_population": vulnerable_population,
                "weighted_gain": gain * vulnerable_population,
            }
        )

    improved.sort(key=lambda row: row["weighted_gain"], reverse=True)
    total_population = sum(row["vulnerable_population"] for row in improved)
    total_weighted_gain = sum(row["weighted_gain"] for row in improved)
    before_weighted = sum(row["before_distance_km"] * row["vulnerable_population"] for row in improved)
    after_weighted = sum(row["after_distance_km"] * row["vulnerable_population"] for row in improved)

    nearest_name, nearest_distance = nearest_hospital(candidate, hospitals)
    top_districts = improved[:8]
    group = candidate_group(candidate, top_districts)

    before_avg = before_weighted / total_population if total_population else None
    after_avg = after_weighted / total_population if total_population else None
    gain_avg = total_weighted_gain / total_population if total_population else None

    interpretation = "접근성 개선 후보"
    if group == "separate_region":
        interpretation = "군위 또는 원거리 권역은 메인 후보가 아니라 별도 권역 검토 후보"
    elif mode == "pediatric":
        interpretation = "소아 취약 수요의 접근성 개선을 검토할 도시권 후보"
    elif mode == "senior":
        interpretation = "어르신 취약 수요의 접근성 개선을 검토할 도시권 후보"

    return {
        "id": int(candidate["id"]),
        "mode": mode,
        "candidate_type": "kmeans_centroid",
        "candidate_group": group,
        "lat": float(candidate["lat"]),
        "lng": float(candidate["lng"]),
        "demand": int(candidate.get("demand", 0)),
        "covered_districts": [row["adm_nm"] for row in top_districts],
        "covered_district_count": len(improved),
        "nearest_existing_hospital": nearest_name,
        "nearest_existing_hospital_distance_km": round(nearest_distance, 3) if nearest_distance is not None else None,
        "before_avg_distance_km": round(before_avg, 3) if before_avg is not None else None,
        "after_avg_distance_km": round(after_avg, 3) if after_avg is not None else None,
        "accessibility_gain_km": round(gain_avg, 3) if gain_avg is not None else None,
        "vulnerable_population": total_population,
        "score": round((gain_avg or 0) * math.log1p(total_population), 3),
        "interpretation": interpretation,
        "top_improved_districts": top_districts,
    }


def build_report(results: list[dict[str, Any]]) -> str:
    lines = [
        "# 접근성 후보 역추적 1차 보고서",
        "",
        "- 작성일: 2026-07-15",
        "- 목적: 최적입지 후보별 커버 행정동과 접근성 개선량 초안을 산출한다.",
        "- 주의: 현재 계산은 직선거리 기반 1차 프록시이며, 도로망·실시간 교통을 반영한 최종 결과가 아니다.",
        "",
        "## 후보 요약",
        "",
        "| 모드 | id | 그룹 | 수요 | 커버 행정동 | 취약인구 | 평균 개선 km | 최근접 기존 병원 | 해석 |",
        "|---|---:|---|---:|---:|---:|---:|---|---|",
    ]

    for row in results:
        lines.append(
            "| {mode} | {id} | {group} | {demand} | {district_count} | {population} | {gain} | {hospital} | {interpretation} |".format(
                mode=row["mode"],
                id=row["id"],
                group=row["candidate_group"],
                demand=row["demand"],
                district_count=row["covered_district_count"],
                population=row["vulnerable_population"],
                gain=row["accessibility_gain_km"],
                hospital=row["nearest_existing_hospital"] or "-",
                interpretation=row["interpretation"],
            )
        )

    lines.extend(["", "## 후보별 상위 개선 행정동", ""])
    for row in results:
        lines.extend(
            [
                f"### {row['mode']} 후보 {row['id']}",
                "",
                "| 행정동 | 기존 거리 km | 후보 거리 km | 개선 km | 취약인구 |",
                "|---|---:|---:|---:|---:|",
            ]
        )
        for district in row["top_improved_districts"]:
            lines.append(
                "| {adm_nm} | {before} | {after} | {gain} | {population} |".format(
                    adm_nm=district["adm_nm"],
                    before=district["before_distance_km"],
                    after=district["after_distance_km"],
                    gain=district["gain_km"],
                    population=district["vulnerable_population"],
                )
            )
        lines.append("")

    lines.extend(
        [
            "## 다음 작업",
            "",
            "- 확장 후보 JSON을 화면용 산출물로 분리한다.",
            "- EPSG:5179 기반 K-Means 결과와 현재 후보를 비교한다.",
            "- 직선거리 프록시를 도로망 또는 이동시간 프록시로 교체하는 실험을 진행한다.",
        ]
    )
    return "\n".join(lines) + "\n"


def main() -> None:
    districts = [to_district_record(feature) for feature in read_json(VULNERABILITY_GEOJSON)["features"]]
    hospitals = read_json(HOSPITALS_JSON)
    results: list[dict[str, Any]] = []

    for mode, path in CANDIDATE_FILES.items():
        candidates = read_json(path)
        for candidate in candidates:
            results.append(summarize_candidate(mode, candidate, districts, hospitals))

    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    output_text = json.dumps(results, ensure_ascii=False, indent=2)
    OUTPUT_JSON.write_text(output_text, encoding="utf-8")

    PUBLIC_OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    PUBLIC_OUTPUT_JSON.write_text(output_text, encoding="utf-8")

    OUTPUT_REPORT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_REPORT.write_text(build_report(results), encoding="utf-8")

    print(f"wrote {OUTPUT_JSON}")
    print(f"wrote {PUBLIC_OUTPUT_JSON}")
    print(f"wrote {OUTPUT_REPORT}")


if __name__ == "__main__":
    main()
