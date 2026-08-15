from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path
from typing import Any

from PIL import Image as PillowImage
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Table, TableStyle


PROJECT_ROOT = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = PROJECT_ROOT / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from kpi_metrics import calculate_policy_kpis, selected_p_median_resources
from policy_analysis_validation import validate_policy_analysis
from vdi_sensitivity import calculate_vdi_rank_sensitivity


RELEASE_PATH = PROJECT_ROOT / "data" / "processed" / "policy_release.json"
MATRIX_PATH = (
    PROJECT_ROOT
    / "frontend"
    / "public"
    / "data"
    / "actual_road_accessibility_matrix.json"
)
OUTPUT_PATH = (
    PROJECT_ROOT
    / "output"
    / "pdf"
    / "golden-governance-portfolio.pdf"
)
PUBLIC_REPORT_PATH = (
    PROJECT_ROOT
    / "frontend"
    / "public"
    / "data"
    / "reports"
    / "golden-governance-portfolio.pdf"
)

PAGE_WIDTH, PAGE_HEIGHT = landscape(A4)
MARGIN_X = 42
TOP_Y = PAGE_HEIGHT - 42
BOTTOM_Y = 35

FONT_REGULAR = "HYSMyeongJo-Medium"
# ReportLab의 기본 CID 글꼴 목록에는 한국어 고딕이 없어 동일한 명조를
# 제목에도 사용한다. 운영 환경의 로컬 글꼴 설치 여부에 의존하지 않기 위함이다.
FONT_BOLD = FONT_REGULAR

INK = colors.HexColor("#102A43")
SUBTLE = colors.HexColor("#486581")
MUTED = colors.HexColor("#829AB1")
LINE = colors.HexColor("#D9E2EC")
PANEL = colors.HexColor("#F3F7FA")
BLUE = colors.HexColor("#2563EB")
BLUE_DARK = colors.HexColor("#174EA6")
BLUE_LIGHT = colors.HexColor("#EAF2FF")
GOLD = colors.HexColor("#D69E2E")
GOLD_LIGHT = colors.HexColor("#FFF8E1")
ORANGE = colors.HexColor("#DD6B20")
GREEN = colors.HexColor("#2F855A")
GREEN_LIGHT = colors.HexColor("#E6FFFA")
WHITE = colors.white


def read_json(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"{path}의 최상위 JSON 값은 객체여야 합니다.")
    return value


def register_fonts() -> None:
    pdfmetrics.registerFont(UnicodeCIDFont(FONT_REGULAR))


def set_font(pdf: canvas.Canvas, size: float, *, bold: bool = False) -> None:
    pdf.setFont(FONT_BOLD if bold else FONT_REGULAR, size)


def wrap_text(text: str, font_name: str, font_size: float, max_width: float) -> list[str]:
    lines: list[str] = []
    for paragraph in text.splitlines() or [""]:
        if not paragraph:
            lines.append("")
            continue
        words = paragraph.split(" ")
        current = ""
        for word in words:
            candidate = word if not current else f"{current} {word}"
            if pdfmetrics.stringWidth(candidate, font_name, font_size) <= max_width:
                current = candidate
                continue
            if current:
                lines.append(current)
            if pdfmetrics.stringWidth(word, font_name, font_size) <= max_width:
                current = word
                continue
            fragments: list[str] = []
            fragment = ""
            for character in word:
                candidate_fragment = f"{fragment}{character}"
                if (
                    pdfmetrics.stringWidth(
                        candidate_fragment,
                        font_name,
                        font_size,
                    )
                    <= max_width
                ):
                    fragment = candidate_fragment
                else:
                    fragments.append(fragment)
                    fragment = character
            if fragment:
                fragments.append(fragment)
            lines.extend(fragments[:-1])
            current = fragments[-1] if fragments else ""
        if current:
            lines.append(current)
    return lines


def draw_paragraph(
    pdf: canvas.Canvas,
    text: str,
    x: float,
    y: float,
    width: float,
    *,
    size: float = 10,
    leading: float = 15,
    color: colors.Color = INK,
    bold: bool = False,
) -> float:
    font_name = FONT_BOLD if bold else FONT_REGULAR
    pdf.setFillColor(color)
    pdf.setFont(font_name, size)
    for line in wrap_text(text, font_name, size, width):
        pdf.drawString(x, y, line)
        y -= leading
    return y


def draw_bullets(
    pdf: canvas.Canvas,
    bullets: list[str],
    x: float,
    y: float,
    width: float,
    *,
    size: float = 10,
    leading: float = 15,
    color: colors.Color = INK,
) -> float:
    for bullet in bullets:
        pdf.setFillColor(BLUE)
        set_font(pdf, size, bold=True)
        pdf.drawString(x, y, "-")
        y = draw_paragraph(
            pdf,
            bullet,
            x + 14,
            y,
            width - 14,
            size=size,
            leading=leading,
            color=color,
        )
        y -= 5
    return y


