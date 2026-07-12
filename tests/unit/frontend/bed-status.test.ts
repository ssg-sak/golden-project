import { describe, expect, it } from 'vitest';
import { resolveBedStatus } from '../../../frontend/src/shared/lib/bed-status';
import type { HospitalRecord } from '../../../frontend/src/shared/types/hospital';

const base: HospitalRecord = {
  name: '테스트병원',
  lat: 35.8,
  lng: 128.6,
  tier: 2,
};

describe('resolveBedStatus', () => {
  it('소아 병상이 남아 있어도 일반응급실이 0이면 일반응급실 여유 없음으로 판단한다', () => {
    expect(resolveBedStatus({ ...base, hvec: 0, hvoc: 5, available_beds: 0 })).toEqual({
      status: 'unavailable',
    });
  });

  it('일반응급실 가용 병상 수만 시민 상태 숫자로 사용한다', () => {
    expect(resolveBedStatus({ ...base, hvec: 3, hvoc: 5, available_beds: 3 })).toEqual({
      status: 'available',
      count: 3,
      congestion: 'smooth',
    });
  });

  it('일반응급실 가용 비율에 따라 혼잡 색상 상태를 구분한다', () => {
    expect(resolveBedStatus({ ...base, hvec: 4, total_hvec: 10 })).toMatchObject({ congestion: 'crowded' });
    expect(resolveBedStatus({ ...base, hvec: 6, total_hvec: 10 })).toMatchObject({ congestion: 'moderate' });
    expect(resolveBedStatus({ ...base, hvec: 8, total_hvec: 10 })).toMatchObject({ congestion: 'smooth' });
  });
});
