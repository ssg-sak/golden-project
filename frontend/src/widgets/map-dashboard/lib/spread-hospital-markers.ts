import type { HospitalRecord } from '../../../shared/types/hospital';

import type { KakaoLatLng } from './geojson-to-kakao';

export interface SpreadHospitalMarker extends HospitalRecord {
  /** 겹침 방지용 표시 위치 오프셋 (도) */
  offsetLat: number;
  offsetLng: number;
}

const CLUSTER_DISTANCE_DEG = 0.014;
const SPREAD_RADIUS_DEG = 0.007;

/** 가까운 병원 마커를 원형으로 펼쳐 클릭·표시 겹침 완화 */
export function spreadHospitalMarkers(
  hospitals: HospitalRecord[],
): SpreadHospitalMarker[] {
  const positioned: SpreadHospitalMarker[] = hospitals.map((h) => ({
    ...h,
    offsetLat: 0,
    offsetLng: 0,
  }));

  const visited = new Set<number>();

  for (let i = 0; i < positioned.length; i++) {
    if (visited.has(i)) continue;

    const cluster = [i];
    visited.add(i);

    for (let j = i + 1; j < positioned.length; j++) {
      if (visited.has(j)) continue;
      const dist = Math.hypot(
        positioned[i].lat - positioned[j].lat,
        positioned[i].lng - positioned[j].lng,
      );
      if (dist < CLUSTER_DISTANCE_DEG) {
        cluster.push(j);
        visited.add(j);
      }
    }

    if (cluster.length < 2) continue;

    cluster.forEach((idx, order) => {
      const angle = (2 * Math.PI * order) / cluster.length - Math.PI / 2;
      positioned[idx].offsetLat = SPREAD_RADIUS_DEG * Math.sin(angle);
      positioned[idx].offsetLng = SPREAD_RADIUS_DEG * Math.cos(angle);
    });
  }

  return positioned;
}

export function hospitalDisplayPosition(
  hospital: SpreadHospitalMarker,
): [number, number] {
  return [hospital.lat + hospital.offsetLat, hospital.lng + hospital.offsetLng];
}

export interface HospitalMarkerIndex {
  spread: SpreadHospitalMarker[];
  byName: Map<string, SpreadHospitalMarker>;
}

export function createHospitalMarkerIndex(
  hospitals: HospitalRecord[],
): HospitalMarkerIndex {
  const spread = spreadHospitalMarkers(hospitals);
  const byName = new Map(spread.map((hospital) => [hospital.name, hospital]));
  return { spread, byName };
}

/** 연결선·마커가 동일 좌표를 쓰도록 spread 반영 위치 반환 */
export function hospitalDisplayLatLng(
  byName: Map<string, SpreadHospitalMarker>,
  name: string,
  fallbackLat: number,
  fallbackLng: number,
): KakaoLatLng {
  const hospital = byName.get(name);
  if (!hospital) return { lat: fallbackLat, lng: fallbackLng };
  const [lat, lng] = hospitalDisplayPosition(hospital);
  return { lat, lng };
}