def draw_header(
    pdf: canvas.Canvas,
    section: str,
    title: str,
    page_number: int,
) -> float:
    pdf.setFillColor(INK)
    pdf.rect(0, PAGE_HEIGHT - 7, PAGE_WIDTH, 7, fill=1, stroke=0)
    pdf.setFillColor(BLUE)
    set_font(pdf, 9, bold=True)
    pdf.drawString(MARGIN_X, TOP_Y, section)
    pdf.setFillColor(INK)
    set_font(pdf, 23, bold=True)
    pdf.drawString(MARGIN_X, TOP_Y - 31, title)
    pdf.setStrokeColor(LINE)
    pdf.line(MARGIN_X, TOP_Y - 45, PAGE_WIDTH - MARGIN_X, TOP_Y - 45)
    pdf.setFillColor(MUTED)
    set_font(pdf, 8)
    pdf.drawRightString(
        PAGE_WIDTH - MARGIN_X,
        20,
        f"Golden Governance Project Portfolio | {page_number}",
    )
    return TOP_Y - 70


def draw_metric_card(
    pdf: canvas.Canvas,
    x: float,
    y: float,
    width: float,
    height: float,
    label: str,
    value: str,
    note: str,
    *,
    accent: colors.Color = BLUE,
) -> None:
    pdf.setFillColor(PANEL)
    pdf.setStrokeColor(LINE)
    pdf.roundRect(x, y - height, width, height, 10, fill=1, stroke=1)
    pdf.setFillColor(accent)
    pdf.roundRect(x, y - height, 6, height, 3, fill=1, stroke=0)
    pdf.setFillColor(SUBTLE)
    set_font(pdf, 9, bold=True)
    pdf.drawString(x + 18, y - 24, label)
    pdf.setFillColor(INK)
    set_font(pdf, 22, bold=True)
    pdf.drawString(x + 18, y - 52, value)
    draw_paragraph(
        pdf,
        note,
        x + 18,
        y - 72,
        width - 34,
        size=8,
        leading=11,
        color=SUBTLE,
    )


def draw_tag(
    pdf: canvas.Canvas,
    x: float,
    y: float,
    text: str,
    *,
    fill: colors.Color = BLUE_LIGHT,
    ink: colors.Color = BLUE_DARK,
) -> float:
    font_size = 8.5
    width = pdfmetrics.stringWidth(text, FONT_BOLD, font_size) + 20
    pdf.setFillColor(fill)
    pdf.roundRect(x, y - 17, width, 20, 10, fill=1, stroke=0)
    pdf.setFillColor(ink)
    set_font(pdf, font_size, bold=True)
    pdf.drawString(x + 10, y - 11, text)
    return x + width + 7


def draw_image_contain(
    pdf: canvas.Canvas,
    path: Path,
    x: float,
    y: float,
    width: float,
    height: float,
    *,
    border: bool = True,
) -> None:
    with PillowImage.open(path) as image:
        image_width, image_height = image.size
    scale = min(width / image_width, height / image_height)
    draw_width = image_width * scale
    draw_height = image_height * scale
    draw_x = x + (width - draw_width) / 2
    draw_y = y + (height - draw_height) / 2
    if border:
        pdf.setFillColor(WHITE)
        pdf.setStrokeColor(LINE)
        pdf.roundRect(x, y, width, height, 8, fill=1, stroke=1)
    pdf.drawImage(
        ImageReader(str(path)),
        draw_x,
        draw_y,
        draw_width,
        draw_height,
        preserveAspectRatio=True,
        mask="auto",
    )


def draw_table(
    pdf: canvas.Canvas,
    data: list[list[str]],
    x: float,
    y: float,
    column_widths: list[float],
    *,
    row_height: float = 26,
    font_size: float = 8,
) -> float:
    table = Table(
        data,
        colWidths=column_widths,
        rowHeights=[row_height] * len(data),
    )
    table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, 0), FONT_BOLD),
                ("FONTNAME", (0, 1), (-1, -1), FONT_REGULAR),
                ("FONTSIZE", (0, 0), (-1, -1), font_size),
                ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
                ("BACKGROUND", (0, 0), (-1, 0), INK),
                ("BACKGROUND", (0, 1), (-1, -1), WHITE),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, PANEL]),
                ("GRID", (0, 0), (-1, -1), 0.5, LINE),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ALIGN", (1, 1), (-1, -1), "CENTER"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    table_width, table_height = table.wrapOn(pdf, sum(column_widths), PAGE_HEIGHT)
    table.drawOn(pdf, x, y - table_height)
    return y - table_height


