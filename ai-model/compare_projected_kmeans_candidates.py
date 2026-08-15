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
from sklearn.metrics import silhouette_score

PROJECT_ROOT = Path(__file__).resolve().parents[1]
METRIC_CRS = "EPSG:5179"
WGS84_CRS = "EPSG:4326"
RANDOM_STATE = 42

KINDER_GEO = PROJECT_ROOT / "data" / "processed" / "daegu_kindergartens_geocoded.csv"
HOSPITALS_JSON = PROJECT_ROOT / "data" / "processed" / "final_hospitals.json"
VULNERABILITY_GEOJSON = PROJECT_ROOT / "data" / "processed" / "daegu_vulnerability.geojson"
CURRENT_CANDIDATES = {
    "pediatric": PROJECT_ROOT / "frontend" / "public" / "data" / "optimal_locations_pediatric.json",
    "senior": PROJECT_ROOT / "frontend" / "public" / "data" / "optimal_locations_senior.json",
}
OUTPUT_JSON = PROJECT_ROOT / "data" / "processed" / "projected_kmeans_candidate_comparison.json"
OUTPUT_REPORT = PROJECT_ROOT / "docs" / "reports" / "projected_kmeans_candidate_comparison_report_20260715.md"
K_SELECTION_REPORT = PROJECT_ROOT / "docs" / "reports" / "kmeans_k_selection_report_20260815.md"


def read_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    radius_km = 6371.0088
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lng2 - lng1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    return 2 * radius_km * math.asin(math.sqrt(a))


def load_hospitals() -> gpd.GeoDataFrame:
    hospitals = pd.DataFrame(read_json(HOSPITALS_JSON))
    hospitals = hospitals.rename(columns={"lat": "latitude", "lng": "longitude"})
    hospitals = hospitals.dropna(subset=["latitude", "longitude"])
    return gpd.GeoDataFrame(
        hospitals,
        geometry=gpd.points_from_xy(hospitals.longitude, hospitals.latitude),
        crs=WGS84_CRS,
    )


def load_pediatric_blind_spots() -> gpd.GeoDataFrame:
    demand = pd.read_csv(KINDER_GEO, encoding="utf-8-sig")
    demand = demand.dropna(subset=["latitude", "longitude"])
    demand_gdf = gpd.GeoDataFrame(
        demand,
        geometry=gpd.points_from_xy(demand.longitude, demand.latitude),
        crs=WGS84_CRS,
    )

    hospitals = load_hospitals()
    pediatric_hospitals = hospitals[hospitals["tier"] == 3]
    return filter_blind_spots(demand_gdf, pediatric_hospitals)


def load_senior_blind_spots() -> gpd.GeoDataFrame:
    vulnerability = gpd.read_file(VULNERABILITY_GEOJSON).to_crs(METRIC_CRS)
    demand = vulnerability.copy()
    demand["geometry"] = demand.geometry.centroid
    demand = demand.to_crs(WGS84_CRS)

    hospitals = load_hospitals()
    senior_hospitals = hospitals[hospitals["tier"].isin([1, 2])]
    return filter_blind_spots(demand, senior_hospitals)


