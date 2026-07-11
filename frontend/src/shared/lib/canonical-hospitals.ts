import canonicalHospitalsJson from '../../assets/final_hospitals.json';
import type { HospitalRecord } from '../types/hospital';

type CanonicalHospital = Pick<HospitalRecord, 'name' | 'lat' | 'lng' | 'tier' | 'address'>;

const canonicalHospitals = canonicalHospitalsJson as CanonicalHospital[];
const canonicalByName = new Map(canonicalHospitals.map((hospital) => [hospital.name.trim(), hospital]));

/**
 * 서버별로 좌표가 달라도 지도·거리·길찾기는 검증된 기준 좌표를 사용한다.
 * 병상, 전화번호 등 실시간 필드는 서버 응답을 그대로 보존한다.
 */
export function normalizeHospitalLocation(hospital: HospitalRecord): HospitalRecord {
  const canonical = canonicalByName.get(hospital.name.trim());
  if (!canonical) return hospital;

  return {
    ...hospital,
    name: canonical.name,
    lat: canonical.lat,
    lng: canonical.lng,
    tier: canonical.tier,
    address: canonical.address,
  };
}

export function normalizeHospitalLocations(hospitals: HospitalRecord[]): HospitalRecord[] {
  return hospitals.map(normalizeHospitalLocation);
}

export function getCanonicalHospitals(): CanonicalHospital[] {
  return canonicalHospitals;
}
