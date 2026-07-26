import hashlib
import json
from pathlib import Path
from typing import Any

import pandas as pd
import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
from matplotlib import font_manager
import seaborn as sns

from kpi_metrics import calculate_policy_kpis, selected_p_median_resources
from policy_analysis_validation import validate_policy_analysis
from vdi_sensitivity import calculate_vdi_rank_sensitivity


KOREAN_FONT_CANDIDATES = (
    "Malgun Gothic",
    "AppleGothic",
    "Noto Sans CJK KR",
    "Noto Sans KR",
    "NanumGothic",
)


def payload_sha256(value: object) -> str:
    encoded = json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def configure_plot_font() -> bool:
    available = {font.name for font in font_manager.fontManager.ttflist}
    selected = next(
        (font for font in KOREAN_FONT_CANDIDATES if font in available),
        None,
    )
    plt.rc("font", family=selected or "DejaVu Sans")
    plt.rcParams["axes.unicode_minus"] = False
    return selected is not None


def plot_text(korean: str, english: str, korean_font_available: bool) -> str:
    return korean if korean_font_available else english


def markdown_cell(source: str) -> dict[str, Any]:
    return {
        "cell_type": "markdown",
        "metadata": {},
        "source": source.splitlines(keepends=True),
    }


def code_cell(source: str) -> dict[str, Any]:
    return {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": source.splitlines(keepends=True),
    }


def add_bar_labels(
    axis: Any,
    bars: Any,
    suffix: str,
    decimals: int,
) -> None:
    for bar in bars:
        value = float(bar.get_height())
        axis.annotate(
            f"{value:.{decimals}f}{suffix}",
            (bar.get_x() + bar.get_width() / 2, value),
            xytext=(0, 4),
            textcoords="offset points",
            ha="center",
            va="bottom",
            fontsize=9,
            fontweight="bold",
        )


def create_policy_comparison_plot(
    policy_kpis: dict[str, dict[str, Any]],
    output_path: Path,
    korean_font_available: bool,
) -> None:
    mode_labels = [
        plot_text("소아", "Pediatric", korean_font_available),
        plot_text("어르신", "Senior", korean_font_available),
    ]
    x_positions = list(range(len(mode_labels)))
    width = 0.34
    baseline_color = "#CBD5E1"
    after_color = "#2563EB"
    edge_color = "#334155"

    fig, axes = plt.subplots(1, 2, figsize=(14, 6))
    metrics = (
        (
            "baseline_weighted_eta_minutes",
            "after_weighted_eta_minutes",
            plot_text(
                "취약인구 가중 평균 ETA",
                "Vulnerable-population-weighted mean ETA",
                korean_font_available,
            ),
            plot_text("분", "Minutes", korean_font_available),
            3,
        ),
        (
            "baseline_15min_coverage_percent",
            "after_15min_coverage_percent",
            plot_text(
                "전체 체계의 15분 커버율",
                "15-minute coverage of the full system",
                korean_font_available,
            ),
            "%",
            2,
        ),
    )
    baseline_bars = None
    after_bars = None
    for axis, (baseline_key, after_key, title, unit, decimals) in zip(
        axes,
        metrics,
    ):
        baseline_values = [
            float(policy_kpis[mode][baseline_key])
            for mode in ("pediatric", "senior")
        ]
        after_values = [
            float(policy_kpis[mode][after_key])
            for mode in ("pediatric", "senior")
        ]
        baseline_bars = axis.bar(
            [position - width / 2 for position in x_positions],
            baseline_values,
            width,
            color=baseline_color,
            edgecolor=edge_color,
            linewidth=0.8,
        )
        after_bars = axis.bar(
            [position + width / 2 for position in x_positions],
            after_values,
            width,
            color=after_color,
            edgecolor=edge_color,
            linewidth=0.8,
        )
        axis.set_title(title)
        axis.set_ylabel(unit)
        axis.set_xticks(x_positions, mode_labels)
        axis.set_ylim(
            0,
            100 if unit == "%" else max(baseline_values + after_values) * 1.22,
        )
        axis.grid(axis="y", color="#E2E8F0", linewidth=0.8)
        axis.set_axisbelow(True)
        add_bar_labels(axis, baseline_bars, unit if unit == "%" else "", decimals)
        add_bar_labels(axis, after_bars, unit if unit == "%" else "", decimals)

    fig.suptitle(
        plot_text(
            "기존 기관을 포함한 전체 체계의 접근성 전후 비교",
            "Before-and-after accessibility of the full system",
            korean_font_available,
        ),
        fontsize=15,
        fontweight="bold",
    )
    fig.legend(
        (baseline_bars, after_bars),
        (
            plot_text("기준선", "Baseline", korean_font_available),
            plot_text("후보 적용", "With candidates", korean_font_available),
        ),
        loc="upper center",
        bbox_to_anchor=(0.5, 0.91),
        ncol=2,
        frameon=False,
    )
    fig.text(
        0.5,
        0.84,
        plot_text(
            "2026.06 인구 · 일반 차량 도로 ETA · 기존 기관 + p-median 3개 후보",
            "June 2026 population · ordinary-vehicle road ETA · existing resources + three p-median candidates",
            korean_font_available,
        ),
        ha="center",
        color="#475569",
    )
    fig.tight_layout(rect=(0, 0, 1, 0.78))
    fig.savefig(output_path, dpi=300, bbox_inches="tight")
    plt.close(fig)


