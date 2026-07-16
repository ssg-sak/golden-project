/** GNB 높이를 고려한 데스크톱 sticky 기준 */
export const DASHBOARD_STICKY_TOP_CLASS = 'lg:top-[7.25rem]';

/** AppPage flex 체인 안에서 남은 높이를 채우는 루트 */
export const DASHBOARD_VIEW_ROOT_CLASS = 'flex min-h-0 flex-1 flex-col';

/** 데스크톱 3열 레이아웃 */
export const DASHBOARD_MAIN_CLASS =
  'relative mx-auto flex w-full max-w-[1900px] flex-1 overflow-hidden lg:flex-row lg:items-stretch lg:gap-3 lg:px-4 lg:py-4 xl:px-5 xl:py-5';

/** 모바일 바텀 시트 래퍼 */
export const MOBILE_BOTTOM_SHEET_WRAPPER_CLASS =
  'absolute bottom-0 left-0 right-0 z-10 flex flex-col h-[55dvh] overflow-hidden rounded-t-3xl bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.12)] transition-transform duration-300';

/** 모바일 바텀 시트 내부 패널 */
export const MOBILE_BOTTOM_SHEET_PANEL_CLASS =
  'flex w-full h-full flex-col overflow-hidden';

/** 데스크톱 좌측 병원 목록 (공통 — Admin에서는 sticky 방식 사용) */
export const DESKTOP_SIDEBAR_WRAPPER_CLASS = `relative order-1 w-72 self-start xl:w-80 sticky ${DASHBOARD_STICKY_TOP_CLASS}`;

/** 데스크톱 좌측 병원 목록 패널 */
export const DESKTOP_SIDEBAR_PANEL_CLASS =
  'flex w-full flex-col glass-panel-strong max-h-[calc(100dvh-8.5rem)] overflow-hidden';

/** 지도 영역 */
export const DASHBOARD_MAP_COL_CLASS =
  'absolute inset-0 z-0 flex flex-col lg:glass-panel-strong lg:relative lg:order-2 lg:z-auto lg:min-h-0 lg:min-w-0 lg:flex-[1_1_auto] lg:rounded-sm lg:p-0.5';

/** 우측 정책 안내/상세 패널 */
export const DASHBOARD_DETAIL_COL_CLASS =
  'absolute inset-x-0 bottom-0 z-20 flex flex-col max-h-[65dvh] rounded-t-3xl bg-white shadow-[0_-12px_40px_rgba(0,0,0,0.2)] lg:relative lg:order-3 lg:z-auto lg:min-h-0 lg:w-[23rem] lg:shrink-0 lg:rounded-none lg:bg-transparent lg:shadow-none xl:w-[25rem]';

export const DASHBOARD_DETAIL_INNER_CLASS =
  'h-full min-h-0';

// ─────────────────────────────────────────────────────────────────────
// 시민 뷰 전용 — 네이버 지도 방식 (각 패널이 뷰포트에 고정, 내부 독립 스크롤)
// ─────────────────────────────────────────────────────────────────────

/**
 * 시민 뷰 전용 사이드바 래퍼.
 * sticky 대신 self-stretch + flex-col + min-h-0 으로 부모 높이를 꽉 채워 내부에서 스크롤.
 */
export const CITIZEN_SIDEBAR_WRAPPER_CLASS = 'relative order-1 w-72 xl:w-80 flex flex-col min-h-0 self-stretch';

/**
 * 시민 뷰 전용 사이드바 패널.
 * max-h 없이 flex-1 + overflow-hidden 으로 부모가 주는 공간을 모두 사용.
 */
export const CITIZEN_SIDEBAR_PANEL_CLASS =
  'flex w-full flex-1 flex-col glass-panel-strong min-h-0 overflow-hidden';

/**
 * 시민 뷰 전용 우측 상세 패널 컬럼.
 * 항상 flex로 띄우고 내부에서 overflow-hidden + 독립 스크롤 처리.
 */
export const CITIZEN_DETAIL_COL_CLASS =
  'absolute inset-x-0 bottom-0 z-20 flex flex-col max-h-[65dvh] rounded-t-3xl bg-white shadow-[0_-12px_40px_rgba(0,0,0,0.2)] lg:relative lg:order-3 lg:z-auto lg:flex lg:min-h-0 lg:w-[23rem] lg:shrink-0 lg:rounded-none lg:bg-transparent lg:shadow-none xl:w-[25rem]';

export const CITIZEN_DETAIL_INNER_CLASS =
  'flex min-h-0 flex-1 flex-col overflow-hidden';
