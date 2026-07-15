/** 대구광역시 행정권역 경계. 군위군 편입 이후 북쪽 권역까지 포함한다. */
export const DAEGU_SW = { lat: 35.68, lng: 128.38 };
export const DAEGU_NE = { lat: 36.26, lng: 128.84 };

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
