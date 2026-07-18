# -*- coding: utf-8 -*-
from __future__ import annotations

import argparse
import asyncio
import logging
import os
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.env import load_dotenv
from app.db.database import Base, SessionLocal, engine
from app.services.data_seed import ensure_seeded
from app.services.pipeline import run_data_pipeline

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logger = logging.getLogger(__name__)

TARGET_MAP = {
    "all": {"admin-boundary", "emergency", "moonlight", "population"},
    "admin-boundary": {"admin-boundary"},
    "emergency": {"emergency"},
    "moonlight": {"moonlight"},
    "population": {"population"},
    "rebuild-analysis": {"rebuild-analysis", "population", "emergency", "moonlight"},
    "rebuild-dashboard-summary": {"rebuild-dashboard-summary"},
}


async def main() -> int:
    os.environ.setdefault("PYTHONUTF8", "1")
    os.environ.setdefault("PYTHONIOENCODING", "utf-8")
    load_dotenv()
    Base.metadata.create_all(bind=engine)

    parser = argparse.ArgumentParser(description="공공데이터 수동 갱신 CLI")
    parser.add_argument(
        "target",
        choices=list(TARGET_MAP.keys()),
        help="갱신 대상",
    )
    args = parser.parse_args()

    db = SessionLocal()
    try:
        ensure_seeded(db)
        result = await run_data_pipeline(db, targets=TARGET_MAP[args.target])
        logger.info("Pipeline finished: %s", result)
        if result.error:
            return 1
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
