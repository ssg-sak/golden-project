import os
import httpx
import asyncio
import json
import urllib.parse
from dotenv import load_dotenv

load_dotenv()

HIRA_API_KEY = os.environ.get("HIRA_API_KEY")
URL = "http://apis.data.go.kr/B551182/hospInfoServicev2/getHospBasisList"

async def test_api():
    if not HIRA_API_KEY:
        print("HIRA_API_KEY not found in .env")
        return
    
    yadmNm_encoded = urllib.parse.quote("대구파티마병원")
    full_url = f"{URL}?ServiceKey={HIRA_API_KEY}&yadmNm={yadmNm_encoded}&sidoCd=220000&numOfRows=10&pageNo=1&_type=json"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Accept": "application/json"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            print(f"Requesting HIRA API for 대구파티마병원...")
            response = await client.get(full_url, headers=headers, timeout=10.0)
            print(f"Status Code: {response.status_code}")
            try:
                data = response.json()
                print(json.dumps(data, indent=2, ensure_ascii=False)[:1000])
            except:
                print("Failed to parse JSON. Raw Text:")
                print(response.text[:1000])
        except Exception as e:
            print(f"Request failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_api())
