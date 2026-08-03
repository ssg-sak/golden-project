from __future__ import annotations

import json
import os
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
RELEASE_MANIFEST_PATH = PROJECT_ROOT / "data" / "processed" / "policy_release_manifest.json"
FALLBACK_VERSION = "2026-07-18-r2"
FALLBACK_RELEASED_AT = "2026-07-18T00:00:00+09:00"


def _manifest() -> dict[str, str]:
    if not RELEASE_MANIFEST_PATH.exists():
        return {}
    try:
        payload = json.loads(RELEASE_MANIFEST_PATH.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}
    return payload if isinstance(payload, dict) else {}


def analysis_version() -> str:
    environment_value = os.getenv("POLICY_ANALYSIS_VERSION", "").strip()
    if environment_value:
        return environment_value
    return str(_manifest().get("version") or FALLBACK_VERSION)


def released_at() -> str:
    environment_value = os.getenv("POLICY_RELEASED_AT", "").strip()
    if environment_value:
        return environment_value
    return str(_manifest().get("released_at") or FALLBACK_RELEASED_AT)
