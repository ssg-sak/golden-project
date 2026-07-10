export type LocationSource = 'device' | 'fallback';

/** Geolocation 실패·거부·타임아웃·대구 외 지역 등 */
export type LocationErrorReason = 'denied' | 'unavailable' | 'timeout' | 'unsupported' | 'outside';

export interface UserLocation {
  lat: number;
  lng: number;
  source: LocationSource;
}
