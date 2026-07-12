/**
 * 환경 변수 통합 관리 모듈
 * Vite의 import.meta.env를 타입 안전하게 노출합니다.
 */

export const ENV = {
  /** 깃허브 페이지 포트폴리오 데모 전용 모드 활성화 여부 */
  IS_SIMULATION_MODE: import.meta.env.VITE_IS_SIMULATION_MODE === 'true',
  /** 정적 계산(false) vs 백엔드 dashboard snapshot(true) */
  USE_DYNAMIC_DASHBOARD_DATA: import.meta.env.VITE_USE_DYNAMIC_DASHBOARD_DATA === 'true',
};
