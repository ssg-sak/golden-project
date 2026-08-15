from __future__ import annotations

import json
import math
import statistics
from pathlib import Path
from typing import Any

from scipy.stats import rankdata, spearmanr


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_RELEASE_PATH = PROJECT_ROOT / "data" / "processed" / "policy_release.json"


def _number(properties: dict[str, Any], key: str, district_name: str) -> float:
    value = properties.get(key)
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{district_name}의 `{key}`는 숫자여야 합니다.")
    number = float(value)
    if not math.isfinite(number):
        raise ValueError(f"{district_name}의 `{key}`는 유한한 숫자여야 합니다.")
    return number


def _minmax(values: list[float]) -> list[float]:
    minimum = min(values)
    maximum = max(values)
    if math.isclose(minimum, maximum):
        return [0.0 for _ in values]
    return [(value - minimum) / (maximum - minimum) for value in values]


def _ranks(names: list[str], scores: list[float]) -> dict[str, int | float]:
    # 동점에 같은 평균 순위를 부여해야 Spearman의 표준 순위 정의와 일치한다.
    descending_ranks = rankdata([-score for score in scores], method="average")
    return {
        name: int(rank) if float(rank).is_integer() else float(rank)
        for name, rank in zip(names, descending_ranks)
    }


def _comparison(
    names: list[str],
    baseline_ranks: dict[str, int | float],
    alternative_ranks: dict[str, int | float],
) -> dict[str, int | float]:
    baseline_values = [float(baseline_ranks[name]) for name in names]
    alternative_values = [float(alternative_ranks[name]) for name in names]
    absolute_shifts = [
        abs(baseline_ranks[name] - alternative_ranks[name])
        for name in names
    ]
    baseline_top10 = {
        name for name, rank in baseline_ranks.items() if rank <= 10
    }
    alternative_top10 = {
        name for name, rank in alternative_ranks.items() if rank <= 10
    }
    top10_overlap = len(baseline_top10 & alternative_top10)
    correlation = spearmanr(baseline_values, alternative_values)
    if not math.isfinite(float(correlation.statistic)):
        raise ValueError("순위 상관을 계산할 변동이 없습니다.")
    return {
        "spearman_rank_correlation": round(
            float(correlation.statistic),
            3,
        ),
        "spearman_p_value": float(correlation.pvalue),
        "top10_overlap_count": top10_overlap,
        "top10_overlap_percent": round(top10_overlap / 10 * 100, 1),
        "median_absolute_rank_shift": round(
            float(statistics.median(absolute_shifts)),
            1,
        ),
        "maximum_absolute_rank_shift": max(absolute_shifts),
    }


def calculate_vdi_rank_sensitivity(
    release: dict[str, Any],
) -> dict[str, Any]:
    features = release.get("vulnerability", {}).get("features")
    if not isinstance(features, list) or not features:
        raise ValueError("VDI 민감도 분석에 필요한 행정동 자료가 없습니다.")

    names: list[str] = []
    baseline_scores: list[float] = []
    eta_log_scores: list[float] = []
    population_log_scores: list[float] = []
    for feature in features:
        properties = feature.get("properties", {})
        district_name = properties.get("adm_nm")
        if not isinstance(district_name, str) or not district_name.strip():
            raise ValueError("VDI 민감도 분석의 행정동 이름이 없습니다.")
        population = _number(properties, "취약인구", district_name)
        eta_minutes = _number(properties, "travel_time_minutes", district_name)
        baseline_vdi = _number(
            properties,
            "vulnerability_index",
            district_name,
        )
        if population < 0 or eta_minutes < 0:
            raise ValueError(f"{district_name}의 인구·ETA가 음수입니다.")
        names.append(district_name)
        baseline_scores.append(baseline_vdi)
        eta_log_scores.append(math.log1p(eta_minutes))
        population_log_scores.append(math.log1p(population))

    population_log_product_scores = [
        eta_log * population_log
        for eta_log, population_log in zip(
            eta_log_scores,
            population_log_scores,
        )
    ]
    eta_normalized = _minmax(eta_log_scores)
    population_normalized = _minmax(population_log_scores)
    equal_minmax_scores = [
        eta_value + population_value
        for eta_value, population_value in zip(
            eta_normalized,
            population_normalized,
        )
    ]
    baseline_ranks = _ranks(names, baseline_scores)
    alternative_scores = {
        "population_log": population_log_product_scores,
        "equal_minmax": equal_minmax_scores,
    }
    alternative_ranks = {
        method: _ranks(names, scores)
        for method, scores in alternative_scores.items()
    }

    return {
        "district_count": len(names),
        "methods": {
            method: _comparison(
                names,
                baseline_ranks,
                ranks,
            )
            for method, ranks in alternative_ranks.items()
        },
        "rows": [
            {
                "adm_nm": name,
                "baseline_rank": baseline_ranks[name],
                "population_log_rank": alternative_ranks["population_log"][name],
                "equal_minmax_rank": alternative_ranks["equal_minmax"][name],
            }
            for name in sorted(names, key=lambda item: baseline_ranks[item])
        ],
    }


def main() -> None:
    release = json.loads(DEFAULT_RELEASE_PATH.read_text(encoding="utf-8"))
    print(
        json.dumps(
            calculate_vdi_rank_sensitivity(release),
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