def filter_blind_spots(demand_gdf: gpd.GeoDataFrame, hospital_gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    demand_metric = demand_gdf.to_crs(METRIC_CRS)
    hospital_metric = hospital_gdf.to_crs(METRIC_CRS)
    hospital_buffers = hospital_metric.copy()
    hospital_buffers["geometry"] = hospital_buffers.geometry.buffer(3000)

    joined = gpd.sjoin(demand_metric, hospital_buffers, how="left", predicate="intersects")
    blind_spots = joined[joined["index_right"].isna()].copy()
    blind_spots = blind_spots.drop(columns=[col for col in blind_spots.columns if col.endswith("_right")])
    if "index_right" in blind_spots.columns:
        blind_spots = blind_spots.drop(columns=["index_right"])
    return blind_spots.to_crs(WGS84_CRS)


def fit_kmeans_wgs84(blind_spots: gpd.GeoDataFrame, k: int) -> list[dict[str, float | int]]:
    points = [[geometry.y, geometry.x] for geometry in blind_spots.geometry]
    model = KMeans(n_clusters=k, random_state=RANDOM_STATE, n_init=10)
    labels = model.fit_predict(points)
    return make_candidates_from_wgs84_centers(model.cluster_centers_, labels)


def fit_kmeans_projected(blind_spots: gpd.GeoDataFrame, k: int) -> list[dict[str, float | int]]:
    metric = blind_spots.to_crs(METRIC_CRS)
    points = [[geometry.x, geometry.y] for geometry in metric.geometry]
    model = KMeans(n_clusters=k, random_state=RANDOM_STATE, n_init=10)
    labels = model.fit_predict(points)

    centers_metric = gpd.GeoDataFrame(
        geometry=gpd.points_from_xy(model.cluster_centers_[:, 0], model.cluster_centers_[:, 1]),
        crs=METRIC_CRS,
    ).to_crs(WGS84_CRS)
    centers = [[geometry.y, geometry.x] for geometry in centers_metric.geometry]
    return make_candidates_from_wgs84_centers(centers, labels)


def evaluate_k(
    points: list[list[float]],
    k_range: range = range(2, 8),
    seed: int = RANDOM_STATE,
) -> list[dict[str, float | int]]:
    if not points:
        raise ValueError("K-Means를 평가할 좌표가 없습니다.")
    requested_k = list(k_range)
    if not requested_k:
        raise ValueError("평가할 k 범위가 비어 있습니다.")
    if min(requested_k) < 2 or max(requested_k) >= len(points):
        raise ValueError("실루엣 계수는 2 <= k < 표본 수 범위에서만 계산할 수 있습니다.")

    evaluations: list[dict[str, float | int]] = []
    for k in requested_k:
        model = KMeans(n_clusters=k, random_state=seed, n_init=10)
        labels = model.fit_predict(points)
        evaluations.append(
            {
                "k": k,
                "silhouette_score": float(silhouette_score(points, labels)),
                "inertia": float(model.inertia_),
            }
        )
    return evaluations


def make_candidates_from_wgs84_centers(centers: Any, labels: Any) -> list[dict[str, float | int]]:
    label_counts = pd.Series(labels).value_counts().to_dict()
    candidates = []
    for index, center in enumerate(centers):
        candidates.append(
            {
                "id": index + 1,
                "lat": round(float(center[0]), 9),
                "lng": round(float(center[1]), 9),
                "demand": int(label_counts.get(index, 0)),
            }
        )
    return candidates


def nearest_candidate_distance(
    candidate: dict[str, float | int],
    others: list[dict[str, float | int]],
) -> tuple[int, float]:
    nearest_id = -1
    nearest_distance = math.inf
    for other in others:
        distance = haversine_km(
            float(candidate["lat"]),
            float(candidate["lng"]),
            float(other["lat"]),
            float(other["lng"]),
        )
        if distance < nearest_distance:
            nearest_id = int(other["id"])
            nearest_distance = distance
    return nearest_id, round(nearest_distance, 3)


def compare_mode(mode: str, blind_spots: gpd.GeoDataFrame) -> dict[str, Any]:
    current = read_json(CURRENT_CANDIDATES[mode])
    k = len(current)
    wgs84_candidates = fit_kmeans_wgs84(blind_spots, k)
    projected_candidates = fit_kmeans_projected(blind_spots, k)

    comparisons = []
    for projected in projected_candidates:
        nearest_current_id, distance_to_current = nearest_candidate_distance(projected, current)
        nearest_wgs84_id, distance_to_wgs84 = nearest_candidate_distance(projected, wgs84_candidates)
        comparisons.append(
            {
                "projected_id": projected["id"],
                "nearest_current_id": nearest_current_id,
                "distance_to_current_km": distance_to_current,
                "nearest_wgs84_id": nearest_wgs84_id,
                "distance_to_wgs84_km": distance_to_wgs84,
            }
        )

    return {
        "mode": mode,
        "k": k,
        "blind_spot_count": int(len(blind_spots)),
        "current_candidates": current,
        "wgs84_recomputed_candidates": wgs84_candidates,
        "projected_candidates": projected_candidates,
        "comparisons": comparisons,
    }


def build_report(results: list[dict[str, Any]]) -> str:
    lines = [
        "# EPSG:5179 K-Means 후보 비교 보고서",
        "",
        "- 작성일: 2026-07-15",
        "- 목적: 기존 위경도 기반 K-Means 후보와 EPSG:5179 미터좌표 기반 K-Means 후보의 차이를 비교한다.",
        "- 비용: 0원, 로컬 데이터와 기존 라이브러리만 사용",
        "",
        "## 1. 요약",
        "",
        "이 실험은 최종 후보지를 바로 교체하기 위한 작업이 아니라, 좌표계 변경에 따라 후보가 얼마나 흔들리는지 확인하기 위한 안정성 테스트다.",
        "",
    ]

    for result in results:
        lines.extend(
            [
                f"## 2. {result['mode']} 후보 비교",
                "",
                f"- K: {result['k']}",
                f"- 사각지대 입력 수: {result['blind_spot_count']}",
                "",
                "### EPSG:5179 후보",
                "",
                "| id | lat | lng | demand | 최근접 기존 후보 | 기존 후보와 거리 km |",
                "|---:|---:|---:|---:|---:|---:|",
            ]
        )
        comparison_by_id = {row["projected_id"]: row for row in result["comparisons"]}
        for candidate in result["projected_candidates"]:
            comparison = comparison_by_id[candidate["id"]]
            lines.append(
                "| {id} | {lat} | {lng} | {demand} | {nearest} | {distance} |".format(
                    id=candidate["id"],
                    lat=candidate["lat"],
                    lng=candidate["lng"],
                    demand=candidate["demand"],
                    nearest=comparison["nearest_current_id"],
                    distance=comparison["distance_to_current_km"],
                )
            )
        lines.append("")

    lines.extend(
        [
            "## 3. 해석 원칙",
            "",
            "- 기존 후보와 EPSG:5179 후보가 가까우면 안정 후보로 볼 수 있다.",
            "- 후보가 크게 이동하면 좌표계와 거리 계산 방식에 민감한 후보로 보고 보류 또는 추가 검토가 필요하다.",
            "- 이번 결과만으로 화면 후보를 즉시 교체하지 않는다.",
            "- 다음 단계에서 K, seed, 거리 상한, 군위 처리 조건까지 바꿔 반복적으로 살아남는 후보를 안정 후보로 본다.",
        ]
    )
    return "\n".join(lines) + "\n"


def build_k_selection_report(
    evaluations_by_mode: dict[str, list[dict[str, float | int]]],
    selected_k_by_mode: dict[str, int],
) -> str:
    lines = [
        "# K-Means 후보 개수 선택 근거",
        "",
        "- 작성일: 2026-08-15",
        "- 좌표계: EPSG:5179(미터)",
        "- 평가 범위: k=2~7",
        "- 재현성: `random_state=42`, `n_init=10`",
        "",
        "실루엣 계수는 군집 내부 응집도와 군집 간 분리도를 함께 비교하며, 1에 가까울수록 분리가 명확하다. inertia는 각 점과 소속 군집 중심 사이 제곱거리의 합으로 작을수록 군집이 조밀하지만, k가 늘면 항상 감소하므로 실루엣 계수와 함께 해석한다.",
        "",
    ]
    mode_names = {"pediatric": "소아", "senior": "어르신"}
    for mode, evaluations in evaluations_by_mode.items():
        selected_k = selected_k_by_mode[mode]
        best = max(evaluations, key=lambda row: float(row["silhouette_score"]))
        lines.extend(
            [
                f"## {mode_names.get(mode, mode)} 모드",
                "",
                "| k | 실루엣 계수 | inertia |",
                "|---:|---:|---:|",
            ]
        )
        for evaluation in evaluations:
            lines.append(
                f"| {evaluation['k']} | {float(evaluation['silhouette_score']):.6f} | "
                f"{float(evaluation['inertia']):.3f} |"
            )
        lines.extend(
            [
                "",
                f"- 실루엣 기준 최적 k: `{best['k']}` ({float(best['silhouette_score']):.6f})",
                f"- 현재 채택 k: `{selected_k}`",
            ]
        )
        if int(best["k"]) != selected_k:
            lines.append(
                "- 선택 해석: 실루엣 단독 최적값을 바로 적용하지 않고, 정책 담당자가 검토·운영할 수 있는 거점 수와 기존 릴리스 계약을 함께 고려해 현재 k를 유지한다."
            )
        else:
            lines.append("- 선택 해석: 현재 채택 k가 실루엣 기준 최적값과 일치한다.")
        lines.append("")
    return "\n".join(lines)


def main() -> None:
    blind_spots_by_mode = {
        "pediatric": load_pediatric_blind_spots(),
        "senior": load_senior_blind_spots(),
    }
    results = [
        compare_mode(mode, blind_spots)
        for mode, blind_spots in blind_spots_by_mode.items()
    ]
    evaluations_by_mode = {
        mode: evaluate_k(
            [
                [float(geometry.x), float(geometry.y)]
                for geometry in blind_spots.to_crs(METRIC_CRS).geometry
            ]
        )
        for mode, blind_spots in blind_spots_by_mode.items()
    }
    selected_k_by_mode = {
        mode: len(read_json(CURRENT_CANDIDATES[mode]))
        for mode in blind_spots_by_mode
    }

    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_JSON.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")

    OUTPUT_REPORT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_REPORT.write_text(build_report(results), encoding="utf-8")

    K_SELECTION_REPORT.write_text(
        build_k_selection_report(evaluations_by_mode, selected_k_by_mode),
        encoding="utf-8",
    )

    print(f"wrote {OUTPUT_JSON}")
    print(f"wrote {OUTPUT_REPORT}")
    print(f"wrote {K_SELECTION_REPORT}")


if __name__ == "__main__":
    main()
