# -*- coding: utf-8 -*-
from __future__ import annotations

import argparse
import asyncio
import json
import re
import sys
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.services.monthly_release import run_monthly_release  # noqa: E402


MODE_LABELS = {
    "check": "공식 자료 확인",
    "test": "시험 실행",
    "publish": "정식 반영",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="공식 월간 인구를 확인하고 정책 분석 결과를 안전하게 갱신합니다.",
    )
    parser.add_argument(
        "--mode",
        choices=tuple(MODE_LABELS),
        default="check",
        help="check=자료 확인, test=공개본을 바꾸지 않는 시험 실행, publish=정식 반영",
    )
    parser.add_argument(
        "--source-month",
        help="재현할 기준월(YYYYMM). 생략하면 최신 공표 대상월을 확인합니다.",
    )
    parser.add_argument(
        "--offline",
        action="store_true",
        help="카카오 API를 호출하지 않고 검증된 도로 경로 캐시만 사용합니다.",
    )
    parser.add_argument(
        "--run-id",
        default=datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ"),
        help="실행 결과를 구분하는 영문·숫자 식별자",
    )
    parser.add_argument(
        "--confirm-reviewed-change",
        action="store_true",
        help="변화 요약을 사람이 확인했으며 큰 변화의 정식 반영을 계속합니다.",
    )
    args = parser.parse_args()
    if args.source_month and not re.fullmatch(r"\d{6}", args.source_month):
        parser.error("--source-month는 YYYYMM 형식이어야 합니다.")
    if not re.fullmatch(r"[A-Za-z0-9._-]+", args.run_id):
        parser.error("--run-id에는 영문, 숫자, 점, 밑줄, 하이픈만 사용할 수 있습니다.")
    return args


async def async_main() -> int:
    args = parse_args()
    print(f"월간 정책 분석: {MODE_LABELS[args.mode]}")
    try:
        result = await run_monthly_release(
            mode=args.mode,
            run_id=args.run_id,
            source_month=args.source_month,
            offline=args.offline,
            confirm_reviewed_change=args.confirm_reviewed_change,
        )
    except Exception as exc:
        print(
            json.dumps(
                {
                    "state": "blocked",
                    "status_label": "실행 오류로 반영 중단",
                    "error_type": type(exc).__name__,
                },
                ensure_ascii=False,
            ),
            file=sys.stderr,
        )
        return 1
    print(json.dumps(asdict(result), ensure_ascii=False, indent=2))
    return 1 if result.state == "blocked" else 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(async_main()))
