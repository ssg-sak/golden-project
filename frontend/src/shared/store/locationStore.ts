import { create } from 'zustand';

import type { LocationErrorReason, UserLocation } from '../types/user-location';
import { DAEGU_CITY_HALL } from '../constants/daegu';
import { isInsideDaeguBounds } from '../lib/daegu-bounds';

const GEO_TIMEOUT_MS = 10_000;

function readPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('unsupported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: GEO_TIMEOUT_MS,
      maximumAge: 60_000,
    });
  });
}

interface LocationStore {
  location: UserLocation | null;
  isLocating: boolean;
  errorReason: LocationErrorReason | null;
  attempt: number;
  /** 최초 1회 또는 retry 시 Geolocation 요청 */
  ensureLocation: () => void;
  retry: () => void;
}

export const useLocationStore = create<LocationStore>((set, get) => ({
  location: null,
  isLocating: false,
  errorReason: null,
  attempt: 0,

  ensureLocation: () => {
    const { isLocating, location, attempt } = get();
    if (isLocating || location !== null) return;

    set({ isLocating: true, errorReason: null });

    const currentAttempt = attempt;

    void (async () => {
      try {
        const position = await readPosition();
        if (get().attempt !== currentAttempt) return;

        const { latitude, longitude } = position.coords;
        if (!isInsideDaeguBounds(latitude, longitude)) {
          set({
            errorReason: 'outside',
            location: {
              lat: DAEGU_CITY_HALL.lat,
              lng: DAEGU_CITY_HALL.lng,
              source: 'fallback',
            },
            isLocating: false,
          });
          return;
        }

        set({
          location: {
            lat: latitude,
            lng: longitude,
            source: 'device',
          },
          isLocating: false,
          errorReason: null,
        });
      } catch (error) {
        if (get().attempt !== currentAttempt) return;

        const geoError = error as GeolocationPositionError & { message?: string };
        let reason: LocationErrorReason = 'unavailable';

        if (geoError?.message === 'unsupported') {
          reason = 'unsupported';
        } else if (geoError?.code === 1) {
          reason = 'denied';
        } else if (geoError?.code === 3) {
          reason = 'timeout';
        }

        set({
          errorReason: reason,
          location: {
            lat: DAEGU_CITY_HALL.lat,
            lng: DAEGU_CITY_HALL.lng,
            source: 'fallback',
          },
          isLocating: false,
        });
      }
    })();
  },

  retry: () => {
    set({
      attempt: get().attempt + 1,
      location: null,
      isLocating: false,
      errorReason: null,
    });
    get().ensureLocation();
  },
}));
