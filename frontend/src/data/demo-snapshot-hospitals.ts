import type { HospitalRecord } from '../shared/types/hospital';
import { getCanonicalHospitals } from '../shared/lib/canonical-hospitals';

type StaticHospitalRow = Pick<HospitalRecord, 'name' | 'lat' | 'lng' | 'tier' | 'address'>;

/**
 * 데모/시뮬레이션 전용 스냅샷 데이터.
 * 정적 파일(final_hospitals.json)을 기반으로, 과거 병상 부족/혼잡 상황을 임의 연출.
 */
export const DEMO_SNAPSHOT_HOSPITAL_DATA: HospitalRecord[] = (
  getCanonicalHospitals() as StaticHospitalRow[]
).map((hospital, idx) => {
  // 인덱스 기반으로 임의의 가짜 병상 상태를 생성하여 긴박한 상황 연출
  const rand = (idx * 7) % 10; 
  let availableBeds = rand;
  if (idx % 3 === 0) availableBeds = 0; // 일부 병원은 응급실 꽉 참
  
  return {
    ...hospital,
    hvec: availableBeds,
    hvoc: null,
    available_beds: availableBeds,
    realtime_source: 'simulation',
  };
});