def main() -> None:
    # Set paths
    project_root = Path(__file__).resolve().parent.parent
    release_path = project_root / "frontend" / "public" / "data" / "policy_release.json"
    matrix_path = (
        project_root
        / "data"
        / "processed"
        / "actual_road_accessibility_matrix.json"
    )
    analysis_dir = project_root / "analysis"
    docs_dir = project_root / "docs"
    img_dir = docs_dir / "images" / "eda"

    analysis_dir.mkdir(parents=True, exist_ok=True)
    img_dir.mkdir(parents=True, exist_ok=True)

    korean_font_available = configure_plot_font()

    # 1. Load Data
    print("Loading data...")
    with release_path.open(encoding="utf-8") as file:
        release = json.load(file)
    with matrix_path.open(encoding="utf-8") as file:
        matrix = json.load(file)

    metadata = release["metadata"]
    vul_data = release["vulnerability"]
    hospitals = release["hospitals"]
    candidates = release["candidates"]
    policy = release["optimization"]
    expected_routes = metadata["district_count"] * (
        metadata["resource_count"] + metadata["candidate_count"]
    )
    if not (
        metadata["district_count"] == len(vul_data["features"]) == 150
        and metadata["resource_count"] == len(hospitals) == 25
        and metadata["candidate_count"] == len(candidates) == 9
        and metadata["route_count"] == metadata["successful_route_count"] == expected_routes == 5_100
        and metadata["missing_route_count"] == 0
    ):
        raise ValueError("정책 분석본의 행정동·기관·후보·도로 경로 계약이 일치하지 않습니다.")

    payload_contract = {
        "hospitals": hospitals,
        "vulnerability": vul_data,
        "candidates": candidates,
        "candidate_trace": release["candidate_trace"],
        "optimization": policy,
    }
    for payload_name, payload in payload_contract.items():
        expected_hash = metadata["content_sha256"].get(payload_name)
        actual_hash = payload_sha256(payload)
        if expected_hash != actual_hash:
            raise ValueError(
                f"정책 분석본의 {payload_name} SHA-256 계약이 일치하지 않습니다."
            )

    quality_summary = validate_policy_analysis(release, matrix)
    policy_kpis = calculate_policy_kpis(
        matrix,
        selected_p_median_resources(release),
    )
    vdi_sensitivity = calculate_vdi_rank_sensitivity(release)

    # Parse Features
    features = []
    for feat in vul_data['features']:
        props = feat['properties']
        features.append({
            'adm_nm': props['adm_nm'],
            'pop_senior': props['65세이상_인구'],
            'pop_pediatric': props['0~9세_인구'],
            'pop_vul': props['취약인구'],
            'min_dist': props['min_dist_to_hospital'],
            'road_eta': props['travel_time_minutes'],
            'nearest_tier': props['nearest_hospital_tier'],
            'vdi': props['vulnerability_index'],
            'vdi_norm': props['vdi_norm'],
            'lat': props['center_lat'],
            'lng': props['center_lng']
        })
    df = pd.DataFrame(features)
    
    # Hospital DF
    df_hosp = pd.DataFrame(hospitals)

    # 2. Plots
    print("Generating plots...")
    # Plot 1: VDI and Distance Distribution
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    sns.histplot(df['vdi'], bins=20, ax=axes[0], color='salmon', kde=True)
    axes[0].axvline(
        metadata["risk_threshold"],
        color="darkred",
        linestyle="--",
        label=plot_text("상위 25% 상대 경계", "Top-quartile boundary", korean_font_available),
    )
    axes[0].set_title(plot_text("행정동별 도로 ETA 기반 VDI 분포", "Road-ETA VDI distribution", korean_font_available))
    axes[0].set_xlabel("VDI")
    axes[0].legend()
    
    sns.histplot(df['road_eta'], bins=20, ax=axes[1], color='skyblue', kde=True)
    axes[1].set_title(plot_text("최근접 분석 기관까지의 일반 차량 ETA 분포", "Road ETA to nearest analyzed resource", korean_font_available))
    axes[1].set_xlabel(plot_text("도로 이동시간 (분)", "Road ETA (minutes)", korean_font_available))
    plt.tight_layout()
    plt.savefig(img_dir / "vdi_distance_dist.png", dpi=300)
    plt.close()

    # Plot 2: Correlation Heatmap
    corr_cols = ['pop_senior', 'pop_pediatric', 'pop_vul', 'min_dist', 'road_eta', 'vdi']
    corr_matrix = df[corr_cols].corr()
    plt.figure(figsize=(8, 6))
    sns.heatmap(corr_matrix, annot=True, cmap='coolwarm', fmt=".2f")
    plt.title(plot_text("VDI 산식 구성요소 민감도 점검", "VDI component sensitivity check", korean_font_available))
    plt.tight_layout()
    plt.savefig(img_dir / "correlation_heatmap.png", dpi=300)
    plt.close()

    # Plot 3: Accessibility by Tier
    plt.figure(figsize=(8, 5))
    sns.boxplot(x='nearest_tier', y='road_eta', data=df, hue='nearest_tier', palette='Set2', legend=False)
    plt.title(plot_text("최근접 분석 기관 분류별 도로 ETA 분포", "Road ETA by nearest resource class", korean_font_available))
    plt.xlabel(plot_text("기관 분류 (1: 대형, 2: 준종합, 3: 소아 야간·휴일)", "Resource class (1, 2, 3)", korean_font_available))
    plt.ylabel(plot_text("도로 이동시간 (분)", "Road ETA (minutes)", korean_font_available))
    plt.tight_layout()
    plt.savefig(img_dir / "accessibility_by_tier.png", dpi=300)
    plt.close()

    # Plot 4: Top 10 Vulnerable Districts
    top10_vdi = df.sort_values('vdi', ascending=False).head(10)
    plt.figure(figsize=(10, 6))
    top10_plot = top10_vdi.copy()
    if not korean_font_available:
        top10_plot["plot_label"] = [f"District {index}" for index in range(1, len(top10_plot) + 1)]
    else:
        top10_plot["plot_label"] = top10_plot["adm_nm"]
    sns.barplot(x='vdi', y='plot_label', data=top10_plot, hue='plot_label', palette='Reds_r', legend=False)
    plt.title(plot_text("현재 분석본의 VDI 상위 10개 행정동", "Top 10 districts by current VDI", korean_font_available))
    plt.xlabel(plot_text("응급의료 취약성지수 (VDI)", "Vulnerability index (VDI)", korean_font_available))
    plt.ylabel(plot_text("행정동", "District rank", korean_font_available))
    plt.tight_layout()
    plt.savefig(img_dir / "top10_vulnerable_districts.png", dpi=300)
    plt.close()

    # Plot 5: Existing resources plus the three-candidate p-median combination.
    # The 30-minute measure is intentionally kept out of the primary chart
    # because its high baseline makes it a low-discrimination guardrail.
    create_policy_comparison_plot(
        policy_kpis,
        img_dir / "policy_improvement.png",
        korean_font_available,
    )

    # 3. Create EDA Report (Markdown)
    print("Generating EDA_REPORT.md...")
    top_names = ", ".join(top10_vdi["adm_nm"].str.replace("대구광역시 ", "", regex=False).head(3))
    report_content = f"""# 대구 골든타임 정책분석 탐색적 데이터 분석(EDA)

이 문서는 `{metadata['version']}` 내부 분석 식별자에 해당하는 **2026.07.18 검증본**을 탐색적으로 점검합니다. EDA는 현재 데이터의 분포와 변수 관계를 설명하며 의료적 위험 임계값이나 시설 신설 효과를 확정하지 않습니다.

## 1. 데이터 개요 및 기초 구조
- **분석 대상 행정동 수**: {len(df)}개
- **고려된 응급의료기관 수**: {len(df_hosp)}개
- **정책 후보 수**: {len(candidates)}개
- **검증된 도로 경로**: {metadata['successful_route_count']:,}건 / 누락 {metadata['missing_route_count']}건
- **인구 기준월**: {metadata['population_base_month']}
- **취약 인구 평균**: {df['pop_vul'].mean():.1f}명 / 행정동

분석본 생성 단계에서 행정동 150개, 기관 25개, 후보 9개와 경로 5,100개의 계약을 검사합니다. 병원·행정동·후보·후보 추적·최적화 자료의 SHA-256도 단일 릴리스 메타데이터와 대조합니다. 이 검사는 구조적 완전성과 파일 계보를 의미하며 원천자료의 임상적 타당성이나 최신성을 자동으로 보증하지는 않습니다.

## 2. 데이터 품질 관리와 실패 안전성
검증본의 품질 처리는 실제 코드와 산출물에 기록된 다음 규칙으로 한정합니다.

- **도로 연결 좌표 재시도**: Kakao Mobility가 원 좌표의 경로를 반환하지 못하면 출발지 또는 목적지 주변의 작은 좌표 오프셋을 순차적으로 시도합니다. 보정 오프셋은 경로별로 기록하며, 현재 5,100건 중 {metadata['coordinate_snap_route_count']}건에 보정 기록이 있습니다. 보정 거리의 평균은 {metadata['coordinate_snap_average_distance_km']:.3f}km, 최댓값은 {metadata['coordinate_snap_max_distance_km']:.3f}km이고 허용 한도 0.75km를 넘으면 생성기가 실패합니다.
- **좌표 보정 집중도**: 보정 460건은 전체 경로의 9.02%지만 출발지 5곳·목적지 33곳에 집중됩니다. 특히 `candidate:pediatric:6`과 `candidate:senior:2`는 목적지 보정이 각각 150건이므로, 460건을 서로 독립적인 460개 위치 문제로 해석하지 않습니다.
- **경로 누락 처리**: 누락 경로를 임의 ETA로 대치하지 않습니다. 현재 검증본은 성공 {metadata['successful_route_count']:,}건·누락 {metadata['missing_route_count']}건이며, 누락이 하나라도 있으면 도로 행렬 검증을 통과하지 못합니다.
- **최근접 기관 동률 처리**: ETA 최솟값과 저장 기관이 일치하는지 검사합니다. 현재 ETA 동률 행정동은 {quality_summary['nearest_eta_tie_district_count']}곳이며 수치 영향은 없지만, 재생성 시에는 ETA와 기관 키를 함께 정렬해 이름 표시를 고정합니다.
- **최근 조회 병상 결측 처리**: 시민 서비스에서 병상 조회 실패를 `0`이나 진료 가능으로 바꾸지 않습니다. 이전 캐시 또는 기본 기관정보는 유지하되 병상값은 미확인으로 표시하고 전화 확인을 안내합니다. 이 운영 데이터는 고정된 정책분석 ETA와 별개입니다.

전체 점검 결과와 기준일·원천별 최신성은 [데이터 품질 보고서](DATA_QUALITY_REPORT.md)를 정본으로 사용합니다.

## 3. 응급의료 접근성 및 VDI 분포
행정동별 취약성 지표의 기초 분포를 파악합니다.

![VDI 및 거리 분포](images/eda/vdi_distance_dist.png)

**해석(Insights)**:
- 도로 ETA 기반 VDI는 {df['vdi'].min():,.2f}~{df['vdi'].max():,.2f}, 평균 {df['vdi'].mean():,.2f}, 중앙값 {df['vdi'].median():,.2f}입니다.
- 현재 분석본은 VDI 상위 25%를 우선 확인 대상으로 구분하며 상대 경계값은 {metadata['risk_threshold']:,.2f}, 해당 행정동은 {metadata['high_risk_district_count']}개입니다.
- 일반 차량 ETA는 {df['road_eta'].min():.2f}~{df['road_eta'].max():.2f}분입니다. 이는 수집 시점의 분석용 경로이며 119 구급차 이송시간이 아닙니다.

## 4. VDI 산식 구성요소와 민감도 점검
현재 VDI는 `ln(1 + 일반 차량 ETA) × 취약인구`로 정의됩니다. 따라서 VDI와 취약인구·ETA의 상관은 독립적인 발견이 아니라 산식에 포함된 구성요소가 결과에 미치는 구조적 민감도를 점검하는 값입니다.

![VDI 산식 구성요소 민감도 히트맵](images/eda/correlation_heatmap.png)

**해석(Insights)**:
- 현재 VDI와 취약인구의 피어슨 상관계수는 {df['vdi'].corr(df['pop_vul']):.3f}, 도로 ETA와의 상관계수는 {df['vdi'].corr(df['road_eta']):.3f}입니다.
- **통계적 의미**: 두 변수는 모두 VDI 산식의 구성요소이므로 이 상관은 독립적인 외부 타당성 검증이나 인과 효과가 아닙니다. 현재 150개 행정동의 값 범위와 `ln` 변환을 적용한 산식 안에서 취약인구가 ETA보다 결과에 더 강하게 결합돼 있음을 보여주는 구성요소 민감도 점검입니다.

| 대안 산식 | 기준선과 Spearman 순위상관 | 상위 10개 겹침 | 중앙 순위 이동 | 최대 순위 이동 |
|---|---:|---:|---:|---:|
| `ln(1+ETA) × ln(1+취약인구)` | {vdi_sensitivity['methods']['population_log']['spearman_rank_correlation']:.3f} | {vdi_sensitivity['methods']['population_log']['top10_overlap_count']}/10 | {vdi_sensitivity['methods']['population_log']['median_absolute_rank_shift']:.1f}위 | {vdi_sensitivity['methods']['population_log']['maximum_absolute_rank_shift']}위 |
| 로그 구성요소 Min-Max 정규화 후 동일가중 합 | {vdi_sensitivity['methods']['equal_minmax']['spearman_rank_correlation']:.3f} | {vdi_sensitivity['methods']['equal_minmax']['top10_overlap_count']}/10 | {vdi_sensitivity['methods']['equal_minmax']['median_absolute_rank_shift']:.1f}위 | {vdi_sensitivity['methods']['equal_minmax']['maximum_absolute_rank_shift']}위 |

- **정책적 시사점**: 인구 로그 곱셈 대안은 상위 10개 중 2개만 유지되고 순위상관이 0.518이어서 현재 우선순위가 산식 선택에 민감합니다. 동일가중 정규화 대안은 상위 10개 중 7개를 유지하지만 최대 70위 이동이 남습니다. 따라서 현재 VDI는 확정 서열이 아니라 한 가지 내부 우선순위 기준으로만 사용하고, 가중 ETA·15분 커버율과 함께 판단해야 합니다.

## 5. 병원 티어별 접근성 비교

![티어별 접근성](images/eda/accessibility_by_tier.png)

**해석(Insights)**:
- 분류별 상자그림은 행정동별 최근접 분석 기관의 도로 ETA 분포를 비교합니다.
- 기관 분류는 서비스·분석을 위한 프로젝트 내부 분류이며 개별 환자의 진료 가능성이나 병원의 실제 수용 역량 순위를 뜻하지 않습니다.

## 6. 최우선 취약 지역 (Top 10) 파악

![취약 지역 Top 10](images/eda/top10_vulnerable_districts.png)

**해석(Insights)**:
- 현재 상위 3개는 {top_names}입니다.
- 상위 지역은 취약인구와 일반 차량 ETA가 결합된 결과입니다. 순위만으로 시설 신설·이동형 진료·예산 투입을 확정할 수 없습니다.

## 7. 기존 기관 포함 전체 체계의 접근성 전후 비교
p-median의 3개 후보 조합을 적용하되 기존 기관을 제거하지 않고, 행정동별로 기존 기관과 선택 후보 중 더 짧은 ETA를 사용해 전후를 비교합니다.

![취약인구 가중 평균 ETA와 전체 체계 15분 커버율 전후 비교](images/eda/policy_improvement.png)

**해석(Insights)**:
- 소아 후보 {', '.join(map(str, policy_kpis['pediatric']['selected_candidate_ids']))} 적용 시 취약인구 가중 평균 ETA는 {policy_kpis['pediatric']['baseline_weighted_eta_minutes']:.3f}분에서 {policy_kpis['pediatric']['after_weighted_eta_minutes']:.3f}분으로 줄고, 전체 체계의 15분 커버율은 {policy_kpis['pediatric']['baseline_15min_coverage_percent']:.2f}%에서 {policy_kpis['pediatric']['after_15min_coverage_percent']:.2f}%로 증가합니다.
- 어르신 후보 {', '.join(map(str, policy_kpis['senior']['selected_candidate_ids']))} 적용 시 취약인구 가중 평균 ETA는 {policy_kpis['senior']['baseline_weighted_eta_minutes']:.3f}분에서 {policy_kpis['senior']['after_weighted_eta_minutes']:.3f}분으로 줄고, 전체 체계의 15분 커버율은 {policy_kpis['senior']['baseline_15min_coverage_percent']:.2f}%에서 {policy_kpis['senior']['after_15min_coverage_percent']:.2f}%로 증가합니다.
- 전체 체계의 30분 커버율은 소아 {policy_kpis['pediatric']['baseline_30min_coverage_percent']:.2f}%→{policy_kpis['pediatric']['after_30min_coverage_percent']:.2f}%, 어르신 {policy_kpis['senior']['baseline_30min_coverage_percent']:.2f}%→{policy_kpis['senior']['after_30min_coverage_percent']:.2f}%입니다. 기준선부터 높아 주 KPI가 아니라 외곽권 누락 감시용 보조 지표로 둡니다.
- 결과는 후보군 내부의 수학적 비교이며 대구 전역의 전역 최적해, 시설 건립 효과, 실제 환자 수용 성과를 의미하지 않습니다.

## 결론 및 후속 과제 (Next Steps)
- **결론**: 현재 분석은 인구가 많은 도시권과 이동시간이 긴 외곽권을 함께 확인해야 함을 보여줍니다.
- **후보지 도출 근거(9곳)**: 정책 후보 9곳은 `K=9`로 한 번 실행한 결과가 아닙니다. K=2~5·난수 시드·거리 상한·군위 처리 조건을 조합해 소아 240회와 어르신 240회를 실행하고, 반경 3km 안에서 반복 출현한 중심점을 병합해 안정·보류·별도 권역 후보로 구성한 결과입니다.
- **데이터 한계**: ETA는 수집 시점의 일반 차량 경로이며 병상·의료진·구급차 우선통행·실제 환자 흐름을 반영하지 않습니다.
- **후속 과제**: 원천 수집일 확정, 시간대별 반복 수집, 실제 이송자료를 이용한 외부 타당성 검증이 필요합니다. 검증 전 후보는 현장조사 우선순위로만 해석합니다.
"""
    with open(docs_dir / "EDA_REPORT.md", "w", encoding='utf-8') as f:
        f.write(report_content)

    # 4. Generate a reader-facing Jupyter notebook.
    print("Generating golden_governance_eda.ipynb...")
    pediatric_kpi = policy_kpis["pediatric"]
    senior_kpi = policy_kpis["senior"]
    notebook = {
        "cells": [
            markdown_cell(
                f"""# 대구광역시 응급의료 접근성 포트폴리오 EDA

## tl;dr

- 분석 릴리스 `{metadata['version']}`는 행정동 150개, 기준 기관 25개, 후보 9개, 도로 경로 5,100개를 포함하며 누락 경로는 0개입니다.
- p-median 3개 후보를 기존 기관과 함께 적용하면 취약인구 가중 평균 ETA는 소아 {pediatric_kpi['baseline_weighted_eta_minutes']:.3f}→{pediatric_kpi['after_weighted_eta_minutes']:.3f}분, 어르신 {senior_kpi['baseline_weighted_eta_minutes']:.3f}→{senior_kpi['after_weighted_eta_minutes']:.3f}분으로 감소합니다.
- 전체 체계의 15분 커버율은 소아 {pediatric_kpi['baseline_15min_coverage_percent']:.2f}→{pediatric_kpi['after_15min_coverage_percent']:.2f}%, 어르신 {senior_kpi['baseline_15min_coverage_percent']:.2f}→{senior_kpi['after_15min_coverage_percent']:.2f}%입니다.
- 30분 커버율은 기준선부터 높아 외곽권 누락 감시용 보조 지표로 사용합니다.
"""
            ),
            markdown_cell(
                """## Context & Methods

이 노트북은 외부 검토자와 분석 검토자가 같은 산출물을 재실행할 수 있도록 만든 분석 보고서입니다.

### Key Assumptions

- 인구 기준월은 2026.06입니다.
- ETA는 단일 수집 시점의 일반 차량 도로 경로이며 119 이송시간이 아닙니다.
- 후보는 확정 부지가 아니라 현장조사 우선순위입니다.
- VDI는 `ln(1 + 일반 차량 ETA) × 취약인구`인 내부 상대 비교 지표입니다.

### Sources

- `frontend/public/data/policy_release.json`
- `data/processed/actual_road_accessibility_matrix.json`
- `scripts/policy_analysis_validation.py`
- `scripts/kpi_metrics.py`
"""
            ),
            code_cell(
                """import hashlib
import json
import sys
from pathlib import Path

import matplotlib.pyplot as plt
from matplotlib import font_manager
import pandas as pd
import seaborn as sns

project_root = next(
    path
    for path in (Path.cwd(), Path.cwd().parent)
    if (path / "frontend" / "public" / "data" / "policy_release.json").exists()
)
scripts_dir = project_root / "scripts"
if str(scripts_dir) not in sys.path:
    sys.path.insert(0, str(scripts_dir))

from kpi_metrics import calculate_policy_kpis, selected_p_median_resources
from policy_analysis_validation import validate_policy_analysis
from vdi_sensitivity import calculate_vdi_rank_sensitivity

available_fonts = {font.name for font in font_manager.fontManager.ttflist}
font_candidates = (
    "Malgun Gothic",
    "AppleGothic",
    "Noto Sans CJK KR",
    "Noto Sans KR",
    "NanumGothic",
)
selected_font = next(
    (font for font in font_candidates if font in available_fonts),
    "DejaVu Sans",
)
plt.rc("font", family=selected_font)
plt.rcParams["axes.unicode_minus"] = False

release_path = project_root / "frontend" / "public" / "data" / "policy_release.json"
matrix_path = (
    project_root / "data" / "processed" / "actual_road_accessibility_matrix.json"
)
release = json.loads(release_path.read_text(encoding="utf-8"))
matrix = json.loads(matrix_path.read_text(encoding="utf-8"))

def payload_sha256(value):
    encoded = json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()

metadata = release["metadata"]
for payload_name in (
    "hospitals",
    "vulnerability",
    "candidates",
    "candidate_trace",
    "optimization",
):
    assert (
        payload_sha256(release[payload_name])
        == metadata["content_sha256"][payload_name]
    ), f"{payload_name} SHA-256 불일치"

quality_summary = validate_policy_analysis(release, matrix)
policy_kpis = calculate_policy_kpis(
    matrix,
    selected_p_median_resources(release),
)
vdi_sensitivity = calculate_vdi_rank_sensitivity(release)
pd.Series(quality_summary, name="검증 결과").to_frame()
"""
            ),
            markdown_cell(
                """## Data

행정동 단위의 취약인구, 일반 차량 ETA, VDI를 같은 릴리스에서 읽습니다. 필수 필드는 누락 시 0으로 대체하지 않고 앞 셀의 계약 검증에서 실패합니다.
"""
            ),
            code_cell(
                """district_rows = []
for feature in release["vulnerability"]["features"]:
    properties = feature["properties"]
    district_rows.append(
        {
            "행정동": properties["adm_nm"],
            "취약인구": properties["취약인구"],
            "일반 차량 ETA(분)": properties["travel_time_minutes"],
            "VDI": properties["vulnerability_index"],
            "최근접 기관 분류": properties["nearest_hospital_tier"],
        }
    )

district_df = pd.DataFrame(district_rows)
district_df.describe().round(2)
"""
            ),
            markdown_cell(
                """## Results

### 전체 체계의 접근성 전후 비교

아래 값은 기존 기준 기관을 유지하고 p-median 3개 후보를 함께 적용했을 때, 행정동별 더 짧은 ETA를 선택해 재산출한 결과입니다.
"""
            ),
            code_cell(
                """kpi_table = pd.DataFrame(
    [
        {
            "모드": "소아",
            "대상 인구": policy_kpis["pediatric"]["population"],
            "선택 후보": ", ".join(
                map(str, policy_kpis["pediatric"]["selected_candidate_ids"])
            ),
            "기준선 ETA": policy_kpis["pediatric"][
                "baseline_weighted_eta_minutes"
            ],
            "후보 적용 ETA": policy_kpis["pediatric"][
                "after_weighted_eta_minutes"
            ],
            "기준선 15분(%)": policy_kpis["pediatric"][
                "baseline_15min_coverage_percent"
            ],
            "후보 적용 15분(%)": policy_kpis["pediatric"][
                "after_15min_coverage_percent"
            ],
        },
        {
            "모드": "어르신",
            "대상 인구": policy_kpis["senior"]["population"],
            "선택 후보": ", ".join(
                map(str, policy_kpis["senior"]["selected_candidate_ids"])
            ),
            "기준선 ETA": policy_kpis["senior"][
                "baseline_weighted_eta_minutes"
            ],
            "후보 적용 ETA": policy_kpis["senior"][
                "after_weighted_eta_minutes"
            ],
            "기준선 15분(%)": policy_kpis["senior"][
                "baseline_15min_coverage_percent"
            ],
            "후보 적용 15분(%)": policy_kpis["senior"][
                "after_15min_coverage_percent"
            ],
        },
    ]
).set_index("모드")
kpi_table

fig, axes = plt.subplots(1, 2, figsize=(12, 4.8))
colors = ("#CBD5E1", "#2563EB")
labels = ["소아", "어르신"]
x_positions = range(len(labels))
width = 0.34

for axis, baseline_key, after_key, title, ylabel in (
    (
        axes[0],
        "baseline_weighted_eta_minutes",
        "after_weighted_eta_minutes",
        "취약인구 가중 평균 ETA",
        "분",
    ),
    (
        axes[1],
        "baseline_15min_coverage_percent",
        "after_15min_coverage_percent",
        "전체 체계의 15분 커버율",
        "%",
    ),
):
    baseline_values = [
        policy_kpis[mode][baseline_key] for mode in ("pediatric", "senior")
    ]
    after_values = [
        policy_kpis[mode][after_key] for mode in ("pediatric", "senior")
    ]
    baseline_bars = axis.bar(
        [position - width / 2 for position in x_positions],
        baseline_values,
        width,
        label="기준선",
        color=colors[0],
        edgecolor="#334155",
    )
    after_bars = axis.bar(
        [position + width / 2 for position in x_positions],
        after_values,
        width,
        label="후보 적용",
        color=colors[1],
        edgecolor="#334155",
    )
    axis.set_title(title)
    axis.set_ylabel(ylabel)
    axis.set_xticks(list(x_positions), labels)
    axis.set_ylim(0, 100 if ylabel == "%" else max(baseline_values) * 1.25)
    axis.grid(axis="y", color="#E2E8F0")
    axis.set_axisbelow(True)
    axis.bar_label(baseline_bars, fmt="%.2f", padding=3)
    axis.bar_label(after_bars, fmt="%.2f", padding=3)

axes[0].legend(frameon=False)
fig.suptitle("기존 기관을 포함한 전체 체계의 접근성 전후 비교")
fig.tight_layout()
plt.show()
"""
            ),
            markdown_cell(
                """### VDI 산식 구성요소 민감도

VDI와 취약인구·ETA의 상관은 산식에 포함된 구성요소의 구조적 민감도이며 외부 타당성이나 인과관계가 아닙니다.
"""
            ),
            code_cell(
                """sensitivity_df = district_df[
    ["취약인구", "일반 차량 ETA(분)", "VDI"]
].corr()

plt.figure(figsize=(6.5, 4.8))
sns.heatmap(
    sensitivity_df,
    annot=True,
    fmt=".3f",
    cmap="coolwarm",
    center=0,
    square=True,
)
plt.title("VDI 산식 구성요소 민감도")
plt.tight_layout()
plt.show()
sensitivity_df.round(3)
"""
            ),
            markdown_cell(
                """### VDI 대안 산식 순위 민감도

현재 산식을 기준으로 인구 로그 곱셈식과 로그 구성요소 Min-Max 동일가중식을 비교합니다. 결과는 정책 효과가 아니라 산식 선택에 따른 내부 순위 안정성입니다.
"""
            ),
            code_cell(
                """pd.DataFrame(vdi_sensitivity["methods"]).T.rename(
    columns={
        "spearman_rank_correlation": "Spearman 순위상관",
        "top10_overlap_count": "상위 10개 겹침",
        "top10_overlap_percent": "상위 10개 겹침(%)",
        "median_absolute_rank_shift": "중앙 순위 이동",
        "maximum_absolute_rank_shift": "최대 순위 이동",
    }
).round(3)
"""
            ),
            markdown_cell(
                f"""## Takeaways

1. 소아 모드는 후보 적용 시 가중 평균 ETA가 {abs(pediatric_kpi['eta_change_minutes']):.3f}분 감소하고 15분 커버율이 {pediatric_kpi['after_15min_coverage_percent'] - pediatric_kpi['baseline_15min_coverage_percent']:.2f}%p 증가해 상대 개선 폭이 큽니다.
2. 어르신 모드는 기준선 접근성이 더 높아 개선 폭이 작지만, 가중 평균 ETA와 15분 커버율 모두 같은 방향으로 개선됩니다.
3. 30분 커버율은 소아 {pediatric_kpi['baseline_30min_coverage_percent']:.2f}→{pediatric_kpi['after_30min_coverage_percent']:.2f}%, 어르신 {senior_kpi['baseline_30min_coverage_percent']:.2f}→{senior_kpi['after_30min_coverage_percent']:.2f}%로 기준선부터 높아 외곽권 누락 감시용 가드레일로 사용합니다.
4. 외부 원천의 마지막 성공일은 2026-07-18이므로, 이 노트북은 최신 운영 현황이 아니라 검증된 정적 정책분석 스냅샷을 설명합니다.
"""
            ),
        ],
        "metadata": {
            "kernelspec": {
                "display_name": "Python 3",
                "language": "python",
                "name": "python3"
            },
            "language_info": {
                "codemirror_mode": {"name": "ipython", "version": 3},
                "file_extension": ".py",
                "mimetype": "text/x-python",
                "name": "python",
                "nbconvert_exporter": "python",
                "pygments_lexer": "ipython3",
                "version": "3.11.0"
            }
        },
        "nbformat": 4,
        "nbformat_minor": 4
    }
    
    notebook_path = analysis_dir / "golden_governance_eda.ipynb"
    with notebook_path.open("w", encoding="utf-8") as file:
        json.dump(notebook, file, ensure_ascii=False, indent=2)
        
    print("All tasks completed successfully!")

if __name__ == "__main__":
    main()
