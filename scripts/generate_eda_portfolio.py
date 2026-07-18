import json
from pathlib import Path
import pandas as pd
import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import seaborn as sns

def main():
    # Set paths
    project_root = Path(__file__).resolve().parent.parent
    release_path = project_root / "frontend" / "public" / "data" / "policy_release.json"
    analysis_dir = project_root / "analysis"
    docs_dir = project_root / "docs"
    img_dir = docs_dir / "images" / "eda"

    analysis_dir.mkdir(parents=True, exist_ok=True)
    img_dir.mkdir(parents=True, exist_ok=True)

    # Korean Font Setting for Windows
    plt.rc('font', family='Malgun Gothic')
    plt.rcParams['axes.unicode_minus'] = False

    # 1. Load Data
    print("Loading data...")
    with release_path.open(encoding="utf-8") as file:
        release = json.load(file)

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

    # Parse Features
    features = []
    for feat in vul_data['features']:
        props = feat['properties']
        features.append({
            'adm_nm': props.get('adm_nm', ''),
            'pop_senior': props.get('65세이상_인구', 0),
            'pop_pediatric': props.get('0~9세_인구', 0),
            'pop_vul': props.get('취약인구', 0),
            'min_dist': props.get('min_dist_to_hospital', 0),
            'road_eta': props.get('travel_time_minutes', 0),
            'nearest_tier': props.get('nearest_hospital_tier', 3),
            'vdi': props.get('vulnerability_index', 0),
            'vdi_norm': props.get('vdi_norm', 0),
            'lat': props.get('center_lat', 0),
            'lng': props.get('center_lng', 0)
        })
    df = pd.DataFrame(features)
    
    # Hospital DF
    df_hosp = pd.DataFrame(hospitals)

    # 2. Plots
    print("Generating plots...")
    # Plot 1: VDI and Distance Distribution
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    sns.histplot(df['vdi'], bins=20, ax=axes[0], color='salmon', kde=True)
    axes[0].axvline(metadata["risk_threshold"], color="darkred", linestyle="--", label="상위 25% 상대 경계")
    axes[0].set_title("행정동별 도로 ETA 기반 VDI 분포")
    axes[0].set_xlabel("VDI")
    axes[0].legend()
    
    sns.histplot(df['road_eta'], bins=20, ax=axes[1], color='skyblue', kde=True)
    axes[1].set_title("최근접 분석 기관까지의 일반 차량 ETA 분포")
    axes[1].set_xlabel("도로 이동시간 (분)")
    plt.tight_layout()
    plt.savefig(img_dir / "vdi_distance_dist.png", dpi=300)
    plt.close()

    # Plot 2: Correlation Heatmap
    corr_cols = ['pop_senior', 'pop_pediatric', 'pop_vul', 'min_dist', 'road_eta', 'vdi']
    corr_matrix = df[corr_cols].corr()
    plt.figure(figsize=(8, 6))
    sns.heatmap(corr_matrix, annot=True, cmap='coolwarm', fmt=".2f")
    plt.title("취약 지표 간 상관관계 분석")
    plt.tight_layout()
    plt.savefig(img_dir / "correlation_heatmap.png", dpi=300)
    plt.close()

    # Plot 3: Accessibility by Tier
    plt.figure(figsize=(8, 5))
    sns.boxplot(x='nearest_tier', y='road_eta', data=df, hue='nearest_tier', palette='Set2', legend=False)
    plt.title("최근접 분석 기관 분류별 도로 ETA 분포")
    plt.xlabel("기관 분류 (1: 대형, 2: 준종합, 3: 소아 야간·휴일)")
    plt.ylabel("도로 이동시간 (분)")
    plt.tight_layout()
    plt.savefig(img_dir / "accessibility_by_tier.png", dpi=300)
    plt.close()

    # Plot 4: Top 10 Vulnerable Districts
    top10_vdi = df.sort_values('vdi', ascending=False).head(10)
    plt.figure(figsize=(10, 6))
    sns.barplot(x='vdi', y='adm_nm', data=top10_vdi, hue='adm_nm', palette='Reds_r', legend=False)
    plt.title("현재 분석본의 VDI 상위 10개 행정동")
    plt.xlabel("응급의료 취약성지수 (VDI)")
    plt.ylabel("행정동")
    plt.tight_layout()
    plt.savefig(img_dir / "top10_vulnerable_districts.png", dpi=300)
    plt.close()

    # Plot 5: Candidate-set optimization results. These are model comparisons,
    # not forecasts of actual construction or patient outcomes.
    fig, axes = plt.subplots(1, 2, figsize=(14, 5), sharey=True)
    for axis, mode, label in zip(axes, ("pediatric", "senior"), ("소아", "어르신")):
        results = policy["results"].get(mode, [])
        facility_counts = [row["facility_count"] for row in results]
        coverage = [row["mclp_30min_optimum"]["covered_30min_ratio"] * 100 for row in results]
        axis.plot(facility_counts, coverage, marker="o", linewidth=2)
        axis.set_title(f"{label} 후보 조합의 30분 모델 커버율")
        axis.set_xlabel("선택 후보 수")
        axis.set_xticks(facility_counts)
        axis.set_ylim(0, 100)
    axes[0].set_ylabel("30분 내 모델 커버율 (%)")
    plt.tight_layout()
    plt.savefig(img_dir / "policy_improvement.png", dpi=300)
    plt.close()

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

