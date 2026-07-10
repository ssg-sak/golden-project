# -*- coding: utf-8 -*-
"""파이썬 내장 딕셔너리와 asyncio.Lock을 활용한 초경량 In-Memory TTL 캐시"""
import asyncio
from typing import Any, Dict, Tuple
from datetime import datetime

class TTLCache:
    def __init__(self, ttl_seconds: int = 60):
        self.ttl_seconds = ttl_seconds
        self._cache: Dict[str, Tuple[Any, datetime]] = {}
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> Any | None:
        async with self._lock:
            if key not in self._cache:
                return None
            
            value, timestamp = self._cache[key]
            age = (datetime.now() - timestamp).total_seconds()
            
            if age > self.ttl_seconds:
                del self._cache[key]
                return None
            
            return value

    async def set(self, key: str, value: Any) -> None:
        async with self._lock:
            self._cache[key] = (value, datetime.now())

    async def clear(self) -> None:
        async with self._lock:
            self._cache.clear()

# 글로벌 캐시 인스턴스 (예: HIRA API 등 범용 데이터 로드용)
global_cache = TTLCache(ttl_seconds=600)  # 기본 10분 TTL
