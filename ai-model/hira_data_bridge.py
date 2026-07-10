# -*- coding: utf-8 -*-
"""
hira_data_bridge.py
===================
AI 파이프라인 ↔ HIRA 인프라 데이터 연결 브릿지 (Step 1)

역할:
  - backend/app/services/hira_client.py 의 오프라인 덤프를 AI 파이프라인이
    직접 활용할 수 있도록 재선언 + 수치 계산 함수 제공
  - compute_infra_penalty(): 반경 5km 병원 인프라 부실 점수 계산
  - compute_composite_weight(): 3중 복합 가중치 최종 산출

복합 가중치 공식:
  final_weight = vdi_weight × (1 + infra_penalty) × equity_multiplier

  where:
    vdi_weight       = vulnerability_index (지리적 소외 지수)
    infra_penalty    = Σ[ 1/doctors_count × 장비_부재_배수 ] / 반경5km_병원_수
    equity_multiplier = 해당 동 취약인구 비율 (파이프라인에서 주입)

주의:
  - doctors_count는 AI 추정치이며 공식 심평원 데이터가 아닙니다.
  - 패널티 배수(MRI: ×2.0, CT: ×1.5)는 정책 전문가 협의 전 임의 설정값입니다.
"""

import numpy as np

# ==============================================================================
# HIRA 오프라인 덤프 (backend/hira_client.py 와 동일한 팩트 데이터 재선언)
# AI 파이프라인이 백엔드 FastAPI 의존 없이 직접 참조할 수 있도록 독립 선언
# ==============================================================================

HIRA_OFFLINE_DUMP = {
    # 병원명: {lat, lng, tier, doctors_count, equipment}
    "경북대학교병원":              {"lat": 35.8663,  "lng": 128.6031, "tier": 1, "doctors_count": 82,  "MRI": True,  "CT": True},
    "칠곡경북대학교병원":           {"lat": 35.9485,  "lng": 128.5598, "tier": 1, "doctors_count": 68,  "MRI": True,  "CT": True},
    "영남대학교병원":              {"lat": 35.8482,  "lng": 128.5820, "tier": 1, "doctors_count": 76,  "MRI": True,  "CT": True},
    "계명대학교 동산병원":          {"lat": 35.8667,  "lng": 128.5778, "tier": 1, "doctors_count": 85,  "MRI": True,  "CT": True},
    "대구가톨릭대학교병원":         {"lat": 35.8436,  "lng": 128.5680, "tier": 1, "doctors_count": 71,  "MRI": True,  "CT": True},
    "대구파티마병원":              {"lat": 35.8427,  "lng": 128.5363, "tier": 2, "doctors_count": 62,  "MRI": True,  "CT": True},
    "대구의료원":                 {"lat": 35.8628,  "lng": 128.5548, "tier": 2, "doctors_count": 35,  "MRI": True,  "CT": True},
    "대구보훈병원":               {"lat": 35.8409,  "lng": 128.6388, "tier": 2, "doctors_count": 28,  "MRI": True,  "CT": True},
    "삼일병원":                  {"lat": 35.8580,  "lng": 128.4950, "tier": 2, "doctors_count": 21,  "MRI": True,  "CT": True},
    "구병원":                    {"lat": 35.8710,  "lng": 128.6120, "tier": 2, "doctors_count": 24,  "MRI": True,  "CT": True},
    "천주성삼병원":               {"lat": 35.8392,  "lng": 128.7092, "tier": 2, "doctors_count": 18,  "MRI": True,  "CT": True},
    "곽병원":                    {"lat": 35.8420,  "lng": 128.5820, "tier": 2, "doctors_count": 15,  "MRI": True,  "CT": True},
    "드림종합병원":               {"lat": 35.8394,  "lng": 128.5669, "tier": 2, "doctors_count": 16,  "MRI": True,  "CT": True},
    "나사렛종합병원":              {"lat": 35.8124,  "lng": 128.5183, "tier": 2, "doctors_count": 12,  "MRI": False, "CT": True},
    "강남종합병원":               {"lat": 35.8901,  "lng": 128.6486, "tier": 2, "doctors_count": 14,  "MRI": False, "CT": True},
    "대구굿모닝병원":              {"lat": 35.8318,  "lng": 128.5245, "tier": 2, "doctors_count": 10,  "MRI": False, "CT": True},
    "더블유병원":                 {"lat": 35.8513,  "lng": 128.5093, "tier": 2, "doctors_count": 12,  "MRI": True,  "CT": True},
    "대구가톨릭대학교 칠곡가톨릭병원": {"lat": 35.9349, "lng": 128.5493, "tier": 1, "doctors_count": 19,  "MRI": True,  "CT": True},
    "한영한마음아동병원":           {"lat": 35.8307,  "lng": 128.5515, "tier": 3, "doctors_count": 8,   "MRI": False, "CT": False},
    "바른연합소아청소년과의원":      {"lat": 35.8231,  "lng": 128.5217, "tier": 3, "doctors_count": 3,   "MRI": False, "CT": False},
    "우리허브병원":               {"lat": 35.6903,  "lng": 128.4531, "tier": 3, "doctors_count": 5,   "MRI": False, "CT": True},
    "우리아이아동병원":            {"lat": 35.8980,  "lng": 128.6130, "tier": 3, "doctors_count": 6,   "MRI": False, "CT": False},
    "열린아동병원":               {"lat": 35.8505,  "lng": 128.5397, "tier": 3, "doctors_count": 7,   "MRI": False, "CT": False},
    "율하연합소아청소년과의원":      {"lat": 35.8634,  "lng": 128.6938, "tier": 3, "doctors_count": 2,   "MRI": False, "CT": False},
}

