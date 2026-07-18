import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt


PROJECT_ROOT = Path(__file__).resolve().parents[1]
STABLE_CANDIDATES_JSON = PROJECT_ROOT / "frontend" / "public" / "data" / "stable_policy_candidates.json"
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

    axis.set_title("Stable Policy Candidates", fontsize=15, weight="bold")
    axis.set_xlabel("Longitude")
    axis.set_ylabel("Latitude")
    axis.grid(True, linestyle="--", alpha=0.35)
    axis.legend(loc="lower right", fontsize=8, frameon=True)

def main() -> None:
    candidates = load_json(STABLE_CANDIDATES_JSON)

    OUTPUT_PNG.parent.mkdir(parents=True, exist_ok=True)

    figure, axis = plt.subplots(figsize=(11, 9), constrained_layout=True)
    draw_candidate_map(axis, candidates)

    figure.suptitle(
        "Daegu Golden Time: Stable Policy Candidate Snapshot",
        fontsize=17,
        weight="bold",
    )
    figure.savefig(OUTPUT_PNG, dpi=220, bbox_inches="tight")
    plt.close(figure)

    print(f"wrote {OUTPUT_PNG}")


if __name__ == "__main__":
    main()