분석본 생성 단계에서 행정동 150개, 기관 25개, 후보 9개와 경로 5,100개의 계약을 검사합니다. 이 검사는 구조적 완전성을 의미하며 원천자료의 임상적 타당성이나 최신성을 자동으로 보증하지는 않습니다.

## 2. 응급의료 접근성 및 VDI 분포
행정동별 취약성 지표의 기초 분포를 파악합니다.

![VDI 및 거리 분포](images/eda/vdi_distance_dist.png)

**해석(Insights)**:
- 도로 ETA 기반 VDI는 {df['vdi'].min():,.2f}~{df['vdi'].max():,.2f}, 평균 {df['vdi'].mean():,.2f}, 중앙값 {df['vdi'].median():,.2f}입니다.
- 현재 분석본은 VDI 상위 25%를 우선 확인 대상으로 구분하며 상대 경계값은 {metadata['risk_threshold']:,.2f}, 해당 행정동은 {metadata['high_risk_district_count']}개입니다.
- 일반 차량 ETA는 {df['road_eta'].min():.2f}~{df['road_eta'].max():.2f}분입니다. 이는 수집 시점의 분석용 경로이며 119 구급차 이송시간이 아닙니다.

## 3. 취약 지표 간 상관관계 분석
취약성 지수(VDI)가 어떤 요인에 의해 주로 형성되는지 상관계수를 통해 분석합니다.

![상관관계 히트맵](images/eda/correlation_heatmap.png)

**해석(Insights)**:
- 현재 VDI와 취약인구의 피어슨 상관계수는 {df['vdi'].corr(df['pop_vul']):.3f}, 도로 ETA와의 상관계수는 {df['vdi'].corr(df['road_eta']):.3f}입니다.
- 이 상관은 현재 150개 행정동과 현행 산식에서 관찰된 기술통계입니다. 인과관계나 개별 지역의 의료적 위험을 증명하지 않습니다.

## 4. 병원 티어별 접근성 비교

![티어별 접근성](images/eda/accessibility_by_tier.png)

**해석(Insights)**:
- 분류별 상자그림은 행정동별 최근접 분석 기관의 도로 ETA 분포를 비교합니다.
- 기관 분류는 서비스·분석을 위한 프로젝트 내부 분류이며 개별 환자의 진료 가능성이나 병원의 실제 수용 역량 순위를 뜻하지 않습니다.

## 5. 최우선 취약 지역 (Top 10) 파악

![취약 지역 Top 10](images/eda/top10_vulnerable_districts.png)

**해석(Insights)**:
- 현재 상위 3개는 {top_names}입니다.
- 상위 지역은 취약인구와 일반 차량 ETA가 결합된 결과입니다. 순위만으로 시설 신설·이동형 진료·예산 투입을 확정할 수 없습니다.

## 6. 후보 조합별 접근성 모델 비교
p-median과 MCLP를 사용해 분류된 후보군 안에서 1~3개 후보 조합을 비교합니다.

![후보 조합별 30분 모델 커버율](images/eda/policy_improvement.png)

