# -*- coding: utf-8 -*-

import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# 백엔드 루트 디렉토리 (로컬: project/, Docker: /)
BASE_DIR = Path(__file__).resolve().parents[3]
DB_PATH = BASE_DIR / "data" / "hospitals.db"

# DB 폴더가 없으면 자동 생성 (Docker 배포 환경 에러 방지)
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

# SQLite 엔진 설정 (멀티스레딩 옵션 추가)
engine = create_engine(
    f"sqlite:///{DB_PATH}",
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def database_storage_mode() -> str:
    """Render에서 SQLite 경로가 영구 디스크인지 상태 확인용으로 구분."""
    if os.environ.get("RENDER", "").strip().lower() != "true":
        return "local"
    if os.path.ismount(DB_PATH.parent):
        return "persistent-disk"
    return "ephemeral"


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
