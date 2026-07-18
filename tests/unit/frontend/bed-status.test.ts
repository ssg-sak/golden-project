import { describe, expect, it } from 'vitest';
import {
  hasReportedGeneralErBed,
  resolveBedStatus,
} from '../../../frontend/src/shared/lib/bed-status';
import type { HospitalRecord } from '../../../frontend/src/shared/types/hospital';
import { filterByCareTarget } from '../../../frontend/src/widgets/map-dashboard/lib/hospital-filter';

const base: HospitalRecord = {
  name: '테스트병원',
  lat: 35.8,
  lng: 128.6,
  tier: 2,
};

describe('resolveBedStatus', () => {
  it('소아 병상이 남아 있어도 일반응급실이 0이면 일반응급실 여유 없음으로 판단한다', () => {
    expect(resolveBedStatus({ ...base, hvec: 0, hvoc: 5, available_beds: 0 })).toEqual({
      status: 'reported-bed-zero',
      count: 0,
    });
  });

  it('일반응급실 가용 병상 수만 시민 상태 숫자로 사용한다', () => {
    expect(resolveBedStatus({ ...base, hvec: 3, hvoc: 5, available_beds: 3 })).toEqual({
      status: 'reported-bed-positive',
      count: 3,
      congestion: 'smooth',
    });
  });

  it('일반응급실 가용 비율에 따라 혼잡 색상 상태를 구분한다', () => {
    expect(resolveBedStatus({ ...base, hvec: 4, total_hvec: 10 })).toMatchObject({ congestion: 'crowded' });
    expect(resolveBedStatus({ ...base, hvec: 6, total_hvec: 10 })).toMatchObject({ congestion: 'moderate' });
    expect(resolveBedStatus({ ...base, hvec: 8, total_hvec: 10 })).toMatchObject({ congestion: 'smooth' });
  });

  it('null은 병상정보 미확인으로 유지한다', () => {
    expect(resolveBedStatus({ ...base, hvec: null, available_beds: null })).toEqual({
      status: 'unknown',
    });
  });

  it('달빛어린이병원을 응급병상 보유 필터에 자동 포함하지 않는다', () => {
    const moonlight = { ...base, tier: 3, hvec: null, available_beds: null } as HospitalRecord;

    expect(hasReportedGeneralErBed(moonlight)).toBe(false);
    expect(hasReportedGeneralErBed({ ...base, hvec: 0 })).toBe(false);
    expect(hasReportedGeneralErBed({ ...base, hvec: 3 })).toBe(true);
  });

  it('달빛어린이병원은 야간·휴일 소아진료 필터에서 별도로 포함한다', () => {
    const moonlight = {
      ...base,
      name: '달빛어린이병원',
      tier: 3,
      is_moonlight: true,
      hvec: null,
    } as HospitalRecord;

    expect(
      filterByCareTarget([moonlight], 'pediatric', 'pediatric_night_holiday'),
    ).toEqual([moonlight]);
  });
});
