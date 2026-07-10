# -*- coding: utf-8 -*-
"""
resource_simulator.py
=====================
자원 확충 시뮬레이터 (Step 4)

역할:
  - AI 파이프라인이 생성한 클러스터 센트로이드를 입력으로 받아
  - 반경 5km 내 병원별 인프라 부족분을 역산하고
  - 우선순위(HIGH / MEDIUM / LOW)를 결정하며
  - 자연어 추천문을 자동 생성합니다.

출력:
  frontend/public/data/resource_recommendations.json

실행:
  python ai-model/resource_simulator.py

주의:
  - 배치(Batch) 오프라인 방식으로 실행. 웹 서버 성능에 영향 없음.
  - doctors_count는 AI 추정치. 표출 시 반드시 면책 문구 표시 필요.
"""

import os
import json
import math
import numpy as np
from hira_data_bridge import (
    HIRA_OFFLINE_DUMP,
    _haversine_km,
    SEARCH_RADIUS_KM
)

# ==============================================================================
# 설정 상수
# ==============================================================================
DOCTORS_THRESHOLD_HIGH   = 5    # 전문의 충원 권고 기준: 반경 내 평균 전문의 수 5명 미만
DOCTORS_THRESHOLD_MEDIUM = 15   # 중간 우선순위: 15명 미만
MRI_COVERAGE_REQUIRED    = True # MRI 필수 장비 여부

BASE_DIR     = os.path.dirname(os.path.abspath(__file__))
OUTPUT_PATH  = os.path.join(BASE_DIR, "..", "frontend", "public", "data",
                            "resource_recommendations.json")

# 파이프라인 출력 파일 경로
PEDIATRIC_JSON = os.path.join(BASE_DIR, "..", "data", "processed",
                              "optimal_locations_pediatric.json")
SENIOR_JSON    = os.path.join(BASE_DIR, "..", "data", "processed",
                              "optimal_locations_senior.json")


# ==============================================================================
# 핵심 로직
# ==============================================================================

def find_nearby_hospitals(lat: float, lng: float,
                           radius_km: float = SEARCH_RADIUS_KM) -> list[dict]:
    """클러스터 센트로이드 기준 반경 내 병원 목록 반환."""
    result = []
    for name, info in HIRA_OFFLINE_DUMP.items():
        dist = _haversine_km(lat, lng, info["lat"], info["lng"])
        if dist <= radius_km:
            result.append({"name": name, "dist_km": round(dist, 2), **info})
    result.sort(key=lambda x: x["dist_km"])
    return result


