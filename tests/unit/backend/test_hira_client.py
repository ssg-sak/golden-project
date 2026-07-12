from app.services.hira_client import _equipment_status, _items


def test_items_parses_hira_xml() -> None:
    xml = """
    <response>
      <header><resultCode>00</resultCode></header>
      <body><items><item><yadmNm>테스트병원</yadmNm><drTotCnt>12</drTotCnt></item></items></body>
    </response>
    """

    assert _items(xml) == [{"yadmNm": "테스트병원", "drTotCnt": "12"}]


def test_equipment_status_uses_reported_counts() -> None:
    rows = [
        {"oftCdNm": "CT", "oftCnt": "2"},
        {"oftCdNm": "MRI", "oftCnt": "0"},
    ]

    assert _equipment_status(rows) == {"CT": True, "MRI": False}
