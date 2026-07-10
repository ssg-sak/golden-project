import type { HospitalRecord } from '../types/hospital';

const EARTH_RADIUS_KM = 6371;

/** Haversine 직선거리(km) */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** haversineKm 별칭 — 시민 뷰 거리 계산용 */
export const calculateDistance = haversineKm;

export function formatDistanceKm(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
}

export interface HospitalWithDistance extends HospitalRecord {
  distanceKm: number;
}

export function sortHospitalsByDistance(
  hospitals: HospitalRecord[],
  originLat: number,
  originLng: number,
): HospitalWithDistance[] {
  return hospitals
    .map((hospital) => ({
      ...hospital,
      distanceKm: haversineKm(originLat, originLng, hospital.lat, hospital.lng),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
