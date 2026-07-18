import type { HospitalRecord } from '../types/hospital';
import { getCanonicalHospitals } from '../lib/canonical-hospitals';

type StaticHospitalRow = Pick<HospitalRecord, 'name' | 'lat' | 'lng' | 'tier' | 'address'>;

/**
 * API·네트워크 실패 시 Graceful Degradation용 내장 정적 병원 데이터.
 * 병상은 null — 「병상정보 미확인」만 표시 (허위 초록 병상 방지).
 */
export const STATIC_FALLBACK_HOSPITAL_DATA: HospitalRecord[] = (
  getCanonicalHospitals() as StaticHospitalRow[]
).map((hospital) => ({
  ...hospital,
  hvec: null,
  hvoc: null,
  available_beds: null,
  realtime_source: 'unavailable',
}));
