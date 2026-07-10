# -*- coding: utf-8 -*-
"""SQLite 병원 DB 로드 (라우트·폴러 공용)."""
from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.exc import SQLAlchemyError

from app.db.database import SessionLocal
from app.db.models import Hospital

_cached_hospitals: list[dict] | None = None

def load_static_hospitals() -> list[dict]:
    global _cached_hospitals
    if _cached_hospitals is not None:
        return _cached_hospitals

    db = SessionLocal()
    try:
        hospitals = db.query(Hospital).all()
        if not hospitals:
            raise HTTPException(
                status_code=503,
                detail="DB에 병원 데이터가 없습니다. 마이그레이션 스크립트를 실행하세요.",
            )
        data = [h.to_dict() for h in hospitals]
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"SQLite DB 연결/조회 에러: {exc}",
        ) from exc
    finally:
        db.close()

    _cached_hospitals = data
    return data

def load_hospital_names() -> list[str]:
    return [str(row.get("name", "")) for row in load_static_hospitals() if row.get("name")]
