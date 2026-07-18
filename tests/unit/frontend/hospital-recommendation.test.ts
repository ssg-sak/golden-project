import { describe, expect, it } from 'vitest';
import {
  compareHospitalRecommendations,
  hospitalRecommendationReason,
} from '../../../frontend/src/shared/lib/hospital-recommendation';
import type { HospitalWithDistance } from '../../../frontend/src/shared/lib/distance';

function hospital(
  name: string,
  distanceKm: number,
  hvec: number | null,
  totalHvec: number | null,
): HospitalWithDistance {
  return {
    name,
    lat: 35.8,
    lng: 128.6,
    tier: 2,
    distanceKm,
    hvec,
    total_hvec: totalHvec,
  };
}

describe('응급실 병상 보고값 기반 정렬', () => {
  it('가용병상 0 보고 기관보다 양수가 보고된 기관을 먼저 정렬한다', () => {
    const zeroReported = hospital('가까운 병원', 1, 0, 10);
    const positiveReported = hospital('병상 보고 병원', 8, 8, 10);

    expect([zeroReported, positiveReported].sort(compareHospitalRecommendations)[0].name).toBe('병상 보고 병원');
  });

  it('같은 병상 상태에서는 차량 ETA가 짧은 병원을 먼저 추천한다', () => {
    const first = hospital('A병원', 2, 8, 10);
    const second = hospital('B병원', 1, 9, 10);
    const etas = {
      'A병원': { eta_seconds: 300 },
      'B병원': { eta_seconds: 600 },
    };

    expect([second, first].sort((a, b) => compareHospitalRecommendations(a, b, etas))[0].name).toBe('A병원');
  });

  it('ETA가 없으면 같은 상태에서 직선거리를 사용한다', () => {
    const near = hospital('가까운 병원', 2, 6, 10);
    const far = hospital('먼 병원', 7, 7, 10);

    expect([far, near].sort(compareHospitalRecommendations)[0].name).toBe('가까운 병원');
  });

  it('정렬 근거가 보고값임을 밝히고 진료·수용을 단정하지 않는다', () => {
    const reason = hospitalRecommendationReason(hospital('병원', 2, 8, 10));

    expect(reason).toContain('조회 시점');
    expect(reason).toContain('보고');
    expect(reason).not.toContain('대기 없음');
    expect(reason).not.toContain('수용 확정');
  });
});