# ==============================================================================
# 상수: 장비 부재 패널티 배수
# ==============================================================================
MRI_ABSENCE_MULTIPLIER = 2.0   # MRI 없을 경우 인프라 패널티 ×2.0
CT_ABSENCE_MULTIPLIER  = 1.5   # CT  없을 경우 인프라 패널티 ×1.5
SEARCH_RADIUS_KM       = 5.0   # 인프라 탐색 반경 (km)


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """두 좌표 간 Haversine 거리(km) 계산."""
    R = 6371.0
    lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = np.sin(dlat / 2) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon / 2) ** 2
    return R * 2 * np.arcsin(np.sqrt(a))


def _single_hospital_penalty(hospital: dict) -> float:
    """
    병원 1개의 인프라 부실 점수 계산.

    공식:
      penalty = (1 / doctors_count) × MRI_배수 × CT_배수

    의사가 많고 장비 갖춘 병원 → penalty 낮음 (진짜 안전)
    의사 적고 장비 없는 병원   → penalty 높음 (가짜 안전 → 진짜 사각지대)
    """
    doctors = max(hospital.get("doctors_count", 1), 1)  # 0 나눔 방지
    base = 1.0 / doctors

    mri_mult = 1.0 if hospital.get("MRI", True)  else MRI_ABSENCE_MULTIPLIER
    ct_mult  = 1.0 if hospital.get("CT",  True)  else CT_ABSENCE_MULTIPLIER

    return base * mri_mult * ct_mult


def compute_infra_penalty(point_lat: float, point_lng: float,
                           radius_km: float = SEARCH_RADIUS_KM) -> float:
    """
    특정 수요 지점(위도·경도) 기준 반경 radius_km 내 모든 병원의
    인프라 부실 패널티 평균값을 반환합니다.

    반경 내 병원이 없으면 최대 패널티(1.0)를 반환합니다 → 완전 사각지대 처리.

    Args:
        point_lat: 수요 지점 위도
        point_lng: 수요 지점 경도
        radius_km: 탐색 반경 (기본 5km)

    Returns:
        0.0 ~ 1.0+ 범위의 인프라 패널티 평균
    """
    nearby_penalties = []

    for hospital in HIRA_OFFLINE_DUMP.values():
        dist = _haversine_km(point_lat, point_lng,
                             hospital["lat"], hospital["lng"])
        if dist <= radius_km:
            penalty = _single_hospital_penalty(hospital)
            nearby_penalties.append(penalty)

    if not nearby_penalties:
        # 반경 내 병원 없음 → 최대 패널티
        return 1.0

    return float(np.mean(nearby_penalties))


def compute_composite_weight(vdi_weight: float,
                             point_lat: float,
                             point_lng: float,
                             equity_multiplier: float = 1.0,
                             radius_km: float = SEARCH_RADIUS_KM) -> float:
    """
    3중 복합 가중치를 산출합니다.

    공식:
      final_weight = vdi_weight × (1 + infra_penalty) × equity_multiplier

    Args:
        vdi_weight:        VDI 지리적 소외 지수 (기존 단일 가중치)
        point_lat:         수요 지점 위도
        point_lng:         수요 지점 경도
        equity_multiplier: 취약 인구 비율 배수 (소아/어르신 파이프라인에서 주입)
        radius_km:         인프라 탐색 반경

    Returns:
        복합 가중치 (float)
    """
    infra_penalty = compute_infra_penalty(point_lat, point_lng, radius_km)
    final_weight  = float(vdi_weight) * (1.0 + infra_penalty) * equity_multiplier
    return final_weight


# ==============================================================================
# 독립 실행 테스트
# ==============================================================================
if __name__ == "__main__":
    print("=" * 60)
    print("  hira_data_bridge.py 단독 테스트")
    print("=" * 60)

    # 테스트 포인트 1: 경북대병원 인근 (인프라 우수 → 패널티 낮음)
    lat1, lng1 = 35.866, 128.603
    p1 = compute_infra_penalty(lat1, lng1)
    print(f"\n[포인트 A] 경북대병원 인근 ({lat1}, {lng1})")
    print(f"  → 인프라 패널티: {p1:.6f}  (낮을수록 진짜 안전)")

    # 테스트 포인트 2: 군위군 (병원 거의 없음 → 패널티 최대)
    lat2, lng2 = 36.221, 128.591
    p2 = compute_infra_penalty(lat2, lng2)
    print(f"\n[포인트 B] 군위군 오지 ({lat2}, {lng2})")
    print(f"  → 인프라 패널티: {p2:.6f}  (높을수록 진짜 사각지대)")

    # 테스트 포인트 3: 복합 가중치 계산
    vdi = 0.8
    w = compute_composite_weight(vdi, lat2, lng2, equity_multiplier=1.3)
    print(f"\n[복합 가중치] VDI={vdi}, equity=1.3")
    print(f"  → final_weight = {w:.6f}")

    print("\n✅ hira_data_bridge.py 단독 테스트 완료")
