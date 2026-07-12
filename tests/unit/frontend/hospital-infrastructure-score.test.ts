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
  total_hvec: 20,
  hvoc: 5,
  equipment_status: { CT: true, MRI: false, 초음파: true, 인공호흡기: false },
  special_beds: {
    분만실: { available: null, total: 2, is_available: true },
    음압격리: { available: 0, total: 1 },
  },
  hira_source: 'api',
};

describe('calculateInfrastructureMetrics', () => {
  it('병원 데이터를 0~100점 지표로 정규화한다', () => {
    expect(calculateInfrastructureMetrics(hospital)).toEqual([
      { label: '의료인력 기반', value: 25, detail: '등록 의사 25명 · 역할 기준 100명' },
      { label: '핵심장비 확인', value: 50, detail: '확인 항목 2/4개 보유' },
      { label: '일반응급실 여력', value: 50, detail: '10/20병상 가용' },
      { label: '특수병상 대응', value: 50, detail: '1/2개 유형 가용' },
    ]);
  });

  it('데이터가 없을 때 임의의 최저 점수를 만들지 않는다', () => {
    const emptyHospital = { ...hospital, doctors_count: undefined, hvec: undefined, total_hvec: undefined, hvoc: undefined, equipment_status: undefined, special_beds: undefined };
    expect(calculateInfrastructureMetrics(emptyHospital).map(({ value }) => value)).toEqual([null, null, null, null]);
  });

  it('일부 공식 데이터만 있어도 항목별 행정 비교표를 표시한다', () => {
    expect(hasSufficientInfrastructureData(hospital)).toBe(true);
    expect(hasSufficientInfrastructureData({ ...hospital, doctors_count: undefined, equipment_status: undefined })).toBe(true);
    expect(hasSufficientInfrastructureData({ ...hospital, doctors_count: undefined, equipment_status: undefined, hvec: undefined, total_hvec: undefined, special_beds: undefined })).toBe(false);
  });

  it('응급장비 현재 가용 정보가 있으면 보유 스냅샷보다 우선한다', () => {
    const [equipmentMetric] = calculateInfrastructureMetrics({
      ...hospital,
      emergency_equipment_status: { CT: true, MRI: true, 조영촬영기: false, 인공호흡기: true },
    }).filter(({ label }) => label === '핵심장비 확인');
    expect(equipmentMetric).toEqual({
      label: '핵심장비 확인',
      value: 75,
      detail: '응급장비 3/4개 현재 가용',
    });
  });
});
