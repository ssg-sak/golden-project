from __future__ import annotations

import json
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SENSITIVITY_JSON = PROJECT_ROOT / "data" / "processed" / "candidate_sensitivity_analysis.json"
OUTPUT_JSON = PROJECT_ROOT / "frontend" / "public" / "data" / "stable_policy_candidates.json"

MAIN_COVERAGE_THRESHOLD = 0.5


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def to_candidate(mode: str, group: dict[str, Any], candidate_type: str) -> dict[str, Any]:
    return {
        "pipeline": mode,
        "cluster_id": int(group["stability_group_id"]),
        "location": {"lat": float(group["lat"]), "lng": float(group["lng"])},
        "demand": int(round(float(group["avg_demand"]))),
        "scenario_coverage_ratio": float(group["scenario_coverage_ratio"]),
        "candidate_group": group["dominant_candidate_group"],
        "candidate_type": candidate_type,
    }


def select_stable_candidates(sensitivity_results: list[dict[str, Any]]) -> list[dict[str, Any]]:
    selected: list[dict[str, Any]] = []
    for mode_result in sensitivity_results:
        mode = str(mode_result["mode"])
        separate_candidates: list[dict[str, Any]] = []

        for group in mode_result["stable_candidate_groups"]:
            dominant_group = group["dominant_candidate_group"]
            coverage = float(group["scenario_coverage_ratio"])
            if dominant_group == "main_daegu" and coverage >= MAIN_COVERAGE_THRESHOLD:
                selected.append(to_candidate(mode, group, "stable_main"))
            elif dominant_group == "hold" and coverage >= MAIN_COVERAGE_THRESHOLD:
                selected.append(to_candidate(mode, group, "hold_review"))
            elif dominant_group == "separate_region":
                separate_candidates.append(group)

        if separate_candidates:
            top_separate = max(
                separate_candidates,
                key=lambda row: (row["scenario_coverage_ratio"], row["occurrence_count"]),
            )
            selected.append(to_candidate(mode, top_separate, "separate_region"))

    return selected


def candidate_interpretation(candidate_group: str) -> str:
    if candidate_group == "separate_region":
        return "군위/원거리 권역은 도시권 후보와 분리해 검토해야 합니다."
    if candidate_group == "hold":
        return "조건 변화에는 비교적 안정적이지만 수요 규모를 추가 확인해야 합니다."
    return "민감도 분석에서 반복 등장한 정책 우선 검토 후보입니다."


def build_stable_policy_candidates(
    sensitivity_results: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    selected = select_stable_candidates(sensitivity_results)
    counters: dict[str, int] = {}
    candidates: list[dict[str, Any]] = []

    for row in selected:
        mode = row["pipeline"]
        counters[mode] = counters.get(mode, 0) + 1
        candidates.append(
            {
                "id": counters[mode],
                "mode": mode,
                "candidate_type": row["candidate_type"],
                "candidate_group": row["candidate_group"],
                "lat": row["location"]["lat"],
                "lng": row["location"]["lng"],
                "demand": row["demand"],
                "scenario_coverage_ratio": row["scenario_coverage_ratio"],
                "score": round(float(row["scenario_coverage_ratio"]) * 100, 1),
                "interpretation": candidate_interpretation(row["candidate_group"]),
            }
        )

    return candidates


def main() -> None:
    sensitivity = read_json(SENSITIVITY_JSON)
    candidates = build_stable_policy_candidates(sensitivity)
    if len(candidates) != 9:
        raise RuntimeError(f"안정 후보 검증 실패: {len(candidates)}개")

    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_JSON.write_text(
        json.dumps(candidates, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"안정 후보 생성: {OUTPUT_JSON}")


if __name__ == "__main__":
    main()
