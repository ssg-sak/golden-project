/** GNB(로고 + 탭) sticky 높이 — 사이드바 top·지도 min-h 계산에 사용 */
export const DASHBOARD_STICKY_TOP_CLASS = 'lg:top-[7.25rem]';

/** 뷰 루트 — AppPage flex 체인 안에서 남은 높이를 채움 */
export const DASHBOARD_VIEW_ROOT_CLASS = 'flex min-h-0 flex-1 flex-col';

/** 3단 메인 — 지도 열이 flex-1로 남은 공간을 우선 차지 */
export const DASHBOARD_MAIN_CLASS =
  'mx-auto flex w-full min-h-0 max-w-[1800px] flex-1 flex-col gap-2 px-3 py-2 lg:flex-row lg:items-stretch lg:gap-3 lg:px-6';

export const DASHBOARD_SIDEBAR_COL_CLASS = `order-2 w-full shrink-0 lg:order-1 lg:sticky ${DASHBOARD_STICKY_TOP_CLASS} lg:w-72 lg:self-start xl:w-80`;

export const DASHBOARD_SIDEBAR_PANEL_CLASS =
  'glass-panel-strong flex w-full flex-col lg:max-h-[calc(100dvh-8.5rem)] lg:overflow-hidden';

/** 지도 — 모바일에서도 첫 화면의 주인공, 데스크톱에서는 뷰포트 높이에 맞춤 */
export const DASHBOARD_MAP_COL_CLASS =
  'glass-panel-strong relative order-1 flex min-h-[min(56vh,520px)] w-full min-w-0 flex-1 flex-col overflow-hidden rounded-xl p-0.5 lg:order-2 lg:min-h-[calc(100dvh-9rem)]';

export const DASHBOARD_DETAIL_COL_CLASS =
  'order-3 w-full shrink-0 lg:w-[22rem] xl:w-96';

export const DASHBOARD_DETAIL_INNER_CLASS =
  'h-[min(38vh,22rem)] lg:h-full lg:max-h-[calc(100dvh-8.5rem)]';
