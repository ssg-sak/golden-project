from __future__ import annotations

from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score


def evaluate_k(
    points: list[list[float]],
    k_range: range = range(2, 8),
    seed: int = 42,
) -> list[dict[str, float | int]]:
    """동일한 초기화 조건에서 k별 실루엣 계수와 inertia를 계산한다."""
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


def build_k_selection_report(
    evaluations_by_mode: dict[str, list[dict[str, float | int]]],
    selected_k_by_mode: dict[str, int],
    *,
    title: str,
    report_date: str,
    scope: str,
    selection_reasons: dict[str, str] | None = None,
) -> str:
    """환경별 미세한 BLAS 차이가 문서 diff가 되지 않게 유효숫자를 제한한다."""
    lines = [
        f"# {title}",
        "",
        f"- 작성일: {report_date}",
        "- 좌표계: EPSG:5179(미터)",
        "- 평가 범위: k=2~7",
        "- 재현성: `random_state=42`, `n_init=10`",
        f"- 평가 경로: {scope}",
        "",
        "실루엣 계수는 군집 내부 응집도와 군집 간 분리도를 함께 비교하며, 1에 가까울수록 분리가 명확하다. inertia는 각 점과 소속 군집 중심 사이 제곱거리의 합으로 작을수록 군집이 조밀하지만, k가 늘면 항상 감소하므로 실루엣 계수와 함께 해석한다.",
        "",
        "inertia는 BLAS 구현 차이로 생기는 무의미한 끝자리 변동을 피하기 위해 유효숫자 6자리로 기록한다.",
        "",
    ]
    mode_names = {"pediatric": "소아", "senior": "어르신"}
    reasons = selection_reasons or {}
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
                f"{float(evaluation['inertia']):.6g} |"
            )
        lines.extend(
            [
                "",
                f"- 실루엣 기준 최적 k: `{best['k']}` ({float(best['silhouette_score']):.6f})",
                f"- 현재 채택 k: `{selected_k}`",
            ]
        )
        if int(best["k"]) == selected_k:
            lines.append("- 선택 해석: 현재 채택 k가 실루엣 기준 최적값과 일치한다.")
        else:
            lines.append(
                "- 선택 해석: "
                + reasons.get(
                    mode,
                    "실루엣 단독 최적값을 바로 적용하지 않고, 정책 담당자가 검토·운영할 수 있는 거점 수와 기존 릴리스 계약을 함께 고려해 현재 k를 유지한다.",
                )
            )
        lines.append("")
    return "\n".join(lines)
