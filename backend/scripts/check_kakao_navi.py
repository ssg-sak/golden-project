"""실제 카카오 API 네트워크 호출이 필요한 수동 확인 스크립트.

자동화 테스트가 아니며, pytest 자동 수집 대상에서 분리하기 위해
파일 이름이 ``test_``로 시작하지 않는다.
"""

import asyncio
import json
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.services.api_clients.routing_client import fetch_multiple_etas
from app.core.env import load_dotenv


async def main() -> None:
    load_dotenv()
    etas = await fetch_multiple_etas(
        origin_lat=35.8714,
        origin_lng=128.6014,
        destinations=[
            {"name": "경북대학교병원", "lat": 35.8663, "lng": 128.6031},
            {"name": "계명대학교동산병원", "lat": 35.8539, "lng": 128.4802}
        ]
    )
    print(json.dumps(etas, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