def compute_resource_gap(nearby: list[dict], demand: int) -> dict:
    """
    반경 내 병원 인프라와 수요를 비교하여 자원 부족분을 역산합니다.

    기준:
      - 평균 전문의 수 < DOCTORS_THRESHOLD_HIGH  → 의사 충원 권고 (HIGH)
      - 평균 전문의 수 < DOCTORS_THRESHOLD_MEDIUM → 의사 충원 권고 (MEDIUM)
      - MRI 보유 병원이 없음                      → MRI 추가 권고
    """
    if not nearby:
        return {
            "doctors_needed": max(10, demand // 5),
            "mri_needed": True,
            "ct_needed": True,
            "avg_doctors_nearby": 0,
            "mri_coverage_ratio": 0.0,
            "priority_level": "HIGH"
        }

    avg_doctors = np.mean([h["doctors_count"] for h in nearby])
    mri_count   = sum(1 for h in nearby if h.get("MRI", False))
    ct_count    = sum(1 for h in nearby if h.get("CT", False))
    mri_ratio   = mri_count / len(nearby)
    ct_ratio    = ct_count  / len(nearby)

    # 우선순위 판정
    if avg_doctors < DOCTORS_THRESHOLD_HIGH or mri_ratio == 0.0:
        priority = "HIGH"
    elif avg_doctors < DOCTORS_THRESHOLD_MEDIUM or mri_ratio < 0.5:
        priority = "MEDIUM"
    else:
        priority = "LOW"

    # 충원 필요 전문의 수 역산 (MEDIUM 기준 충족에 필요한 인원)
    doctors_needed = max(0, math.ceil(DOCTORS_THRESHOLD_MEDIUM - avg_doctors))

    return {
        "doctors_needed": doctors_needed,
        "mri_needed": mri_ratio < 0.5,
        "ct_needed": ct_ratio < 0.5,
        "avg_doctors_nearby": round(float(avg_doctors), 1),
        "mri_coverage_ratio": round(mri_ratio, 2),
        "priority_level": priority
    }


def generate_recommendation_text(cluster_id: int, pipeline_type: str,
                                  nearby: list[dict], gap: dict,
                                  demand: int) -> str:
    """자연어 추천문 자동 생성."""
    priority_ko = {"HIGH": "[HIGH] 최우선", "MEDIUM": "[MED] 중요", "LOW": "[LOW] 관찰"}
    priority_label = priority_ko.get(gap["priority_level"], "")

    nearest_name = nearby[0]["name"] if nearby else "인근 의료기관"
    pipeline_ko  = "소아" if pipeline_type == "pediatric" else "어르신"

    lines = [f"{priority_label} | {pipeline_ko} 클러스터 #{cluster_id} (수요: {demand}개소)"]

    if gap["doctors_needed"] > 0:
        lines.append(
            f"→ {nearest_name}에 응급의학전문의 {gap['doctors_needed']}명 충원 권고"
            f" (반경 5km 평균 {gap['avg_doctors_nearby']}명)"
        )
    if gap["mri_needed"]:
        lines.append(f"→ 반경 내 MRI 보유 병원 부재. {nearest_name}에 MRI 1대 추가 배정 권고")
    if gap["ct_needed"]:
        lines.append(f"→ CT 보유 병원 커버리지 부족. CT 장비 지원 검토 필요")
    if gap["priority_level"] == "LOW":
        lines.append("→ 현재 인프라 수준 양호. 지속적 모니터링 권고")

    return " | ".join(lines)


def run_simulator(locations: list[dict], pipeline_type: str) -> list[dict]:
    """클러스터 목록을 받아 자원 추천 리포트 생성."""
    results = []
    for loc in locations:
        cid    = loc["id"]
        lat    = loc["lat"]
        lng    = loc["lng"]
        demand = loc.get("demand", 0)

        nearby  = find_nearby_hospitals(lat, lng)
        gap     = compute_resource_gap(nearby, demand)
        rec_txt = generate_recommendation_text(
            cid, pipeline_type, nearby, gap, demand
        )

        results.append({
            "pipeline":           pipeline_type,
            "cluster_id":         cid,
            "location":           {"lat": lat, "lng": lng},
            "demand":             demand,
            "nearby_hospitals":   [h["name"] for h in nearby],
            "nearby_count":       len(nearby),
            "resource_gap":       gap,
            "recommendation":     rec_txt
        })

    return results


# ==============================================================================
# 실행 진입점
# ==============================================================================
if __name__ == "__main__":
    print("=" * 60)
    print("  자원 확충 시뮬레이터 가동")
    print("=" * 60)

    all_recommendations = []

    # 소아 파이프라인 결과 처리
    if os.path.exists(PEDIATRIC_JSON):
        with open(PEDIATRIC_JSON, "r", encoding="utf-8") as f:
            pediatric_locs = json.load(f)
        print(f"\n[PEDIATRIC] 클러스터 {len(pediatric_locs)}개 처리 중...")
        recs = run_simulator(pediatric_locs, "pediatric")
        all_recommendations.extend(recs)
        for r in recs:
            print(f"  Cluster #{r['cluster_id']}: {r['resource_gap']['priority_level']}"
                  f" | 주변병원 {r['nearby_count']}곳 | {r['recommendation'][:60]}...")
    else:
        print(f"[WARNING] {PEDIATRIC_JSON} 없음. 소아 파이프라인을 먼저 실행하세요.")

    # 어르신 파이프라인 결과 처리
    if os.path.exists(SENIOR_JSON):
        with open(SENIOR_JSON, "r", encoding="utf-8") as f:
            senior_locs = json.load(f)
        print(f"\n[SENIOR] 클러스터 {len(senior_locs)}개 처리 중...")
        recs = run_simulator(senior_locs, "senior")
        all_recommendations.extend(recs)
        for r in recs:
            print(f"  Cluster #{r['cluster_id']}: {r['resource_gap']['priority_level']}"
                  f" | 주변병원 {r['nearby_count']}곳 | {r['recommendation'][:60]}...")
    else:
        print(f"[WARNING] {SENIOR_JSON} 없음. 어르신 파이프라인을 먼저 실행하세요.")

    # 결과 저장
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(all_recommendations, f, ensure_ascii=False, indent=2)

    print(f"\n✅ 자원 추천 리포트 저장 완료: {OUTPUT_PATH}")
    print(f"   총 {len(all_recommendations)}개 클러스터 분석 완료")
