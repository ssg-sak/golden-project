# -*- coding: utf-8 -*-
"""
FastAPI 애플리케이션 정의.

서버 실행은 프로젝트 루트의 backend/main.py 를 사용하세요:

    cd backend
    pip install -r requirements.txt
    uvicorn main:app --reload --host 0.0.0.0 --port 8000
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import hospitals, indicators, vulnerability, optimal_locations, routing

from app.core.env import load_dotenv
from app.services.bed_poller import start_bed_poller, stop_bed_poller

load_dotenv()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await start_bed_poller()
    yield
    await stop_bed_poller()


app = FastAPI(
    title="대구 골든타임 API",
    description="대구 응급의료 거버넌스 플랫폼 — 응급병원·행정동 취약지구 API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(indicators.router)
app.include_router(hospitals.router)
app.include_router(vulnerability.router)
app.include_router(optimal_locations.router)
app.include_router(routing.router)


@app.get("/")
def root() -> dict:
    return {
        "service": "daegu-golden-time-api",
        "name": "대구 골든타임",
        "docs": "/docs",
        "indicators": "/indicators",
        "hospitals": "/api/hospitals",
        "vulnerability": "/api/vulnerability",
        "optimal_locations": "/api/optimal-locations",
    }
