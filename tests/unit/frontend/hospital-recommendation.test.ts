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

describe('응급실 병상 여유 추천', () => {
  it('가까워도 여유가 없는 병원보다 병상 여유가 있는 병원을 먼저 추천한다', () => {
    const unavailable = hospital('가까운 병원', 1, 0, 10);
    const available = hospital('여유 병원', 8, 8, 10);

    expect([unavailable, available].sort(compareHospitalRecommendations)[0].name).toBe('여유 병원');
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

  it('추천 근거가 실제 대기 없음이나 수용 확정을 단정하지 않는다', () => {
    const reason = hospitalRecommendationReason(hospital('병원', 2, 8, 10));

    expect(reason).toContain('병상 여유');
    expect(reason).not.toContain('대기 없음');
    expect(reason).not.toContain('수용 확정');
  });
});
