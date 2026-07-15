from __future__ import annotations

import json
import math
import os
from pathlib import Path
from typing import Any

os.environ.setdefault("LOKY_MAX_CPU_COUNT", str(os.cpu_count() or 1))

import geopandas as gpd
import pandas as pd
from sklearn.cluster import KMeans

from compare_projected_kmeans_candidates import (
    METRIC_CRS,
    PROJECT_ROOT,
    WGS84_CRS,
    haversine_km,
    load_hospitals,
    load_pediatric_blind_spots,
    load_senior_blind_spots,
)

K_VALUES = [2, 3, 4, 5]
SEEDS = [0, 7, 21, 42, 100]
DISTANCE_CAPS_KM: list[float | None] = [None, 10.0, 15.0, 20.0]
GUNWI_POLICIES = ["include", "separate", "exclude"]
GROUP_RADIUS_KM = 3.0

OUTPUT_JSON = PROJECT_ROOT / "data" / "processed" / "candidate_sensitivity_analysis.json"
OUTPUT_REPORT = PROJECT_ROOT / "docs" / "reports" / "candidate_sensitivity_analysis_report_20260715.md"


def nearest_distance_to_hospitals(point_lat: float, point_lng: float, hospitals: gpd.GeoDataFrame) -> float:
    distances = [
        haversine_km(point_lat, point_lng, float(row.geometry.y), float(row.geometry.x))
        for _, row in hospitals.iterrows()
    ]
    return min(distances) if distances else math.inf


def add_distance_to_nearest_hospital(blind_spots: gpd.GeoDataFrame, mode: str) -> gpd.GeoDataFrame:
    hospitals = load_hospitals()
    if mode == "pediatric":
        hospitals = hospitals[hospitals["tier"] == 3]
    else:
        hospitals = hospitals[hospitals["tier"].isin([1, 2])]

    result = blind_spots.copy()
    result["nearest_hospital_distance_km"] = [
        nearest_distance_to_hospitals(float(geometry.y), float(geometry.x), hospitals)
        for geometry in result.geometry
    ]
    result["is_gunwi"] = [float(geometry.y) >= 36.0 for geometry in result.geometry]
    return result


def filter_scenario_points(
    blind_spots: gpd.GeoDataFrame,
    distance_cap_km: float | None,
    gunwi_policy: str,
) -> gpd.GeoDataFrame:
    filtered = blind_spots.copy()
    if distance_cap_km is not None:
        filtered = filtered[filtered["nearest_hospital_distance_km"] <= distance_cap_km]
    if gunwi_policy == "exclude":
        filtered = filtered[~filtered["is_gunwi"]]
    return filtered


def fit_projected_candidates(points_gdf: gpd.GeoDataFrame, k: int, seed: int) -> list[dict[str, Any]]:
    metric = points_gdf.to_crs(METRIC_CRS)
    points = [[geometry.x, geometry.y] for geometry in metric.geometry]
    model = KMeans(n_clusters=k, random_state=seed, n_init=10)
    labels = model.fit_predict(points)
    counts = pd.Series(labels).value_counts().to_dict()

    centers = gpd.GeoDataFrame(
        geometry=gpd.points_from_xy(model.cluster_centers_[:, 0], model.cluster_centers_[:, 1]),
        crs=METRIC_CRS,
    ).to_crs(WGS84_CRS)

    candidates: list[dict[str, Any]] = []
    for index, geometry in enumerate(centers.geometry):
        demand = int(counts.get(index, 0))
        lat = float(geometry.y)
        lng = float(geometry.x)
        candidates.append(
            {
                "candidate_id": index + 1,
                "lat": round(lat, 9),
                "lng": round(lng, 9),
                "demand": demand,
                "candidate_group": classify_candidate(lat, demand),
            }
        )
    return candidates


def classify_candidate(lat: float, demand: int) -> str:
    if lat >= 36.0:
        return "separate_region"
    if demand < 10:
        return "hold"
    return "main_daegu"


def find_group_index(groups: list[dict[str, Any]], candidate: dict[str, Any]) -> int | None:
    for index, group in enumerate(groups):
        distance = haversine_km(candidate["lat"], candidate["lng"], group["lat"], group["lng"])
        if distance <= GROUP_RADIUS_KM:
            return index
    return None


def add_to_group(groups: list[dict[str, Any]], candidate: dict[str, Any], scenario_key: str) -> None:
    group_index = find_group_index(groups, candidate)
    if group_index is None:
        groups.append(
            {
                "lat": candidate["lat"],
                "lng": candidate["lng"],
                "occurrence_count": 1,
                "scenario_keys": [scenario_key],
                "demands": [candidate["demand"]],
                "candidate_groups": [candidate["candidate_group"]],
            }
        )
        return

    group = groups[group_index]
    count = int(group["occurrence_count"])
    group["lat"] = round(((group["lat"] * count) + candidate["lat"]) / (count + 1), 9)
    group["lng"] = round(((group["lng"] * count) + candidate["lng"]) / (count + 1), 9)
    group["occurrence_count"] = count + 1
    if scenario_key not in group["scenario_keys"]:
        group["scenario_keys"].append(scenario_key)
    group["demands"].append(candidate["demand"])
    group["candidate_groups"].append(candidate["candidate_group"])


