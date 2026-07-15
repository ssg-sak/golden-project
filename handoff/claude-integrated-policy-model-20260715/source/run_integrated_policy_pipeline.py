from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
AI_MODEL_DIR = PROJECT_ROOT / "ai-model"


def run_step(label: str, script_name: str, *arguments: str) -> None:
    command = [sys.executable, str(AI_MODEL_DIR / script_name), *arguments]
    print(f"\n[{label}] {' '.join(command)}")
    environment = {
        **os.environ,
        "PYTHONIOENCODING": "utf-8",
        "PYTHONUTF8": "1",
        "LOKY_MAX_CPU_COUNT": str(os.cpu_count() or 1),
    }
    subprocess.run(command, cwd=PROJECT_ROOT, check=True, env=environment)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="K-Means 안정 후보부터 실제 도로망 입지 최적화까지 순서대로 실행합니다.",
    )
    parser.add_argument(
        "--offline",
        action="store_true",
        help="Kakao API를 호출하지 않고 기존 디스크 캐시만 사용합니다.",
    )
    parser.add_argument("--concurrency", type=int, default=5)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    run_step("1/5 후보 민감도 분석", "run_candidate_sensitivity_analysis.py")
    run_step("2/5 후보 추적 데이터", "build_accessibility_candidate_trace.py")
    run_step("3/5 안정 후보 및 자원 시나리오", "build_stable_resource_recommendations.py")

    road_arguments = ["--cache-only"] if args.offline else ["--concurrency", str(max(1, args.concurrency))]
    run_step("4/5 실제 도로망 및 입지 최적화", "build_actual_road_accessibility.py", *road_arguments)
    run_step("5/5 최종 후보 시각화", "visualize_stable_policy_candidates.py")
    print("\n통합 정책 모델 파이프라인 완료")


if __name__ == "__main__":
    main()
