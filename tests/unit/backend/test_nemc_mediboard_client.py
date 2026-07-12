from app.services.api_clients.nemc_mediboard_client import merge_mediboard_rows


def test_mediboard_maps_six_bed_categories_without_inventing_missing_values() -> None:
    matched: dict = {}
    merge_mediboard_rows(
        [
            {
                "emergencyRoomName": "나사렛종합병원",
                "generalEmergencyAvailable": "0",
                "generalEmergencyTotal": "9",
                "childEmergencyAvailable": "5",
                "childEmergencyTotal": "5",
                "deliveryRoomAvailable": None,
                "deliveryRoomTotal": None,
                "npirAvailable": "1",
                "npirTotal": "1",
                "generalAvailable": "3",
                "generalTotal": "3",
                "cohortAvailable": None,
                "cohortTotal": None,
            }
        ],
        {"나사렛종합병원"},
        matched,
    )

    row = matched["나사렛종합병원"]
    assert row["available_beds"] == 0
    assert row["hvec"] == 0
    assert row["hvoc"] == 5
    assert row["special_beds"]["음압격리"] == {
        "available": 1,
        "total": 1,
        "is_available": None,
    }
    assert row["special_beds"]["코호트격리"]["available"] is None


def test_delivery_room_keeps_boolean_availability_separate_from_capacity() -> None:
    matched: dict = {}
    merge_mediboard_rows(
        [
            {
                "emergencyRoomName": "영남대학교병원",
                "generalEmergencyAvailable": "20",
                "generalEmergencyTotal": "28",
                "deliveryRoomAvailable": "Y",
                "deliveryRoomTotal": "2",
            }
        ],
        {"영남대학교병원"},
        matched,
    )
    assert matched["영남대학교병원"]["special_beds"]["분만실"] == {
        "available": None,
        "total": 2,
        "is_available": True,
    }


def test_official_name_with_inserted_daegu_matches_display_name() -> None:
    matched: dict = {}
    merge_mediboard_rows(
        [
            {
                "emergencyRoomName": "계명대학교대구동산병원",
                "generalEmergencyAvailable": "10",
                "generalEmergencyTotal": "20",
            }
        ],
        {"계명대학교 동산병원"},
        matched,
    )
    assert matched["계명대학교 동산병원"]["hvec"] == 10


def test_short_display_name_matches_official_corporate_name() -> None:
    matched: dict = {}
    merge_mediboard_rows(
        [
            {
                "emergencyRoomName": "의료법인구의료재단구병원",
                "generalEmergencyAvailable": "2",
                "generalEmergencyTotal": "10",
            }
        ],
        {"구병원"},
        matched,
    )
    assert matched["구병원"]["hvec"] == 2
