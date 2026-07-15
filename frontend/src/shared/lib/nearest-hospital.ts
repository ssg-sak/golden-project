import type { HospitalRecord } from '../types/hospital';
import { isEmergencyRelevantHospital } from '../types/hospital';

export function distanceKm(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): number {
  const earthRadiusKm = 6371;
  const dLat = ((toLat - fromLat) * Math.PI) / 180;
  const dLng = ((toLng - fromLng) * Math.PI) / 180;
  const lat1 = (fromLat * Math.PI) / 180;
  const lat2 = (toLat * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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

export function resolveEmergencyRelevantNearestHospital(
  record: {
    center_lat: number;
    center_lng: number;
    nearest_hospital_name?: string;
  },
  hospitals: HospitalRecord[],
): { hospital: HospitalRecord | null; distanceKm: number | null; replacedRawNearest: boolean } {
  const emergencyRelevantHospitals = hospitals.filter(isEmergencyRelevantHospital);
  const matchedRawNearest = record.nearest_hospital_name
    ? emergencyRelevantHospitals.find((hospital) => hospital.name === record.nearest_hospital_name)
    : undefined;

  if (matchedRawNearest) {
    return {
      hospital: matchedRawNearest,
      distanceKm: distanceKm(record.center_lat, record.center_lng, matchedRawNearest.lat, matchedRawNearest.lng),
      replacedRawNearest: false,
    };
  }

  const hospital = findNearestHospital(record.center_lat, record.center_lng, emergencyRelevantHospitals);
  return {
    hospital,
    distanceKm: hospital ? distanceKm(record.center_lat, record.center_lng, hospital.lat, hospital.lng) : null,
    replacedRawNearest: Boolean(record.nearest_hospital_name && hospital),
  };
}
