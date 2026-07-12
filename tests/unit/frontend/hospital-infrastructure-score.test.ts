import { describe, expect, it } from 'vitest';
import type { HospitalRecord } from '../../../frontend/src/shared/types/hospital';
import {
  calculateInfrastructureMetrics,
  hasSufficientInfrastructureData,
} from '../../../frontend/src/widgets/map-dashboard/lib/hospital-infrastructure-score';

const hospital: HospitalRecord = {
  name: '테스트병원',
  lat: 35.8,
  lng: 128.6,
  tier: 2,
  doctors_count: 25,
  hvec: 10,
  hvoc: 5,
  equipment_status: { CT: true, MRI: false, 초음파: true, 인공호흡기: false },
  hira_source: 'api',
};

describe('calculateInfrastructureMetrics', () => {
  it('병원 데이터를 0~100점 지표로 정규화한다', () => {
    expect(calculateInfrastructureMetrics(hospital)).toEqual([
      { label: '의료진', value: 50 },
      { label: '장비', value: 50 },
      { label: '수용력', value: 75 },
      { label: '기관 등급', value: 70 },
    ]);
  });

  it('데이터가 없을 때 임의의 최저 점수를 만들지 않는다', () => {
    const emptyHospital = { ...hospital, doctors_count: undefined, hvec: undefined, hvoc: undefined, equipment_status: undefined };
    expect(calculateInfrastructureMetrics(emptyHospital).map(({ value }) => value)).toEqual([0, 0, 0, 70]);
  });

  it('검증 가능한 의료진·장비·병상 지표가 모두 있을 때 차트를 허용한다', () => {
    expect(hasSufficientInfrastructureData(hospital)).toBe(true);
    expect(hasSufficientInfrastructureData({ ...hospital, hira_source: undefined })).toBe(true);
    expect(hasSufficientInfrastructureData({ ...hospital, equipment_status: undefined })).toBe(false);
  });
});