def draw_flow(
    pdf: canvas.Canvas,
    labels: list[tuple[str, str]],
    x: float,
    y: float,
    total_width: float,
) -> None:
    gap = 18
    box_width = (total_width - gap * (len(labels) - 1)) / len(labels)
    for index, (title, note) in enumerate(labels):
        box_x = x + index * (box_width + gap)
        pdf.setFillColor(BLUE_LIGHT if index % 2 == 0 else PANEL)
        pdf.setStrokeColor(LINE)
        pdf.roundRect(box_x, y - 92, box_width, 92, 9, fill=1, stroke=1)
        pdf.setFillColor(INK)
        set_font(pdf, 10, bold=True)
        pdf.drawCentredString(box_x + box_width / 2, y - 28, title)
        draw_paragraph(
            pdf,
            note,
            box_x + 12,
            y - 48,
            box_width - 24,
            size=8,
            leading=11,
            color=SUBTLE,
        )
        if index < len(labels) - 1:
            pdf.setStrokeColor(BLUE)
            pdf.setLineWidth(1.5)
            arrow_x = box_x + box_width + 4
            pdf.line(arrow_x, y - 46, arrow_x + gap - 8, y - 46)
            pdf.line(arrow_x + gap - 12, y - 42, arrow_x + gap - 8, y - 46)
            pdf.line(arrow_x + gap - 12, y - 50, arrow_x + gap - 8, y - 46)


