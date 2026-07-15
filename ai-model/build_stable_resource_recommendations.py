from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

from hira_data_bridge import HIRA_OFFLINE_DUMP, SEARCH_RADIUS_KM, _haversine_km

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SENSITIVITY_JSON = PROJECT_ROOT / "data" / "processed" / "candidate_sensitivity_analysis.json"
OUTPUT_JSON = PROJECT_ROOT / "frontend" / "public" / "data" / "resource_recommendations.json"
STABLE_CANDIDATES_JSON = PROJECT_ROOT / "frontend" / "public" / "data" / "stable_policy_candidates.json"
OUTPUT_REPORT = PROJECT_ROOT / "docs" / "reports" / "stable_resource_recommendation_report_20260715.md"

MAIN_COVERAGE_THRESHOLD = 0.5


def read_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def nearby_hospitals(lat: float, lng: float, radius_km: float = SEARCH_RADIUS_KM) -> list[dict[str, Any]]:
    result = []
    for name, info in HIRA_OFFLINE_DUMP.items():
        distance = _haversine_km(lat, lng, info["lat"], info["lng"])
        if distance <= radius_km:
            result.append({"name": name, "dist_km": round(float(distance), 2), **info})
    result.sort(key=lambda row: row["dist_km"])
    return result


def select_stable_candidates(sensitivity_results: list[dict[str, Any]]) -> list[dict[str, Any]]:
    selected = []
    for mode_result in sensitivity_results:
        mode = mode_result["mode"]
        groups = mode_result["stable_candidate_groups"]
        separate_candidates = []

        for group in groups:
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


def compute_gap(nearby: list[dict[str, Any]], demand: int, candidate_group: str) -> dict[str, Any]:
    if not nearby:
        priority = "HIGH" if candidate_group != "separate_region" else "REVIEW"
        return {
            "doctors_needed": max(5, min(15, math.ceil(demand / 5))),
            "mri_needed": True,
            "ct_needed": True,
            "avg_doctors_nearby": 0,
            "mri_coverage_ratio": 0.0,
            "ct_coverage_ratio": 0.0,
            "priority_level": priority,
        }

    avg_doctors = sum(float(row["doctors_count"]) for row in nearby) / len(nearby)
    mri_ratio = sum(1 for row in nearby if row.get("MRI")) / len(nearby)
    ct_ratio = sum(1 for row in nearby if row.get("CT")) / len(nearby)

    if candidate_group == "separate_region":
        priority = "REVIEW"
    elif avg_doctors < 5 or mri_ratio == 0:
        priority = "HIGH"
    elif avg_doctors < 15 or mri_ratio < 0.5:
        priority = "MEDIUM"
    else:
        priority = "LOW"

    return {
        "doctors_needed": max(0, math.ceil(15 - avg_doctors)),
        "mri_needed": mri_ratio < 0.5,
        "ct_needed": ct_ratio < 0.5,
        "avg_doctors_nearby": round(avg_doctors, 1),
        "mri_coverage_ratio": round(mri_ratio, 2),
        "ct_coverage_ratio": round(ct_ratio, 2),
        "priority_level": priority,
    }


def recommendation_text(candidate: dict[str, Any], nearby: list[dict[str, Any]], gap: dict[str, Any]) -> str:
    mode_label = "소아" if candidate["pipeline"] == "pediatric" else "어르신"
    coverage = candidate["scenario_coverage_ratio"]
    group = candidate["candidate_group"]

    if group == "separate_region":
        base = f"{mode_label} 별도 권역 검토 후보입니다. 민감도 시나리오 커버율 {coverage:.3f}로 반복 등장했지만 메인 후보와 분리해 검토해야 합니다."
    elif group == "hold":
        base = f"{mode_label} 보류 검토 후보입니다. 안정성은 있으나 수요가 낮아 정책 우선순위 재검토가 필요합니다."
    else:
        base = f"{mode_label} 안정 후보입니다. 여러 K/seed/거리 조건에서 반복 등장해 정책 우선 검토 가치가 있습니다."

    if not nearby:
        return f"{base} 반경 5km 내 참조 병원이 없어 신규 거점, 전문의 배치, MRI/CT 도입 여부를 함께 검토해야 합니다."

    nearest = nearby[0]["name"]
    details = []
    if gap["doctors_needed"] > 0:
        details.append(f"반경 5km 평균 전문의가 {gap['avg_doctors_nearby']}명으로 낮아 전문의 {gap['doctors_needed']}명 보강을 검토합니다.")
    if gap["mri_needed"]:
        details.append("MRI 커버리지가 낮아 장비 보강 또는 인접 병원 연계를 검토합니다.")
    if gap["ct_needed"]:
        details.append("CT 커버리지가 낮아 장비 보강 또는 전원 연계 기준을 점검합니다.")
    if not details:
        details.append("반경 5km 인프라가 비교적 양호해 지속 모니터링 후보로 둡니다.")

    return f"{base} 최근접 참조 병원은 {nearest}입니다. " + " ".join(details)


