/**
 * 행정동 GeoJSON 전체 범위를 바깥쪽 0.01도 단위로 반올림한 안전 경계다.
 * 직사각형 판정이 정확한 행정구역 판정은 아니지만 유효한 대구 좌표를 잘라내지 않아야 한다.
 */
export const DAEGU_SW = { lat: 35.6, lng: 128.34 };
export const DAEGU_NE = { lat: 36.34, lng: 128.91 };

export function clampToDaeguBounds(lat: number, lng: number): { lat: number; lng: number } {
  return {
    lat: Math.min(DAEGU_NE.lat, Math.max(DAEGU_SW.lat, lat)),
    lng: Math.min(DAEGU_NE.lng, Math.max(DAEGU_SW.lng, lng)),
  };
}

export function isInsideDaeguBounds(lat: number, lng: number): boolean {
  return (
    lat >= DAEGU_SW.lat &&
    lat <= DAEGU_NE.lat &&
    lng >= DAEGU_SW.lng &&
    lng <= DAEGU_NE.lng
  );
}
