# -*- coding: utf-8 -*-
"""프로젝트 루트 .env 로드 및 환경 변수 헬퍼."""
from __future__ import annotations

import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[3]
ENV_FILE = PROJECT_ROOT / ".env"

_PLACEHOLDER_KEYS = {"", "YOUR_API_KEY_HERE"}


def _read_env_file(name: str) -> str | None:
    if not ENV_FILE.exists():
        return None

    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, _, value = stripped.partition("=")
        if key.strip() == name:
            return value.strip().strip('"').strip("'")
    return None


def load_dotenv() -> None:
    """`.env` 키를 `os.environ`에 주입 (파일 값이 프로세스 환경보다 우선)."""
    if not ENV_FILE.exists():
        return

    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, _, value = stripped.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key:
            os.environ[key] = value


def env_str(name: str, default: str | None = None) -> str | None:
    file_value = _read_env_file(name)
    if file_value is not None and file_value.strip():
        return file_value.strip()

    value = os.environ.get(name)
    if value is not None and value.strip():
        return value.strip()

    return default


def env_bool(name: str, default: bool = False) -> bool:
    raw = env_str(name)
    if raw is None:
        return default
    return raw.lower() in {"1", "true", "yes", "on"}


def has_data_go_kr_api_key() -> bool:
    key = (env_str("DATA_GO_KR_API_KEY") or "").strip()
    return key not in _PLACEHOLDER_KEYS

def has_hira_api_key() -> bool:
    key = (env_str("HIRA_API_KEY") or "").strip()
    return key not in _PLACEHOLDER_KEYS

def get_kakao_rest_api_key() -> str | None:
    key = env_str("KAKAO_REST_API_KEY")
    if not key or key in _PLACEHOLDER_KEYS:
        return None
    return key.strip()

def has_kakao_rest_api_key() -> bool:
    return get_kakao_rest_api_key() is not None

def bed_cache_poll_interval_sec() -> int:
    """백그라운드 병상 캐시 폴링 주기(초). 기본 120초(2분)."""
    raw = env_str("BED_CACHE_POLL_INTERVAL_SEC")
    if raw is None:
        return 120
    try:
        value = int(raw)
        return max(60, min(value, 300))
    except ValueError:
        return 120

def use_mock_api() -> bool:
    return env_bool("USE_MOCK_API", default=True)

def should_use_mock_realtime() -> bool:
    if use_mock_api():
        return True
    
    return not has_data_go_kr_api_key()


def get_env(name: str, default: str | None = None) -> str | None:
    """레거시 fetcher/scheduler 호환 alias."""
    return env_str(name, default)


def has_sgis_credentials() -> bool:
    key = (env_str("SGIS_CONSUMER_KEY") or "").strip()
    secret = (env_str("SGIS_CONSUMER_SECRET") or "").strip()
    return bool(key and secret and key not in _PLACEHOLDER_KEYS)


def data_refresh_admin_token() -> str | None:
    token = (env_str("DATA_REFRESH_ADMIN_TOKEN") or "").strip()
    if not token or token in _PLACEHOLDER_KEYS:
        return None
    return token