def build_portfolio(
    release: dict[str, Any],
    quality_summary: dict[str, int | float],
    policy_kpis: dict[str, dict[str, Any]],
    vdi_sensitivity: dict[str, Any],
) -> None:
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    PUBLIC_REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)

    pediatric = policy_kpis["pediatric"]
    senior = policy_kpis["senior"]
    pdf = canvas.Canvas(
        str(OUTPUT_PATH),
        pagesize=(PAGE_WIDTH, PAGE_HEIGHT),
        invariant=1,
    )
    pdf.setTitle("Golden Governance Project Portfolio 2026-08-06")
    pdf.setAuthor("Golden Governance Project")
    pdf.setSubject("Daegu emergency medical accessibility and governance portfolio")

    # 1. Cover
    pdf.setFillColor(INK)
    pdf.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)
    pdf.setFillColor(BLUE)
    pdf.rect(0, PAGE_HEIGHT - 10, PAGE_WIDTH, 10, fill=1, stroke=0)
    pdf.setFillColor(colors.HexColor("#9FB3C8"))
    set_font(pdf, 11, bold=True)
    pdf.drawString(MARGIN_X, PAGE_HEIGHT - 72, "PROJECT PORTFOLIO / VERIFIED RELEASE")
    pdf.setFillColor(WHITE)
    set_font(pdf, 33, bold=True)
    pdf.drawString(MARGIN_X, PAGE_HEIGHT - 145, "대구 골든타임")
    set_font(pdf, 24, bold=True)
    pdf.drawString(MARGIN_X, PAGE_HEIGHT - 184, "응급의료 접근성과 정책 의사결정을 연결한 데이터 거버넌스")
    pdf.setFillColor(colors.HexColor("#D9E2EC"))
    draw_paragraph(
        pdf,
        "시민의 최근 의료정보 탐색과 행정의 중장기 자원배치 분석을 하나의 검증 가능한 데이터 릴리스로 연결했습니다.",
        MARGIN_X,
        PAGE_HEIGHT - 225,
        690,
        size=13,
        leading=20,
        color=colors.HexColor("#D9E2EC"),
    )
    tag_x = MARGIN_X
    for tag in (
        "2026-08-06 검증",
        f"Release {release['metadata']['version']}",
        "2026.07 인구",
        "일반 차량 도로 ETA",
    ):
        tag_x = draw_tag(
            pdf,
            tag_x,
            PAGE_HEIGHT - 275,
            tag,
            fill=colors.HexColor("#243B53"),
            ink=colors.HexColor("#EAF2FF"),
        )
    metrics = (
        ("행정동", "150"),
        ("기준 기관", "25"),
        ("정책 후보", "9"),
        ("검증 경로", "5,100"),
    )
    card_width = 170
    for index, (label, value) in enumerate(metrics):
        x = MARGIN_X + index * (card_width + 18)
        pdf.setFillColor(colors.HexColor("#243B53"))
        pdf.roundRect(x, 78, card_width, 105, 10, fill=1, stroke=0)
        pdf.setFillColor(colors.HexColor("#9FB3C8"))
        set_font(pdf, 9, bold=True)
        pdf.drawString(x + 16, 157, label)
        pdf.setFillColor(WHITE)
        set_font(pdf, 27, bold=True)
        pdf.drawString(x + 16, 115, value)
    pdf.setFillColor(colors.HexColor("#9FB3C8"))
    set_font(pdf, 8)
    pdf.drawRightString(PAGE_WIDTH - MARGIN_X, 34, "Golden Governance Project")
    pdf.showPage()

    # 2. Executive summary
    y = draw_header(pdf, "01 / EXECUTIVE SUMMARY", "한 장으로 보는 프로젝트 성과", 2)
    card_gap = 14
    card_width = (PAGE_WIDTH - MARGIN_X * 2 - card_gap * 3) / 4
    draw_metric_card(
        pdf,
        MARGIN_X,
        y,
        card_width,
        112,
        "소아 가중 평균 ETA",
        f"{pediatric['baseline_weighted_eta_minutes']:.3f} > {pediatric['after_weighted_eta_minutes']:.3f}분",
        "기존 기관 + p-median 후보 1, 3, 4",
    )
    draw_metric_card(
        pdf,
        MARGIN_X + (card_width + card_gap),
        y,
        card_width,
        112,
        "소아 15분 커버율",
        f"{pediatric['baseline_15min_coverage_percent']:.2f} > {pediatric['after_15min_coverage_percent']:.2f}%",
        "전체 체계 기준 +23.31%p",
        accent=GREEN,
    )
    draw_metric_card(
        pdf,
        MARGIN_X + (card_width + card_gap) * 2,
        y,
        card_width,
        112,
        "어르신 가중 평균 ETA",
        f"{senior['baseline_weighted_eta_minutes']:.3f} > {senior['after_weighted_eta_minutes']:.3f}분",
        "기존 기관 + p-median 후보 1, 2, 3",
        accent=GOLD,
    )
    draw_metric_card(
        pdf,
        MARGIN_X + (card_width + card_gap) * 3,
        y,
        card_width,
        112,
        "어르신 15분 커버율",
        f"{senior['baseline_15min_coverage_percent']:.2f} > {senior['after_15min_coverage_percent']:.2f}%",
        "전체 체계 기준 +4.87%p",
        accent=ORANGE,
    )
    y -= 145
    pdf.setFillColor(INK)
    set_font(pdf, 14, bold=True)
    pdf.drawString(MARGIN_X, y, "핵심 판단")
    y -= 28
    y = draw_bullets(
        pdf,
        [
            "문제: 병원 개수만으로는 취약인구의 거주지와 실제 도로 접근시간 격차를 설명하기 어렵습니다.",
            "해결: 150개 행정동의 취약인구와 25개 기관, 9개 후보까지의 5,100개 도로 경로를 단일 릴리스로 묶었습니다.",
            "의사결정: 가중 평균 ETA를 1차 목적, 전체 체계 15분 커버율을 보조 KPI, 30분 커버율을 외곽권 가드레일로 사용합니다.",
            "현재 상태: 병원 운영정보는 API 갱신 대상이며, 마지막 성공 기록은 2026-07-18입니다. 정적 분석본의 검증 상태와 분리합니다.",
        ],
        MARGIN_X,
        y,
        735,
        size=11,
        leading=17,
    )
    pdf.showPage()

    # 3. Problem and scope
    y = draw_header(pdf, "02 / PROBLEM & SCOPE", "시민 서비스와 정책분석을 분리하고 연결했습니다", 3)
    half_width = (PAGE_WIDTH - MARGIN_X * 2 - 22) / 2
    for index, (title, subtitle, bullets, accent) in enumerate(
        (
            (
                "시민 관점",
                "지금 어디로 연락하고 이동할 것인가",
                [
                    "위치 기반 최근접 의료기관 탐색",
                    "전화·길찾기 중심의 짧은 행동 흐름",
                    "동적 원천 실패 시 미확인 상태와 fallback 명시",
                ],
                BLUE,
            ),
            (
                "정책 관점",
                "어디를 우선 조사하고 검토할 것인가",
                [
                    "행정동별 취약인구와 도로 ETA 결합",
                    "반복 민감도 분석으로 안정 후보 도출",
                    "후보군 내부의 p-median·MCLP 조합 비교",
                ],
                GOLD,
            ),
        )
    ):
        x = MARGIN_X + index * (half_width + 22)
        pdf.setFillColor(PANEL)
        pdf.setStrokeColor(LINE)
        pdf.roundRect(x, y - 248, half_width, 248, 12, fill=1, stroke=1)
        pdf.setFillColor(accent)
        pdf.roundRect(x + 20, y - 46, 72, 24, 12, fill=1, stroke=0)
        pdf.setFillColor(WHITE)
        set_font(pdf, 9, bold=True)
        pdf.drawCentredString(x + 56, y - 38, f"TRACK {index + 1}")
        pdf.setFillColor(INK)
        set_font(pdf, 20, bold=True)
        pdf.drawString(x + 20, y - 83, title)
        draw_paragraph(
            pdf,
            subtitle,
            x + 20,
            y - 112,
            half_width - 40,
            size=11,
            leading=16,
            color=SUBTLE,
        )
        draw_bullets(
            pdf,
            bullets,
            x + 20,
            y - 157,
            half_width - 40,
            size=10,
            leading=15,
        )
    y -= 285
    pdf.setFillColor(INK)
    set_font(pdf, 14, bold=True)
    pdf.drawString(MARGIN_X, y, "프로젝트 수행 범위")
    y -= 22
    draw_bullets(
        pdf,
        [
            "데이터 수집 상태·정적 파일·해시를 분리한 데이터 계보 설계",
            "실제 도로 ETA 기반 VDI·후보 민감도·조합 최적화·KPI 재산출",
            "FastAPI·React 정책 화면과 공개 PDF·EDA·품질 보고서의 정본 정렬",
            "Pytest·Vitest·ESLint·TypeScript·빌드·GitHub Actions를 통한 배포 검증",
        ],
        MARGIN_X,
        y,
        740,
        size=10,
        leading=15,
    )
    pdf.showPage()

    # 4. Architecture and lineage
    y = draw_header(pdf, "03 / ARCHITECTURE", "한 번 계산하고 여러 화면에서 같은 근거를 사용합니다", 4)
    draw_flow(
        pdf,
        [
            ("외부·정적 원천", "기관·인구·행정동·도로 경로"),
            ("품질 계약", "키·해시·결측·좌표·최신성"),
            ("분석 파이프라인", "VDI·민감도·후보·최적화"),
            ("단일 정책 릴리스", "2026-07-r1"),
            ("서비스·보고서", "FastAPI·React·EDA·PDF"),
        ],
        MARGIN_X,
        y,
        PAGE_WIDTH - MARGIN_X * 2,
    )
    y -= 135
    pdf.setFillColor(INK)
    set_font(pdf, 14, bold=True)
    pdf.drawString(MARGIN_X, y, "정본과 책임 경계")
    y -= 18
    draw_table(
        pdf,
        [
            ["정본", "역할", "운영 원칙"],
            [
                "policy_release.json",
                "정책 분석 공개본",
                "150·25·9·5,100 계약과 SHA-256",
            ],
            [
                "actual_road_accessibility_matrix.json",
                "도로 ETA 근거",
                "누락 경로 0건, 보정 이력 보존",
            ],
            [
                "DATA_QUALITY_REPORT.md",
                "품질·최신성 판단",
                "정적 확인일과 외부 성공일 분리",
            ],
            [
                "kpi.md + kpi_metrics.py",
                "운영 KPI 계약",
                "같은 분모·조합으로 매번 재산출",
            ],
        ],
        MARGIN_X,
        y,
        [210, 205, 340],
        row_height=38,
        font_size=8.5,
    )
    pdf.showPage()

    # 5. Data quality
    y = draw_header(pdf, "04 / DATA QUALITY", "정적 분석은 통과, 최신 운영 현황은 조건부입니다", 5)
    draw_table(
        pdf,
        [
            ["검사", "결과", "판정"],
            ["행정동·기관·후보", "150·25·9", "통과"],
            ["도로 경로", "5,100 성공 / 0 누락", "통과"],
            ["VDI 산식", f"{quality_summary['vdi_formula_match_count']}/150 일치", "통과"],
            [
                "좌표 범위",
                f"중심점 150 + 꼭짓점 {quality_summary['geojson_vertex_count']:,}",
                "통과",
            ],
            ["최근접 기관", "전체·소아·어르신 불일치 0", "통과"],
        ],
        MARGIN_X,
        y,
        [245, 300, 190],
        row_height=34,
        font_size=9,
    )
    y -= 232
    column_width = (PAGE_WIDTH - MARGIN_X * 2 - 18) / 2
    pdf.setFillColor(GOLD_LIGHT)
    pdf.setStrokeColor(colors.HexColor("#F6C453"))
    pdf.roundRect(MARGIN_X, y - 170, column_width, 170, 10, fill=1, stroke=1)
    pdf.setFillColor(INK)
    set_font(pdf, 12, bold=True)
    pdf.drawString(MARGIN_X + 18, y - 28, "해석에 영향을 주는 품질 이슈")
    draw_bullets(
        pdf,
        [
            "병원 운영정보는 API 갱신 가능, 마지막 성공 기록은 2026-07-18",
            "인구 2026.07은 보고일 기준 최신 공표 완료월",
            "변동 운영정보와 기준자료 정책분석은 화면·상태 계약에서 분리",
            "좌표 보정 460건은 출발지 5곳·목적지 33곳에 집중",
            "달서구 본리동 ETA 5.62분 동률은 자원 키로 2차 정렬",
        ],
        MARGIN_X + 18,
        y - 52,
        column_width - 36,
        size=9,
        leading=13,
    )
    x_right = MARGIN_X + column_width + 18
    pdf.setFillColor(GREEN_LIGHT)
    pdf.setStrokeColor(colors.HexColor("#81E6D9"))
    pdf.roundRect(x_right, y - 170, column_width, 170, 10, fill=1, stroke=1)
    pdf.setFillColor(INK)
    set_font(pdf, 12, bold=True)
    pdf.drawString(x_right + 18, y - 28, "실패 안전성")
    draw_bullets(
        pdf,
        [
            "EDA 필수 필드 누락 시 0 대체 없이 즉시 실패",
            "경로 누락·키 불일치·VDI 오차·좌표 이탈 시 생성 중단",
            "병상 조회 실패를 0 또는 진료 가능으로 표시하지 않음",
            "인구 완료월과 API 확인·fallback 상태를 별도 보고",
        ],
        x_right + 18,
        y - 52,
        column_width - 36,
        size=9,
        leading=13,
    )
    pdf.showPage()

    # 6. EDA
    y = draw_header(pdf, "05 / EDA", "VDI는 성과지표가 아니라 구조적 민감도 진단입니다", 6)
    draw_image_contain(
        pdf,
        PROJECT_ROOT / "docs" / "images" / "eda" / "correlation_heatmap.png",
        MARGIN_X,
        90,
        430,
        380,
    )
    x_text = 500
    pdf.setFillColor(INK)
    set_font(pdf, 15, bold=True)
    pdf.drawString(x_text, y, "검증된 관찰")
    draw_metric_card(
        pdf,
        x_text,
        y - 25,
        285,
        92,
        "VDI - 취약인구 상관",
        "0.915",
        "산식 구성요소의 구조적 민감도",
        accent=BLUE,
    )
    draw_metric_card(
        pdf,
        x_text,
        y - 130,
        285,
        92,
        "VDI - 일반 차량 ETA 상관",
        "0.034",
        "외부 타당성·인과 효과가 아님",
        accent=GOLD,
    )
    draw_bullets(
        pdf,
        [
            "VDI = ln(1 + ETA) × 취약인구",
            (
                "인구 로그 대안: 순위상관 "
                f"{vdi_sensitivity['methods']['population_log']['spearman_rank_correlation']:.3f}, "
                "상위 10개 중 "
                f"{vdi_sensitivity['methods']['population_log']['top10_overlap_count']}개 유지"
            ),
            (
                "동일가중 정규화: 순위상관 "
                f"{vdi_sensitivity['methods']['equal_minmax']['spearman_rank_correlation']:.3f}, "
                "상위 10개 중 "
                f"{vdi_sensitivity['methods']['equal_minmax']['top10_overlap_count']}개 유지"
            ),
            "확정 서열이 아니며 가중 ETA·15분 커버율과 함께 판단합니다.",
        ],
        x_text,
        y - 250,
        295,
        size=9,
        leading=13,
    )
    pdf.showPage()

    # 7. KPI
    y = draw_header(pdf, "06 / POLICY KPI", "기존 기관을 포함한 전체 체계의 전후 비교", 7)
    draw_image_contain(
        pdf,
        PROJECT_ROOT / "docs" / "images" / "eda" / "policy_improvement.png",
        MARGIN_X,
        160,
        PAGE_WIDTH - MARGIN_X * 2,
        330,
    )
    draw_table(
        pdf,
        [
            ["모드", "선택 후보", "가중 평균 ETA", "15분 커버율", "30분 가드레일"],
            [
                "소아",
                "1, 3, 4",
                f"{pediatric['baseline_weighted_eta_minutes']:.3f} > {pediatric['after_weighted_eta_minutes']:.3f}분",
                f"{pediatric['baseline_15min_coverage_percent']:.2f} > {pediatric['after_15min_coverage_percent']:.2f}%",
                f"{pediatric['baseline_30min_coverage_percent']:.2f} > {pediatric['after_30min_coverage_percent']:.2f}%",
            ],
            [
                "어르신",
                "1, 2, 3",
                f"{senior['baseline_weighted_eta_minutes']:.3f} > {senior['after_weighted_eta_minutes']:.3f}분",
                f"{senior['baseline_15min_coverage_percent']:.2f} > {senior['after_15min_coverage_percent']:.2f}%",
                f"{senior['baseline_30min_coverage_percent']:.2f} > {senior['after_30min_coverage_percent']:.2f}%",
            ],
        ],
        MARGIN_X,
        137,
        [90, 110, 185, 185, 185],
        row_height=30,
        font_size=8.5,
    )
    pdf.showPage()

    # 8. Candidate methodology
    y = draw_header(pdf, "07 / CANDIDATE METHODOLOGY", "한 번의 K=9 실행이 아니라 반복 안정성으로 후보를 만들었습니다", 8)
    draw_flow(
        pdf,
        [
            ("수요점 구성", "취약인구·직선거리 기반 초기 사각지대"),
            ("반복 실행", "K=2~5·시드·거리 상한·군위 조건"),
            ("안정성 평가", "소아 240 + 어르신 240 시나리오"),
            ("공간 병합", "3km 반경 반복 중심점 통합"),
            ("후보 확정", "안정·보류·별도 권역 9곳"),
        ],
        MARGIN_X,
        y,
        PAGE_WIDTH - MARGIN_X * 2,
    )
    y -= 135
    draw_table(
        pdf,
        [
            ["목적함수", "질문", "현재 사용"],
            ["p-median", "가중 평균 ETA를 얼마나 줄이는가", "1차 최적화 목적"],
            ["MCLP 15분", "전체 체계의 15분 커버 인구를 얼마나 넓히는가", "의사결정 보조 KPI"],
            ["MCLP 30분", "외곽권 누락이 생기는가", "보조 가드레일"],
        ],
        MARGIN_X,
        y,
        [145, 370, 240],
        row_height=40,
        font_size=9,
    )
    y -= 185
    pdf.setFillColor(GOLD_LIGHT)
    pdf.setStrokeColor(colors.HexColor("#F6C453"))
    pdf.roundRect(MARGIN_X, y - 90, 755, 90, 10, fill=1, stroke=1)
    pdf.setFillColor(INK)
    set_font(pdf, 11, bold=True)
    pdf.drawString(MARGIN_X + 18, y - 27, "해석 한계")
    draw_paragraph(
        pdf,
        "1~3개 시설 조합을 9개 안정 후보 안에서 전수 비교한 결과입니다. 대구 전역 모든 좌표의 전역 최적해나 실제 시설 신설 효과를 의미하지 않으며, 부지·예산·의료인력·법적 조건을 검토하기 전의 현장조사 우선순위입니다.",
        MARGIN_X + 18,
        y - 50,
        720,
        size=9,
        leading=14,
    )
    pdf.showPage()

    # 9. Citizen product
    y = draw_header(pdf, "08 / PRODUCT - CITIZEN", "긴급 상황에서 필요한 행동을 짧게 연결합니다", 9)
    draw_image_contain(
        pdf,
        PROJECT_ROOT / "docs" / "images" / "citizen-map.png",
        MARGIN_X,
        75,
        485,
        410,
    )
    x_text = 550
    pdf.setFillColor(INK)
    set_font(pdf, 15, bold=True)
    pdf.drawString(x_text, y, "시민 화면의 설계 원칙")
    draw_bullets(
        pdf,
        [
            "현재 위치에서 최근접 기관을 빠르게 확인",
            "병원 상세 > 전화 또는 길찾기로 이어지는 짧은 흐름",
            "최근 조회 데이터와 정적 분석 데이터를 명확히 구분",
            "외부 응답 실패 시 병상값을 0으로 만들지 않고 미확인 표시",
            "대구 외곽의 유효 좌표를 시청 fallback으로 오판하지 않도록 경계 보정",
        ],
        x_text,
        y - 30,
        245,
        size=10,
        leading=15,
    )
    draw_metric_card(
        pdf,
        x_text,
        y - 230,
        245,
        105,
        "위치 판정 회귀검증",
        "구지면·소보면 포함",
        "부산시청 좌표는 계속 대구 외부로 거부",
        accent=GREEN,
    )
    pdf.showPage()

    # 10. Governance product
    y = draw_header(pdf, "09 / PRODUCT - GOVERNANCE", "정책 담당자가 근거와 한계를 함께 보도록 설계했습니다", 10)
    draw_image_contain(
        pdf,
        PROJECT_ROOT / "docs" / "images" / "golden-governance.png",
        MARGIN_X,
        75,
        485,
        410,
    )
    x_text = 550
    pdf.setFillColor(INK)
    set_font(pdf, 15, bold=True)
    pdf.drawString(x_text, y, "정책 화면에서 확인하는 것")
    draw_bullets(
        pdf,
        [
            "행정동별 VDI·취약인구·일반 차량 ETA",
            "안정 후보 9곳과 후보 도출 근거",
            "p-median·15분·30분 목적함수별 조합 차이",
            "전체 체계 기준의 전후 KPI와 후보 전용 도달권 구분",
            "데이터 기준일·한계·현장조사 필요조건",
        ],
        x_text,
        y - 30,
        245,
        size=10,
        leading=15,
    )
    pdf.setFillColor(BLUE_LIGHT)
    pdf.setStrokeColor(colors.HexColor("#B3D4FF"))
    pdf.roundRect(x_text, y - 240, 245, 108, 10, fill=1, stroke=1)
    pdf.setFillColor(INK)
    set_font(pdf, 11, bold=True)
    pdf.drawString(x_text + 15, y - 162, "설명 원칙")
    draw_paragraph(
        pdf,
        "후보는 확정 부지가 아니며, 개선 신호는 승인된 사업 목표 달성이 아닙니다. 수치와 제한조건을 같은 화면에 제공합니다.",
        x_text + 15,
        y - 186,
        215,
        size=9,
        leading=14,
    )
    pdf.showPage()

    # 11. Engineering validation
    y = draw_header(pdf, "10 / ENGINEERING VALIDATION", "분석 결과가 서비스와 문서에서 흔들리지 않게 했습니다", 11)
    card_width = (PAGE_WIDTH - MARGIN_X * 2 - 42) / 4
    for index, (label, value, note, accent) in enumerate(
        (
            ("분석 테스트", "16 passed", "키·좌표·VDI·KPI·동률", BLUE),
            ("백엔드 테스트", "63 passed", "API·파이프라인·공표주기·호출상한", GREEN),
            ("프론트 테스트", "33 passed", "경계·병상·추천·모바일", GOLD),
            ("정적 검사", "All passed", "ESLint·TS·production build", ORANGE),
        )
    ):
        draw_metric_card(
            pdf,
            MARGIN_X + index * (card_width + 14),
            y,
            card_width,
            112,
            label,
            value,
            note,
            accent=accent,
        )
    y -= 148
    draw_table(
        pdf,
        [
            ["통제", "검증 내용", "운영 효과"],
            ["단일 릴리스 SHA-256", "기관·취약도·후보·추적·최적화", "문서·화면의 입력 드리프트 탐지"],
            ["EDA 자동 실행", "노트북 5개 코드 셀·5개 출력", "실행되지 않은 포트폴리오 방지"],
            ["KPI 독립 재산출", "가중 ETA·15분·30분 핵심 수치", "수기 숫자 복사 오류 방지"],
            ["좌표·경로 계약", "14,991 꼭짓점·5,100 경로", "외곽 위치 오판·경로 누락 방지"],
            ["CI 재생성 검사", "정책 릴리스·EDA·노트북", "PR 단계에서 산출물 드리프트 차단"],
        ],
        MARGIN_X,
        y,
        [185, 300, 270],
        row_height=39,
        font_size=8.5,
    )
    pdf.showPage()

    # 12. Limits and demo flow
    y = draw_header(pdf, "11 / HANDOFF", "검증된 범위 안에서 짧고 안정적으로 설명합니다", 12)
    column_width = (PAGE_WIDTH - MARGIN_X * 2 - 22) / 2
    pdf.setFillColor(PANEL)
    pdf.setStrokeColor(LINE)
    pdf.roundRect(MARGIN_X, y - 335, column_width, 335, 12, fill=1, stroke=1)
    pdf.setFillColor(INK)
    set_font(pdf, 15, bold=True)
    pdf.drawString(MARGIN_X + 20, y - 32, "3분 데모 흐름")
    demo_steps = [
        ("1", "시민 지도", "현재 위치 > 최근접 기관 > 전화·길찾기"),
        ("2", "정책 지도", "취약지역 > VDI·ETA·취약인구"),
        ("3", "후보 분석", "9개 후보 > p-median·15분 비교"),
        ("4", "검증 근거", "5,100 경로·품질 보고서·테스트"),
        ("5", "한계", "일반 차량 ETA·정적 릴리스·현장조사 필요"),
    ]
    step_y = y - 70
    for number, title, note in demo_steps:
        pdf.setFillColor(BLUE)
        pdf.circle(MARGIN_X + 36, step_y + 4, 13, fill=1, stroke=0)
        pdf.setFillColor(WHITE)
        set_font(pdf, 9, bold=True)
        pdf.drawCentredString(MARGIN_X + 36, step_y + 1, number)
        pdf.setFillColor(INK)
        set_font(pdf, 10, bold=True)
        pdf.drawString(MARGIN_X + 60, step_y + 4, title)
        draw_paragraph(
            pdf,
            note,
            MARGIN_X + 60,
            step_y - 13,
            column_width - 85,
            size=8.5,
            leading=12,
            color=SUBTLE,
        )
        step_y -= 53
    x_right = MARGIN_X + column_width + 22
    pdf.setFillColor(GOLD_LIGHT)
    pdf.setStrokeColor(colors.HexColor("#F6C453"))
    pdf.roundRect(x_right, y - 335, column_width, 335, 12, fill=1, stroke=1)
    pdf.setFillColor(INK)
    set_font(pdf, 15, bold=True)
    pdf.drawString(x_right + 20, y - 32, "반드시 함께 말할 한계")
    draw_bullets(
        pdf,
        [
            "ETA는 119 이송시간이 아니라 단일 수집 시점의 일반 차량 경로입니다.",
            "병상·의료진·환자 수용 가능성과 실제 환자 흐름은 모델에 포함되지 않습니다.",
            "p-median·MCLP는 안정 후보 9곳 안의 1~3개 조합 비교입니다.",
            "병원 운영정보는 API로 갱신할 수 있지만 2026-07-18 이후 성공 기록은 확인되지 않았습니다.",
            "후보는 현장조사 우선순위이며 확정 부지나 시설 신설안이 아닙니다.",
        ],
        x_right + 20,
        y - 70,
        column_width - 40,
        size=10,
        leading=15,
    )
    pdf.setFillColor(WHITE)
    pdf.setStrokeColor(LINE)
    pdf.roundRect(x_right + 20, y - 305, column_width - 40, 70, 8, fill=1, stroke=1)
    pdf.setFillColor(SUBTLE)
    set_font(pdf, 8, bold=True)
    pdf.drawString(x_right + 34, y - 259, "핵심 증거")
    draw_paragraph(
        pdf,
        "README · EDA_REPORT · DATA_QUALITY_REPORT · kpi.md · 실행된 노트북 · 공개 PDF",
        x_right + 34,
        y - 280,
        column_width - 68,
        size=9,
        leading=13,
        color=INK,
    )
    pdf.setFillColor(MUTED)
    set_font(pdf, 9)
    pdf.drawCentredString(
        PAGE_WIDTH / 2,
        52,
        "검증된 사실은 단정하고, 확인되지 않은 운영 상태는 명확히 제한합니다.",
    )
    pdf.showPage()

    pdf.save()
    shutil.copyfile(OUTPUT_PATH, PUBLIC_REPORT_PATH)


def main() -> None:
    register_fonts()
    release = read_json(RELEASE_PATH)
    matrix = read_json(MATRIX_PATH)
    quality_summary = validate_policy_analysis(release, matrix)
    policy_kpis = calculate_policy_kpis(
        matrix,
        selected_p_median_resources(release),
    )
    vdi_sensitivity = calculate_vdi_rank_sensitivity(release)
    build_portfolio(
        release,
        quality_summary,
        policy_kpis,
        vdi_sensitivity,
    )
    print(f"Project portfolio PDF: {OUTPUT_PATH}")
    print(f"Public policy PDF: {PUBLIC_REPORT_PATH}")


if __name__ == "__main__":
    main()
