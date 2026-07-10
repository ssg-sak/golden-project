import type { HospitalRecord } from '../types/hospital';

/** 행정동 중심점 기준 직선거리(km) — GeoJSON에 병원명이 없을 때 폴백 */
export function findNearestHospital(
  centerLat: number,
  centerLng: number,
  hospitals: HospitalRecord[],
): HospitalRecord | null {
  if (hospitals.length === 0) return null;

  let nearest = hospitals[0];
  let minDist = Number.POSITIVE_INFINITY;

  for (const hospital of hospitals) {
    const dLat = hospital.lat - centerLat;
    const dLng = hospital.lng - centerLng;
    const dist = dLat * dLat + dLng * dLng;
    if (dist < minDist) {
      minDist = dist;
      nearest = hospital;
    }
  }

  return nearest;
}

export function resolveNearestHospital(
  record: {
    center_lat: number;
    center_lng: number;
    nearest_hospital_name?: string;
  },
  hospitals: HospitalRecord[],
): HospitalRecord | null {
  if (record.nearest_hospital_name) {
    const matched = hospitals.find((h) => h.name === record.nearest_hospital_name);
    if (matched) return matched;
  }

  return findNearestHospital(record.center_lat, record.center_lng, hospitals);
}
