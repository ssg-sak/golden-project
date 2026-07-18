import { resolveBedStatus } from './bed-status';
import type { HospitalWithDistance } from './distance';
import type { HospitalRecord } from '../types/hospital';

export interface HospitalEtaLookup {
  [hospitalName: string]: { eta_seconds: number | null | undefined } | undefined;
}

function recommendationTier(hospital: HospitalRecord): number {
  const { status, congestion } = resolveBedStatus(hospital);

  if (status === 'reported-bed-positive') {
    if (congestion === 'smooth') return 0;
    if (congestion === 'moderate') return 1;
    return 2;
  }
  if (status === 'reported-bed-zero') return 3;
  return 4;
}

/** 보고된 일반응급실 병상 수를 먼저 비교하고, 같은 상태에서는 ETA와 직선거리 순으로 비교한다. */
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
  if (status === 'reported-bed-positive' && congestion === 'smooth') return '조회 시점에 일반응급실 가용 병상이 비교적 많이 보고된 기관입니다.';
  if (status === 'reported-bed-positive' && congestion === 'moderate') return '조회 시점에 일반응급실 가용 병상이 보고된 기관입니다.';
  if (status === 'reported-bed-positive') return '조회 시점에 일반응급실 가용 병상이 보고됐습니다.';
  if (status === 'reported-bed-zero') return '조회 시점의 일반응급실 가용 병상 보고값은 0입니다.';
  return '병상 정보 확인이 필요합니다. 출발 전 전화로 문의하세요.';
}
