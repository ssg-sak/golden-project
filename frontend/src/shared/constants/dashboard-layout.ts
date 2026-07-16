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

/** 데스크톱 좌측 병원 목록 */
export const DESKTOP_SIDEBAR_WRAPPER_CLASS = 'relative order-1 w-72 xl:w-80 flex flex-col min-h-0';

/** 데스크톱 좌측 병원 목록 패널 */
export const DESKTOP_SIDEBAR_PANEL_CLASS =
  'flex w-full flex-1 flex-col glass-panel-strong min-h-0 overflow-hidden';

/** 지도 영역 */
export const DASHBOARD_MAP_COL_CLASS =
  'absolute inset-0 z-0 flex flex-col lg:glass-panel-strong lg:relative lg:order-2 lg:z-auto lg:min-h-0 lg:min-w-0 lg:flex-[1_1_auto] lg:rounded-sm lg:p-0.5';

/** 우측 정책 안내/상세 패널 */
export const DASHBOARD_DETAIL_COL_CLASS =
  'absolute inset-x-0 bottom-0 z-20 flex flex-col max-h-[65dvh] rounded-t-3xl bg-white shadow-[0_-12px_40px_rgba(0,0,0,0.2)] lg:relative lg:order-3 lg:z-auto lg:flex lg:min-h-0 lg:w-[23rem] lg:shrink-0 lg:rounded-none lg:bg-transparent lg:shadow-none xl:w-[25rem]';

export const DASHBOARD_DETAIL_INNER_CLASS =
  'flex min-h-0 flex-1 flex-col overflow-hidden';
