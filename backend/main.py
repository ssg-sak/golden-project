# -*- coding: utf-8 -*-
"""
대구 골든타임 — FastAPI 백엔드 서버 (main.py)

실행 방법
---------
1) 의존성 설치 (최초 1회)

   cd backend
   pip install -r requirements.txt

2) 병원 데이터 준비 (final_hospitals.json 이 없을 때)

   python scripts/05_merge_final_hospitals.py

3) 서버 실행

   cd backend
   uvicorn main:app --reload --host 0.0.0.0 --port 8000

4) API 확인

   - 서비스 정보 : http://localhost:8000/
   - Swagger UI  : http://localhost:8000/docs
   - 병원 목록   : http://localhost:8000/api/hospitals

프론트엔드(React, localhost:5173)에서 위 API를 호출합니다.
"""

from app.main import app

__all__ = ["app"]
