from __future__ import annotations

import json
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parent.parent
RELEASE_PATH = PROJECT_ROOT / "data" / "processed" / "policy_release.json"
MATRIX_PATH = PROJECT_ROOT / "data" / "processed" / "actual_road_accessibility_matrix.json"

MODE_POPULATION_KEYS = {
    "pediatric": "pediatric_population",
    "senior": "senior_population",
}


def read_json(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as file:
        value = json.load(file)
    if not isinstance(value, dict):
        raise ValueError(f"{path}의 최상위 JSON 값은 객체여야 합니다.")
    return value


def selected_p_median_resources(release: dict[str, Any]) -> dict[str, list[str]]:
    selections: dict[str, list[str]] = {}
    results_by_mode = release["optimization"]["results"]
    for mode in MODE_POPULATION_KEYS:
        mode_results = results_by_mode[mode]
        three_facility_result = next(
            (row for row in mode_results if row["facility_count"] == 3),
            None,
        )
        if three_facility_result is None:
            raise ValueError(f"{mode} 모드의 3개 후보 p-median 결과가 없습니다.")
        resource_ids = three_facility_result["p_median_optimum"][
            "candidate_resource_ids"
        ]
        if len(resource_ids) != 3 or len(set(resource_ids)) != 3:
            raise ValueError(f"{mode} 모드의 p-median 후보 키가 유효하지 않습니다.")
        selections[mode] = list(resource_ids)
    return selections


def calculate_policy_kpis(
    matrix: dict[str, Any],
    selected_resources: dict[str, list[str]],
) -> dict[str, dict[str, Any]]:
    metrics: dict[str, dict[str, Any]] = {}

    for mode, population_key in MODE_POPULATION_KEYS.items():
        selected_ids = selected_resources[mode]
        total_population = 0
        weighted_baseline_eta = 0.0
        weighted_after_eta = 0.0
        improved_population = 0
        baseline_15_population = 0
        after_15_population = 0
        baseline_30_population = 0
        after_30_population = 0

        for district in matrix["districts"]:
            nearest = district["nearest_emergency_resource_by_mode"][mode]
            if nearest is None:
                continue

            population = int(district[population_key])
            if population < 0:
                raise ValueError(
                    f"{district['name']}의 {population_key} 값은 음수가 될 수 없습니다."
                )

            baseline_eta = float(nearest["eta_minutes"])
            candidate_etas = [
                float(district["candidate_routes"][resource_id]["eta_minutes"])
                for resource_id in selected_ids
            ]
            after_eta = min(baseline_eta, *candidate_etas)

            total_population += population
            weighted_baseline_eta += baseline_eta * population
            weighted_after_eta += after_eta * population
            if after_eta < baseline_eta:
                improved_population += population
            if baseline_eta <= 15:
                baseline_15_population += population
            if after_eta <= 15:
                after_15_population += population
            if baseline_eta <= 30:
                baseline_30_population += population
            if after_eta <= 30:
                after_30_population += population

        if total_population <= 0:
            raise ValueError(f"{mode} 모드의 분석 대상 인구가 없습니다.")

        baseline_eta = weighted_baseline_eta / total_population
        after_eta = weighted_after_eta / total_population
        eta_change = after_eta - baseline_eta
        metrics[mode] = {
            "population": total_population,
            "selected_candidate_resource_ids": selected_ids,
            "selected_candidate_ids": [
                int(resource_id.rsplit(":", maxsplit=1)[1])
                for resource_id in selected_ids
            ],
            "baseline_weighted_eta_minutes": round(baseline_eta, 3),
            "after_weighted_eta_minutes": round(after_eta, 3),
            "eta_change_minutes": round(eta_change, 3),
            "eta_change_percent": round(eta_change / baseline_eta * 100, 2),
            "improved_population": improved_population,
            "improved_population_percent": round(
                improved_population / total_population * 100,
                2,
            ),
            "baseline_15min_coverage_percent": round(
                baseline_15_population / total_population * 100,
                2,
            ),
            "after_15min_coverage_percent": round(
                after_15_population / total_population * 100,
                2,
            ),
            "baseline_30min_coverage_percent": round(
                baseline_30_population / total_population * 100,
                2,
            ),
            "after_30min_coverage_percent": round(
                after_30_population / total_population * 100,
                2,
            ),
        }

    return metrics


def main() -> None:
    release = read_json(RELEASE_PATH)
    matrix = read_json(MATRIX_PATH)
    metrics = calculate_policy_kpis(
        matrix,
        selected_p_median_resources(release),
    )
    print(json.dumps(metrics, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
