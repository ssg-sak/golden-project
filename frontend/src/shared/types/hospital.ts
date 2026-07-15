import { hospitalTierLabel } from '../lib/hospital-tier-visual';

export type HospitalTier = 1 | 2 | 3;

export interface HospitalRecord {
  name: string;
  lat: number;
  lng: number;
  /** 1=권역·대형, 2=준종합, 3=달빛어린이병원 */
  tier: HospitalTier;
  address?: string;
  /** 응급실·진료 문의 전화 (tel: 링크) */
  tel?: string;
  /** 응급실 일반 가용 병상 (공공 API hvec) */
  hvec?: number | null;
  /** 응급실 소아 가용 병상 (공공 API hvoc) */
  hvoc?: number | null;
  /** hvec + hvoc 합계 (조회 실패 시 null) */
  available_beds?: number | null;
  /** 응급실 일반 총 병상 (공공 API hvs01) */
  total_hvec?: number | null;
  /** 응급실 소아 총 병상 (공공 API hvs02) */
  total_hvoc?: number | null;
  /** total_hvec + total_hvoc 합계 */
  total_beds?: number | null;
  /** mock | api | unavailable */
  realtime_source?: string;
  /** 응급실 특이사항 메시지 목록 (공공 API getEmrrmSrsillDissMsgInqire) */
  realtime_messages?: string[] | null;
  /** 특수 병상 현황 (가용/기준) */
  special_beds?: Record<
    string,
    { available: number | null; total: number | null; is_available?: boolean | null }
  > | null;

  // --- HIRA API Data ---
  /** 병원 운영 시간 */
  operating_hours?: string;
  /** 전문의 등 의료진 수 */
  doctors_count?: number;
  /** 장비 보유 여부 (예: CT: true, MRI: false) */
  equipment_status?: Record<string, boolean>;
  /** 국립중앙의료원 응급 핵심장비 현재 가용 여부 */
  emergency_equipment_status?: Record<string, boolean>;
  /** 심평원 지정/안내 특이사항 (예: 달빛어린이병원 지정, 등급 등) */
  hira_notices?: string[];
  /** api일 때만 실제 HIRA 응답에서 취득한 값 */
  hira_source?: 'api';
  /** 심평원 자료 기준 시점. 예: 2026.03 */
  hira_reference_date?: string;
  /** HIRA 장비 상세 조회 상태 */
  hira_equipment_status?: 'ok' | 'failed' | 'snapshot' | 'not_requested';
  /** HIRA 장비 상세 조회 실패 또는 폴백 안내 */
  hira_equipment_message?: string;
}

export function hospitalDisplayName(hospital: HospitalRecord): string {
  return hospital.name;
}

export function hospitalDisplayAddress(hospital: HospitalRecord): string {
  return hospital.address ?? '주소 정보 없음';
}

export function hospitalTierBadge(tier: HospitalTier): string {
  return hospitalTierLabel(tier);
}

export function hospitalAvailableBeds(hospital: HospitalRecord): number | undefined {
  if (typeof hospital.hvec === 'number') {
    return hospital.hvec;
  }

  if (hospital.available_beds === null) {
    return undefined;
  }

  if (typeof hospital.available_beds === 'number') {
    return hospital.available_beds;
  }

  return undefined;
}

/**
 * 응급실 총 병상 수 (hvs01 + hvs02).
 * - 데이터 없으면 undefined
 * - 총 병상 < 가용 병상인 논리적으로 불가능한 데이터는 undefined 반환 (표시 안 함)
 */
export function hospitalTotalBeds(hospital: HospitalRecord): number | undefined {
  let total: number | undefined;

  if (typeof hospital.total_beds === 'number') {
    total = hospital.total_beds;
  } else {
    const hasTotalHvec = typeof hospital.total_hvec === 'number';
    const hasTotalHvoc = typeof hospital.total_hvoc === 'number';
    if (hasTotalHvec || hasTotalHvoc) {
      total = (hospital.total_hvec ?? 0) + (hospital.total_hvoc ?? 0);
    }
  }

  if (total === undefined) return undefined;

  // Sanity check: 가용 병상이 총 병상을 초과하면 데이터 오류 — 표시하지 않음
  const available = hospitalAvailableBeds(hospital);
  if (available !== undefined && total < available) {
    return undefined;
  }

  return total;
}

/**
 * 총 병상 데이터가 존재하지만 가용 병상보다 작은 논리적 불일치 상태인지 여부.
 * View에서 "데이터 불일치" 안내 문구 표시 여부 결정에 사용.
 */
export function hospitalTotalBedsIsInvalid(hospital: HospitalRecord): boolean {
  let total: number | undefined;

  if (typeof hospital.total_beds === 'number') {
    total = hospital.total_beds;
  } else {
    const hasTotalHvec = typeof hospital.total_hvec === 'number';
    const hasTotalHvoc = typeof hospital.total_hvoc === 'number';
    if (hasTotalHvec || hasTotalHvoc) {
      total = (hospital.total_hvec ?? 0) + (hospital.total_hvoc ?? 0);
    }
  }

  if (total === undefined) return false;

  const available = hospitalAvailableBeds(hospital);
  return available !== undefined && total < available;
}


