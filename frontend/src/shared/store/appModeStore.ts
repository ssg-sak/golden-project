import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** citizen: 시민 구조망 · admin: 정책·분석 모니터링 · intro: 플랫폼 소개 */
export type ViewMode = 'citizen' | 'admin' | 'intro';

interface AppModeStore {
  /** 기본값 citizen. persist 적용으로 브라우저 새로고침 시 유지됨 */
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

export const useAppModeStore = create<AppModeStore>()(
  persist(
    (set) => ({
      viewMode: 'citizen',
      setViewMode: (mode) => set({ viewMode: mode }),
    }),
    {
      name: 'golden-time-mode', // localStorage에 저장될 키 이름
    }
  )
);
