import type { HospitalRecord } from '../types/hospital';
import { hospitalAvailableBeds } from '../types/hospital';

export type BedReportStatus = 'reported-bed-positive' | 'reported-bed-zero' | 'unknown';

export interface BedStatusInfo {
  status: BedReportStatus;
  congestion?: 'smooth' | 'moderate' | 'crowded';
  /** 원천에서 보고된 일반응급실 가용 병상 수 */
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
      return { status: 'reported-bed-positive', count: hospital.hvec, congestion };
    }
    return { status: 'reported-bed-zero', count: 0 };
  }

  const beds = hospitalAvailableBeds(hospital);
  if (beds === undefined) {
    return { status: 'unknown' };
  }
  if (beds > 0) {
    return { status: 'reported-bed-positive', count: beds };
  }
  return { status: 'reported-bed-zero', count: 0 };
}

/** 지도·목록의 '응급병상 보유만' 필터용. 진료·수용 가능 여부를 뜻하지 않는다. */
export function hasReportedGeneralErBed(hospital: HospitalRecord): boolean {
  return resolveBedStatus(hospital).status === 'reported-bed-positive';
}
