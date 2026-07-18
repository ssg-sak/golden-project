import { describe, expect, it } from 'vitest';

import type { HospitalRecord } from '../../../frontend/src/shared/types/hospital';
import {
  getCanonicalHospitals,
  normalizeHospitalLocation,
} from '../../../frontend/src/shared/lib/canonical-hospitals';

describe('canonical hospital locations', () => {
  it('replaces stale server location while preserving realtime fields', () => {
    const serverHospital: HospitalRecord = {
      name: '삼일병원',
      lat: 35.858,
      lng: 128.495,
      tier: 2,
      address: '오래된 주소',
      available_beds: 7,
      tel: '053-123-4567',
    };

    expect(normalizeHospitalLocation(serverHospital)).toMatchObject({
      name: '삼일병원',
      lat: 35.8325112,
      lng: 128.5535572,
      address: '대구 달서구 월배로 436',
      available_beds: 7,
      tel: '053-123-4567',
    });
  });

  it('leaves an unknown server hospital untouched', () => {
    const hospital = {
      name: '새로 추가된 병원',
      lat: 35.87,
      lng: 128.6,
      tier: 2,
    } satisfies HospitalRecord;

    expect(normalizeHospitalLocation(hospital)).toBe(hospital);
  });

  it('contains the 25 canonical hospitals used by demo and fallback sources', () => {
    expect(getCanonicalHospitals()).toHaveLength(25);
  });
});