def summarize_groups(groups: list[dict[str, Any]], total_scenarios: int) -> list[dict[str, Any]]:
    summarized = []
    for index, group in enumerate(groups, start=1):
        scenario_count = len(group["scenario_keys"])
        main_count = group["candidate_groups"].count("main_daegu")
        separate_count = group["candidate_groups"].count("separate_region")
        hold_count = group["candidate_groups"].count("hold")
        dominant_group = max(
            [("main_daegu", main_count), ("separate_region", separate_count), ("hold", hold_count)],
            key=lambda item: item[1],
        )[0]
        summarized.append(
            {
                "stability_group_id": index,
                "lat": group["lat"],
                "lng": group["lng"],
                "occurrence_count": group["occurrence_count"],
                "scenario_count": scenario_count,
                "scenario_coverage_ratio": round(scenario_count / total_scenarios, 3) if total_scenarios else 0,
                "avg_demand": round(sum(group["demands"]) / len(group["demands"]), 2),
                "dominant_candidate_group": dominant_group,
            }
        )
    summarized.sort(key=lambda row: (row["scenario_count"], row["occurrence_count"], row["avg_demand"]), reverse=True)
    return summarized


def analyze_mode(mode: str, blind_spots: gpd.GeoDataFrame) -> dict[str, Any]:
    enriched = add_distance_to_nearest_hospital(blind_spots, mode)
    groups: list[dict[str, Any]] = []
    scenarios: list[dict[str, Any]] = []

    for k in K_VALUES:
        for seed in SEEDS:
            for distance_cap in DISTANCE_CAPS_KM:
                for gunwi_policy in GUNWI_POLICIES:
                    scenario_key = f"k={k}|seed={seed}|cap={distance_cap or 'none'}|gunwi={gunwi_policy}"
                    filtered = filter_scenario_points(enriched, distance_cap, gunwi_policy)
                    if len(filtered) < k:
                        scenarios.append(
                            {
                                "scenario_key": scenario_key,
                                "status": "skipped",
                                "input_count": int(len(filtered)),
                            }
                        )
                        continue

                    candidates = fit_projected_candidates(filtered, k, seed)
                    scenarios.append(
                        {
                            "scenario_key": scenario_key,
                            "status": "completed",
                            "input_count": int(len(filtered)),
                            "candidate_count": len(candidates),
                        }
                    )
                    for candidate in candidates:
                        add_to_group(groups, candidate, scenario_key)

    completed_scenarios = [scenario for scenario in scenarios if scenario["status"] == "completed"]
    return {
        "mode": mode,
        "total_scenarios": len(scenarios),
        "completed_scenarios": len(completed_scenarios),
        "skipped_scenarios": len(scenarios) - len(completed_scenarios),
        "base_input_count": int(len(enriched)),
        "stable_candidate_groups": summarize_groups(groups, len(completed_scenarios)),
        "scenarios": scenarios,
    }


def build_report(results: list[dict[str, Any]]) -> str:
    lines = [
        "# 후보 민감도 분석 보고서",
        "",
        "- 작성일: 2026-07-15",
        "- 목적: K, seed, 거리 상한, 군위 처리 조건을 바꿨을 때 반복적으로 살아남는 안정 후보를 찾는다.",
        "- 비용: 0원, 로컬 데이터와 기존 라이브러리만 사용",
        "",
        "## 1. 실험 조건",
        "",
        f"- K: {', '.join(str(value) for value in K_VALUES)}",
        f"- seed: {', '.join(str(value) for value in SEEDS)}",
        "- 거리 상한: 없음, 10km, 15km, 20km",
        "- 군위 처리: 포함, 별도 권역, 제외",
        f"- 후보 근접 그룹 반경: {GROUP_RADIUS_KM}km",
        "",
    ]

    for result in results:
        lines.extend(
            [
                f"## 2. {result['mode']} 결과",
                "",
                f"- 기본 입력 수: {result['base_input_count']}",
                f"- 전체 시나리오: {result['total_scenarios']}",
                f"- 완료 시나리오: {result['completed_scenarios']}",
                f"- 스킵 시나리오: {result['skipped_scenarios']}",
                "",
                "### 상위 안정 후보 그룹",
                "",
                "| 순위 | lat | lng | 시나리오 커버율 | 등장 횟수 | 평균 수요 | 지배 그룹 |",
                "|---:|---:|---:|---:|---:|---:|---|",
            ]
        )
        for rank, group in enumerate(result["stable_candidate_groups"][:10], start=1):
            lines.append(
                "| {rank} | {lat} | {lng} | {coverage} | {occurrence} | {demand} | {group} |".format(
                    rank=rank,
                    lat=group["lat"],
                    lng=group["lng"],
                    coverage=group["scenario_coverage_ratio"],
                    occurrence=group["occurrence_count"],
                    demand=group["avg_demand"],
                    group=group["dominant_candidate_group"],
                )
            )
        lines.append("")

    lines.extend(
        [
            "## 3. 해석 기준",
            "",
            "- 시나리오 커버율이 높을수록 조건 변화에 강한 안정 후보로 본다.",
            "- `main_daegu` 안정 후보는 정책 탭의 우선 검토 후보로 승격할 수 있다.",
            "- `separate_region` 안정 후보는 군위/원거리 별도 권역 후보로 분리한다.",
            "- 커버율이 낮은 후보는 단일 조건에 민감한 흔들리는 후보로 보고 화면 반영을 보류한다.",
            "- 이 결과만으로 시민 탭에는 아무것도 반영하지 않는다.",
        ]
    )
    return "\n".join(lines) + "\n"


def main() -> None:
    results = [
        analyze_mode("pediatric", load_pediatric_blind_spots()),
        analyze_mode("senior", load_senior_blind_spots()),
    ]

    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_JSON.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")

    OUTPUT_REPORT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_REPORT.write_text(build_report(results), encoding="utf-8")

    print(f"wrote {OUTPUT_JSON}")
    print(f"wrote {OUTPUT_REPORT}")


if __name__ == "__main__":
    main()
