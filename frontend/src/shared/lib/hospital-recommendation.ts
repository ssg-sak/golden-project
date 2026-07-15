import { resolveBedStatus } from './bed-status';
import type { HospitalWithDistance } from './distance';
import type { HospitalRecord } from '../types/hospital';

export interface HospitalEtaLookup {
  [hospitalName: string]: { eta_seconds: number | null | undefined } | undefined;
}

function recommendationTier(hospital: HospitalRecord): number {
  const { status, congestion } = resolveBedStatus(hospital);

  if (status === 'available') {
    if (congestion === 'smooth') return 0;
    if (congestion === 'moderate') return 1;
    return 2;
  }
  if (status === 'unavailable') return 3;
  return 4;
}

/** 병상 상태를 먼저 비교하고, 같은 상태에서는 ETA와 직선거리 순으로 비교한다. */
export function compareHospitalRecommendations(
  a: HospitalWithDistance,
  b: HospitalWithDistance,
  etas: HospitalEtaLookup = {},
): number {
  const tierDifference = recommendationTier(a) - recommendationTier(b);
  if (tierDifference !== 0) return tierDifference;

  const etaA = etas[a.name]?.eta_seconds;
  const etaB = etas[b.name]?.eta_seconds;
  if (etaA != null && etaB != null && etaA !== etaB) return etaA - etaB;
  if (etaA != null && etaB == null) return -1;
  if (etaB != null && etaA == null) return 1;

  return a.distanceKm - b.distanceKm;
}

export function hospitalRecommendationReason(hospital: HospitalRecord): string {
  const { status, congestion } = resolveBedStatus(hospital);
  if (status === 'available' && congestion === 'smooth') return '일반응급실 병상 여유가 가장 큰 병원군입니다.';
  if (status === 'available' && congestion === 'moderate') return '일반응급실 병상 여유가 확인된 병원입니다.';
  if (status === 'available') return '혼잡 추정이지만 현재 가용 병상이 있습니다.';
  if (status === 'unavailable') return '현재 일반응급실 가용 병상이 확인되지 않습니다.';
  return '병상 정보 확인이 필요합니다. 출발 전 전화로 문의하세요.';
}
