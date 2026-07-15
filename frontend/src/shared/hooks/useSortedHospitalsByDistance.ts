import { useMemo } from 'react';

import { filterByCareTarget } from '../../widgets/map-dashboard/lib/hospital-filter';
import { isHospitalAvailable } from '../lib/bed-status';
import { calculateDistance, type HospitalWithDistance } from '../lib/distance';
import { compareHospitalRecommendations } from '../lib/hospital-recommendation';
import type { HospitalRecord } from '../types/hospital';

export interface UseSortedHospitalsOptions {
  /** true면 진료 가능(병상 ≥ 1) 병원만 */
  availableOnly?: boolean;
  /** 시민 진료 대상 필터 */
  careTarget?: 'all' | 'adult' | 'pediatric' | 'senior';
  /** recommendation은 병상 여유를 우선하고 같은 상태에서 거리를 비교한다. */
  sortMode?: 'distance' | 'recommendation';
}

/**
 * GPS·병원 원본이 바뀔 때만 Haversine 거리 계산·정렬을 재실행합니다.
 */
export function useSortedHospitalsByDistance(
  hospitals: HospitalRecord[],
  originLat?: number,
  originLng?: number,
  options: UseSortedHospitalsOptions = {},
): HospitalWithDistance[] {
  const { availableOnly = false, careTarget = 'all', sortMode = 'distance' } = options;

  return useMemo(() => {
    if (hospitals.length === 0 || !originLat || !originLng) {
      return [];
    }

    // 1) 진료대상 필터
    let filtered = filterByCareTarget(hospitals, careTarget);

    // 2) 가용성 필터
    if (availableOnly) {
      filtered = filtered.filter((h) => isHospitalAvailable(h));
    }

    // 3) 거리 계산 및 정렬
    const sorted = filtered
      .map((h) => ({
        ...h,
        distanceKm: calculateDistance(originLat, originLng, h.lat, h.lng),
      }))
      .sort((a, b) =>
        sortMode === 'recommendation'
          ? compareHospitalRecommendations(a, b)
          : a.distanceKm - b.distanceKm,
      );

    return sorted;
  }, [hospitals, originLat, originLng, availableOnly, careTarget, sortMode]);
}