def build_recommendations() -> list[dict[str, Any]]:
    sensitivity = read_json(SENSITIVITY_JSON)
    candidates = select_stable_candidates(sensitivity)
    recommendations = []

    for candidate in candidates:
        lat = candidate["location"]["lat"]
        lng = candidate["location"]["lng"]
        nearby = nearby_hospitals(lat, lng)
        gap = compute_gap(nearby, candidate["demand"], candidate["candidate_group"])
        recommendations.append(
            {
                **candidate,
                "nearby_hospitals": [row["name"] for row in nearby],
                "nearby_count": len(nearby),
                "resource_gap": gap,
                "recommendation": recommendation_text(candidate, nearby, gap),
                "disclaimer": "정책탭 전용 검토 자료이며 시민탭 행동 안내가 아닙니다.",
            }
        )
    return recommendations


def build_stable_policy_candidates(recommendations: list[dict[str, Any]]) -> list[dict[str, Any]]:
    candidates = []
    counters: dict[str, int] = {}
    for row in recommendations:
        mode = row["pipeline"]
        counters[mode] = counters.get(mode, 0) + 1
        coverage = float(row["scenario_coverage_ratio"])
        candidate_group = row["candidate_group"]
        if candidate_group == "separate_region":
            interpretation = "군위/원거리 권역은 메인 후보가 아니라 별도 권역 검토 후보입니다."
        elif candidate_group == "hold":
            interpretation = "조건 변화에는 비교적 안정적이지만 수요가 낮아 보류 검토가 필요한 후보입니다."
        else:
            interpretation = "민감도 분석에서 반복 등장한 정책탭 우선 검토 후보입니다."

        candidates.append(
            {
                "id": counters[mode],
                "mode": mode,
                "candidate_type": row["candidate_type"],
                "candidate_group": candidate_group,
                "lat": row["location"]["lat"],
                "lng": row["location"]["lng"],
                "demand": row["demand"],
                "scenario_coverage_ratio": coverage,
                "score": round(coverage * 100, 1),
                "interpretation": interpretation,
            }
        )
    return candidates


def build_report(recommendations: list[dict[str, Any]]) -> str:
    lines = [
        "# 안정 후보 기반 AI 인프라 확충 시뮬레이션 보고서",
        "",
        "- 작성일: 2026-07-15",
        "- 목적: 민감도 분석에서 살아남은 안정 후보를 기준으로 전문의·MRI·CT 보강 필요성을 1차 추정한다.",
        "- 비용: 0원, 로컬 오프라인 HIRA 샘플과 기존 후보 분석 산출물만 사용",
        "- 주의: 실제 의료자원 배치 확정안이 아니라 정책탭 검토 자료다.",
        "",
        "## 후보별 요약",
        "",
        "| 모드 | 후보 | 그룹 | 커버율 | 수요 | 주변 병원 | 우선순위 | 전문의 보강 | MRI | CT |",
        "|---|---:|---|---:|---:|---:|---|---:|---|---|",
    ]
    for row in recommendations:
        gap = row["resource_gap"]
        lines.append(
            "| {mode} | {id} | {group} | {coverage:.3f} | {demand} | {nearby} | {priority} | {doctors} | {mri} | {ct} |".format(
                mode=row["pipeline"],
                id=row["cluster_id"],
                group=row["candidate_group"],
                coverage=row["scenario_coverage_ratio"],
                demand=row["demand"],
                nearby=row["nearby_count"],
                priority=gap["priority_level"],
                doctors=gap["doctors_needed"],
                mri="필요" if gap["mri_needed"] else "관찰",
                ct="필요" if gap["ct_needed"] else "관찰",
            )
        )
    lines.extend(
        [
            "",
            "## 해석 기준",
            "",
            "- HIGH: 주변 인프라가 부족해 우선 검토가 필요한 후보",
            "- MEDIUM: 일부 자원 보강 또는 연계 점검이 필요한 후보",
            "- LOW: 현재 인프라가 비교적 양호해 모니터링 중심 후보",
            "- REVIEW: 군위/원거리 별도 권역처럼 메인 후보와 분리해 검토할 후보",
            "",
            "## 한계",
            "",
            "- HIRA 오프라인 샘플 기반 추정이며 실시간 병원 인력 현황이 아니다.",
            "- 반경 5km와 Haversine 직선거리 기준이다.",
            "- 실제 장비 보유, 운영 가능 시간, 전문의 당직표, 예산·부지 제약은 반영하지 않는다.",
        ]
    )
    return "\n".join(lines) + "\n"


def main() -> None:
    recommendations = build_recommendations()
    stable_candidates = build_stable_policy_candidates(recommendations)
    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_JSON.write_text(json.dumps(recommendations, ensure_ascii=False, indent=2), encoding="utf-8")

    STABLE_CANDIDATES_JSON.parent.mkdir(parents=True, exist_ok=True)
    STABLE_CANDIDATES_JSON.write_text(json.dumps(stable_candidates, ensure_ascii=False, indent=2), encoding="utf-8")

    OUTPUT_REPORT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_REPORT.write_text(build_report(recommendations), encoding="utf-8")

    print(f"wrote {OUTPUT_JSON}")
    print(f"wrote {STABLE_CANDIDATES_JSON}")
    print(f"wrote {OUTPUT_REPORT}")


if __name__ == "__main__":
    main()