**해석(Insights)**:
- 소아 후보 3개 조합의 MCLP 30분 모델 커버율은 {policy['results']['pediatric'][-1]['mclp_30min_optimum']['covered_30min_ratio'] * 100:.1f}%, 어르신 후보 3개 조합은 {policy['results']['senior'][-1]['mclp_30min_optimum']['covered_30min_ratio'] * 100:.1f}%입니다.
- 결과는 후보군 내부의 수학적 비교이며 대구 전역의 전역 최적해, 시설 건립 효과, 실제 환자 수용 성과를 의미하지 않습니다.

## 결론 및 후속 과제 (Next Steps)
- **결론**: 현재 분석은 인구가 많은 도시권과 이동시간이 긴 외곽권을 함께 확인해야 함을 보여줍니다.
- **데이터 한계**: ETA는 수집 시점의 일반 차량 경로이며 병상·의료진·구급차 우선통행·실제 환자 흐름을 반영하지 않습니다.
- **후속 과제**: 원천 수집일 확정, 시간대별 반복 수집, 실제 이송자료를 이용한 외부 타당성 검증이 필요합니다. 검증 전 후보는 현장조사 우선순위로만 해석합니다.
"""
    with open(docs_dir / "EDA_REPORT.md", "w", encoding='utf-8') as f:
        f.write(report_content)

    # 4. Generate Jupyter Notebook JSON structure
    print("Generating golden_governance_eda.ipynb...")
    notebook = {
        "cells": [
            {
                "cell_type": "markdown",
                "metadata": {},
                "source": [
                    "# 대구광역시 응급의료 취약성 포트폴리오 EDA\n",
                    "본 노트북은 단일 `policy_release.json`에 묶인 검증 분석본의 분포와 변수 관계를 점검합니다.\n",
                    "실행을 위해서는 `pandas`, `matplotlib`, `seaborn` 라이브러리가 필요합니다."
                ]
            },
            {
                "cell_type": "code",
                "execution_count": None,
                "metadata": {},
                "outputs": [],
                "source": [
                    "import json\n",
                    "from pathlib import Path\n",
                    "import pandas as pd\n",
                    "import matplotlib\n",
                    "matplotlib.use('Agg')\n",
                    "import matplotlib.pyplot as plt\n",
                    "import seaborn as sns\n",
                    "\n",
                    "# 한글 폰트 설정 (Windows 기준)\n",
                    "plt.rc('font', family='Malgun Gothic')\n",
                    "plt.rcParams['axes.unicode_minus'] = False\n",
                    "\n",
                    "release_path = Path('../frontend/public/data/policy_release.json')\n",
                    "with open(release_path, encoding='utf-8') as f:\n",
                    "    release = json.load(f)\n",
                    "vul_data = release['vulnerability']\n",
                    "    \n",
                    "features = []\n",
                    "for feat in vul_data['features']:\n",
                    "    props = feat['properties']\n",
                    "    features.append({\n",
                    "        'adm_nm': props.get('adm_nm', ''),\n",
                    "        'pop_vul': props.get('취약인구', 0),\n",
                    "        'road_eta': props.get('travel_time_minutes', 0),\n",
                    "        'vdi': props.get('vulnerability_index', 0),\n",
                    "        'nearest_tier': props.get('nearest_hospital_tier', 3)\n",
                    "    })\n",
                    "df = pd.DataFrame(features)\n",
                    "df.head()"
                ]
            },
            {
                "cell_type": "markdown",
                "metadata": {},
                "source": [
                    "### 기초 통계 파악"
                ]
            },
            {
                "cell_type": "code",
                "execution_count": None,
                "metadata": {},
                "outputs": [],
                "source": [
                    "df.describe()"
                ]
            },
            {
                "cell_type": "markdown",
                "metadata": {},
                "source": [
                    "### 지표 상관관계 (Correlation)"
                ]
            },
            {
                "cell_type": "code",
                "execution_count": None,
                "metadata": {},
                "outputs": [],
                "source": [
                    "corr_cols = ['pop_vul', 'road_eta', 'vdi']\n",
                    "sns.heatmap(df[corr_cols].corr(), annot=True, cmap='coolwarm')\n",
                    "plt.title('주요 지표 상관관계')\n",
                    "plt.show()"
                ]
            }
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
                "version": "3.9.0"
            }
        },
        "nbformat": 4,
        "nbformat_minor": 4
    }
    
    with open(analysis_dir / "golden_governance_eda.ipynb", "w", encoding='utf-8') as f:
        json.dump(notebook, f, ensure_ascii=False, indent=2)
        
    print("All tasks completed successfully!")

if __name__ == "__main__":
    main()
