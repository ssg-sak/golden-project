import type { HospitalRecord } from '../types/hospital';
import { hospitalAvailableBeds } from '../types/hospital';

export type BedAvailabilityStatus = 'available' | 'unavailable' | 'unknown';

export interface BedStatusInfo {
  status: BedAvailabilityStatus;
  congestion?: 'smooth' | 'moderate' | 'crowded';
  /** 진료 가능 시 표시할 병상 수 */
  count?: number;
}

/**
 * 시민용 병상 상태 — hvec 우선, 없으면 available_beds 합산으로 판단
 */
export function resolveBedStatus(hospital: HospitalRecord): BedStatusInfo {
  if (typeof hospital.hvec === 'number') {
    if (hospital.hvec > 0) {
      const ratio =
        typeof hospital.total_hvec === 'number' && hospital.total_hvec > 0
          ? hospital.hvec / hospital.total_hvec
          : null;
      const congestion = ratio === null ? 'smooth' : ratio >= 0.8 ? 'smooth' : ratio >= 0.5 ? 'moderate' : 'crowded';
      return { status: 'available', count: hospital.hvec, congestion };
    }
    return { status: 'unavailable' };
  }

  const beds = hospitalAvailableBeds(hospital);
  if (beds === undefined) {
    return { status: 'unknown' };
  }
  if (beds > 0) {
    return { status: 'available', count: beds };
  }
  return { status: 'unavailable' };
}

/** 지도·리스트 필터용 — 수용 불가로 확정된 경우만 true */
export function isHospitalUnavailable(hospital: HospitalRecord): boolean {
  return resolveBedStatus(hospital).status === 'unavailable';
}

export function isHospitalAvailable(hospital: HospitalRecord): boolean {
  // 달빛어린이병원(Tier 3)은 병상 수(HIRA 데이터)가 없지만, 소아/야간 진료 기관이므로 '진료 가능' 필터에서 보이도록 예외 처리
  if (hospital.tier === 3) return true;
  
  // Tier 1, 2 응급실은 실제 병상 수를 기반으로 진료 가능 여부 판별 (수용 불가면 필터링됨)
  return resolveBedStatus(hospital).status === 'available';
}
