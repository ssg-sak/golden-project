import { useEffect } from 'react';

import { useLocationStore } from '../store/locationStore';
import type { LocationErrorReason, UserLocation } from '../types/user-location';

export type { LocationErrorReason, LocationSource, UserLocation } from '../types/user-location';

export interface UseUserLocationResult {
  location: UserLocation | null;
  isLocating: boolean;
  errorReason: LocationErrorReason | null;
  retry: () => void;
}

/**
 * 앱 전역 GPS 상태 — `/` · `/list` 전환 시 재요청하지 않습니다.
 */
export function useUserLocation(): UseUserLocationResult {
  const location = useLocationStore((state) => state.location);
  const isLocating = useLocationStore((state) => state.isLocating);
  const errorReason = useLocationStore((state) => state.errorReason);
  const ensureLocation = useLocationStore((state) => state.ensureLocation);
  const retry = useLocationStore((state) => state.retry);

  useEffect(() => {
    ensureLocation();
  }, [ensureLocation]);

  return { location, isLocating, errorReason, retry };
}
