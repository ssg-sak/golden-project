from app.services.hira_client import _integer, load_hira_snapshot


def test_integer_accepts_excel_decimal_count() -> None:
    assert _integer("7.0") == 7
    assert _integer("5") == 5


def test_large_hospital_snapshot_keeps_ct_and_mri_ownership() -> None:
    result = load_hira_snapshot(["경북대학교병원", "칠곡경북대학교병원"])
    assert result["경북대학교병원"]["equipment_status"] == {
        "CT": True,
        "MRI": True,
    }
    assert result["경북대학교병원"]["doctors_count"] == 446
