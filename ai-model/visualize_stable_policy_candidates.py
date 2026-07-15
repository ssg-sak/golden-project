import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt


PROJECT_ROOT = Path(__file__).resolve().parents[1]
STABLE_CANDIDATES_JSON = PROJECT_ROOT / "frontend" / "public" / "data" / "stable_policy_candidates.json"
RESOURCE_RECOMMENDATIONS_JSON = PROJECT_ROOT / "frontend" / "public" / "data" / "resource_recommendations.json"
OUTPUT_PNG = PROJECT_ROOT / "data" / "processed" / "stable_policy_candidates_overview_20260715.png"


MODE_STYLE = {
    "pediatric": {"color": "#2563eb", "label": "Pediatric"},
    "senior": {"color": "#dc2626", "label": "Senior"},
}

CANDIDATE_MARKERS = {
    "stable_main": "o",
    "separate_region": "^",
    "hold_review": "X",
}

PRIORITY_SCORE = {
    "HIGH": 3,
    "MEDIUM": 2,
    "LOW": 1,
}


def load_json(path: Path) -> list[dict]:
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def marker_size(demand: int | float) -> float:
    return 90 + min(float(demand), 280) * 1.2


def candidate_label(candidate: dict) -> str:
    prefix = "P" if candidate["mode"] == "pediatric" else "S"
    return f"{prefix}{candidate['id']}\n{candidate['score']:.1f}"


def draw_candidate_map(axis: plt.Axes, candidates: list[dict]) -> None:
    for candidate_type, marker in CANDIDATE_MARKERS.items():
        typed_candidates = [item for item in candidates if item["candidate_type"] == candidate_type]
        for mode, style in MODE_STYLE.items():
            mode_candidates = [item for item in typed_candidates if item["mode"] == mode]
            if not mode_candidates:
                continue

            axis.scatter(
                [item["lng"] for item in mode_candidates],
                [item["lat"] for item in mode_candidates],
                s=[marker_size(item["demand"]) for item in mode_candidates],
                c=style["color"],
                marker=marker,
                alpha=0.82,
                edgecolors="black",
                linewidths=0.9,
                label=f"{style['label']} / {candidate_type}",
            )

            for item in mode_candidates:
                axis.annotate(
                    candidate_label(item),
                    (item["lng"], item["lat"]),
                    xytext=(7, 7),
                    textcoords="offset points",
                    fontsize=8,
                    weight="bold",
                )

    axis.set_title("Stable Policy Candidates Reflected on 2026-07-15", fontsize=15, weight="bold")
    axis.set_xlabel("Longitude")
    axis.set_ylabel("Latitude")
    axis.grid(True, linestyle="--", alpha=0.35)
    axis.legend(loc="lower right", fontsize=8, frameon=True)


def draw_resource_summary(axis: plt.Axes, recommendations: list[dict]) -> None:
    sorted_items = sorted(
        recommendations,
        key=lambda item: (
            PRIORITY_SCORE.get(item["resource_gap"]["priority_level"], 0),
            item["scenario_coverage_ratio"],
            item["demand"],
        ),
        reverse=True,
    )

    top_items = sorted_items[:8]
    labels = [
        f"{item['pipeline'][0].upper()}{item['cluster_id']} {item['resource_gap']['priority_level']}"
        for item in top_items
    ]
    values = [item["scenario_coverage_ratio"] * 100 for item in top_items]
    colors = [
        "#dc2626" if item["resource_gap"]["priority_level"] == "HIGH" else "#f59e0b"
        if item["resource_gap"]["priority_level"] == "MEDIUM"
        else "#2563eb"
        for item in top_items
    ]

    axis.barh(labels, values, color=colors, alpha=0.88)
    axis.invert_yaxis()
    axis.set_title("Resource Review Priority by Stable Scenario Rate", fontsize=13, weight="bold")
    axis.set_xlabel("Scenario repeat rate (%)")
    axis.set_xlim(0, 100)
    axis.grid(axis="x", linestyle="--", alpha=0.3)

    for index, item in enumerate(top_items):
        gap = item["resource_gap"]
        axis.text(
            values[index] + 1,
            index,
            f"demand {item['demand']} / doctors +{gap['doctors_needed']}",
            va="center",
            fontsize=8,
        )


def main() -> None:
    candidates = load_json(STABLE_CANDIDATES_JSON)
    recommendations = load_json(RESOURCE_RECOMMENDATIONS_JSON)

    OUTPUT_PNG.parent.mkdir(parents=True, exist_ok=True)

    figure, axes = plt.subplots(
        1,
        2,
        figsize=(16, 8),
        gridspec_kw={"width_ratios": [1.15, 0.85]},
        constrained_layout=True,
    )

    draw_candidate_map(axes[0], candidates)
    draw_resource_summary(axes[1], recommendations)

    figure.suptitle(
        "Daegu Golden Time Policy Tab: Stable Candidate and Resource Recommendation Snapshot",
        fontsize=17,
        weight="bold",
    )
    figure.savefig(OUTPUT_PNG, dpi=220, bbox_inches="tight")
    plt.close(figure)

    print(f"wrote {OUTPUT_PNG}")


if __name__ == "__main__":
    main()
