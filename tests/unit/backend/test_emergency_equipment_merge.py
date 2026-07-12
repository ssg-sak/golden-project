import asyncio

from app.services.api_clients.data_go_kr_client import _merge_api_rows
import httpx

from app.services.api_clients.data_go_kr_client import _fetch_region_beds_async


def test_emergency_equipment_is_merged_without_overwriting_mediboard_beds() -> None:
    matched = {
        "경북대학교병원": {
            "hvec": 9,
            "total_hvec": 25,
            "available_beds": 9,
            "realtime_source": "nemc-mediboard",
        }
    }
    _merge_api_rows(
        [
            {
                "dutyName": "경북대학교병원",
                "hvctayn": "Y",
                "hvmriayn": "Y",
                "hvangioayn": "Y",
                "hvventiayn": "N",
            }
        ],
        {},
        {"경북대학교병원"},
        matched,
    )

    assert matched["경북대학교병원"]["hvec"] == 9
    assert matched["경북대학교병원"]["realtime_source"] == "nemc-mediboard"
    assert matched["경북대학교병원"]["emergency_equipment_status"] == {
        "CT": True,
        "MRI": True,
        "조영촬영기": True,
        "인공호흡기": False,
    }


def test_realtime_equipment_survives_static_metadata_failure() -> None:
    realtime_xml = """<response><body><items><item><dutyName>경북대학교병원</dutyName><hvec>9</hvec><hvctayn>Y</hvctayn><hvmriayn>Y</hvmriayn><hvangioayn>Y</hvangioayn><hvventiayn>Y</hvventiayn></item></items></body></response>"""

    def handler(request: httpx.Request) -> httpx.Response:
        if "static" in str(request.url):
            raise httpx.ReadTimeout("지연", request=request)
        return httpx.Response(200, text=realtime_xml)

    matched = {"경북대학교병원": {"hvec": 9, "realtime_source": "nemc-mediboard"}}
    async def run() -> None:
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            await _fetch_region_beds_async(
                client,
                "https://test/realtime",
                "https://test/static",
                "key",
                {"경북대학교병원"},
                matched,
            )

    asyncio.run(run())

    assert matched["경북대학교병원"]["emergency_equipment_status"]["인공호흡기"] is True
