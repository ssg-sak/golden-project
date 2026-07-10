import type { HospitalRecord } from '../types/hospital';
import { hospitalAvailableBeds } from '../types/hospital';

export type BedAvailabilityStatus = 'available' | 'unavailable' | 'unknown';

export interface BedStatusInfo {
  status: BedAvailabilityStatus;
  /** 진료 가능 시 표시할 병상 수 */
  count?: number;
}

/**
 * 시민용 병상 상태 — hvec 우선, 없으면 available_beds 합산으로 판단
 */
export function resolveBedStatus(hospital: HospitalRecord): BedStatusInfo {
  if (typeof hospital.hvec === 'number') {
    const hvoc = typeof hospital.hvoc === 'number' ? hospital.hvoc : 0;
    const total = hospital.hvec + hvoc;
    if (total > 0) {
      return { status: 'available', count: total };
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
  return resolveBedStatus(hospital).status === 'available';
}
