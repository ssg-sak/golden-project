/** GNB(로고 + 탭) sticky 높이 — 사이드바 top·지도 min-h 계산에 사용 */
export const DASHBOARD_STICKY_TOP_CLASS = 'lg:top-[7.25rem]';

/** 뷰 루트 — AppPage flex 체인 안에서 남은 높이를 채움 */
export const DASHBOARD_VIEW_ROOT_CLASS = 'flex min-h-0 flex-1 flex-col';

/** 3단 메인 — 모바일은 풀스크린 relative, 데스크톱은 3단 flex */
export const DASHBOARD_MAIN_CLASS =
  'relative mx-auto flex w-full max-w-[1800px] flex-1 overflow-hidden lg:flex-row lg:items-stretch lg:gap-3 lg:p-6 lg:overflow-visible';

/** 좌측 패널 — 모바일 바텀 시트화 (absolute bottom-0) */
export const DASHBOARD_SIDEBAR_COL_CLASS = `absolute bottom-0 left-0 right-0 z-10 flex flex-col max-h-[55dvh] overflow-hidden rounded-t-3xl bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.12)] transition-transform duration-300 lg:relative lg:order-1 lg:z-auto lg:max-h-none lg:w-72 lg:self-start lg:rounded-none lg:bg-transparent lg:shadow-none xl:w-80 lg:sticky ${DASHBOARD_STICKY_TOP_CLASS}`;

export const DASHBOARD_SIDEBAR_PANEL_CLASS =
  'flex w-full h-full flex-col overflow-hidden lg:glass-panel-strong lg:max-h-[calc(100dvh-8.5rem)]';

/** 지도 — 모바일 풀스크린 (absolute inset-0) */
export const DASHBOARD_MAP_COL_CLASS =
  'absolute inset-0 z-0 flex flex-col lg:glass-panel-strong lg:relative lg:order-2 lg:z-auto lg:min-h-[calc(100dvh-9rem)] lg:min-w-0 lg:flex-1 lg:rounded-xl lg:p-0.5';

/** 우측 패널 — 모바일 플로팅 팝업 / 바텀 시트 (z-20) */
export const DASHBOARD_DETAIL_COL_CLASS =
  'absolute inset-x-0 bottom-0 z-20 flex flex-col max-h-[65dvh] rounded-t-3xl bg-white shadow-[0_-12px_40px_rgba(0,0,0,0.2)] lg:relative lg:order-3 lg:z-auto lg:max-h-none lg:w-[22rem] lg:shrink-0 lg:rounded-none lg:bg-transparent lg:shadow-none xl:w-96';

export const DASHBOARD_DETAIL_INNER_CLASS =
  'h-full lg:max-h-[calc(100dvh-8.5rem)]';
