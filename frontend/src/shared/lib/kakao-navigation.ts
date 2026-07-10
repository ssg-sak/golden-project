export function kakaoDirectionsUrl(hospitalName: string, lat: number, lng: number): string {
  return `https://map.kakao.com/link/to/${encodeURIComponent(hospitalName)},${lat},${lng}`;
}

/** 지도에서 해당 좌표 위치를 바로 열기 */
export function kakaoMapPointUrl(lat: number, lng: number): string {
  return `https://map.kakao.com/link/map/${lat},${lng}`;
}

export function formatHospitalCoordinates(lat: number, lng: number): string {
  return `위도 ${lat.toFixed(6)} · 경도 ${lng.toFixed(6)}`;
}
