# -*- coding: utf-8 -*-
"""기존 프론트(useAdminController)와 동일한 상위 25% 고위험 판정."""

from __future__ import annotations


def compute_high_risk_metrics(indices: list[float]) -> tuple[float, int]:
    """
    vulnerability_index 내림차순 정렬 후 상위 25% 경계값(>=)을 임계치로 사용.
    useAdminController.ts L60-64, pipeline.py와 동일 규칙.
    """
    if not indices:
        return 0.0, 0

    sorted_vals = sorted(indices, reverse=True)
    cutoff_idx = int(len(sorted_vals) * 0.25)
    threshold = sorted_vals[cutoff_idx] if cutoff_idx < len(sorted_vals) else sorted_vals[-1]
    high_risk_count = sum(1 for value in indices if value >= threshold)
    return float(threshold), high_risk_count


def format_change_text(diff: int) -> str:
    if diff == 0:
        return "변화 없음"
    if diff > 0:
        return f"{diff} 증가"
    return f"{abs(diff)} 감소"
