/** 카카오맵 JavaScript 키 — frontend/.env 의 VITE_KAKAO_MAP_APP_KEY */
export const KAKAO_MAP_APP_KEY = import.meta.env.VITE_KAKAO_MAP_APP_KEY ?? '';

export function isKakaoMapConfigured(): boolean {
  return KAKAO_MAP_APP_KEY.trim().length > 0;
}
