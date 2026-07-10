import asyncio
import json
from app.services.api_clients.routing_client import fetch_multiple_etas
from app.core.env import load_dotenv

async def main():
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
