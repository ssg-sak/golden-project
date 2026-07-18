import { create } from 'zustand';

/** citizen: 시민 구조망 · admin: 정책·분석 모니터링 · intro: 플랫폼 소개 */
export type ViewMode = 'citizen' | 'admin' | 'intro';

interface AppModeStore {
  /** 새로고침 시 무조건 citizen(지도) 모드로 시작하도록 persist(캐시) 제거 */
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  
  /** 포트폴리오 데모용 시뮬레이션(스냅샷) 모드 토글 */
  isSimulationMode: boolean;
  setSimulationMode: (on: boolean) => void;
}

export const useAppModeStore = create<AppModeStore>()((set) => ({
  viewMode: 'citizen',
  setViewMode: (mode) => set({ viewMode: mode }),
  isSimulationMode: false,
  setSimulationMode: () => set({ isSimulationMode: false }),
}));
