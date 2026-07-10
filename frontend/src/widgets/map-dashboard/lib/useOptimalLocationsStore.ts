import { create } from 'zustand';

export interface OptimalLocation {
  id: number;
  lat: number;
  lng: number;
  demand: number;
}

interface OptimalLocationsState {
  locations: OptimalLocation[];
  isLoading: boolean;
  error: string | null;
  showLocations: boolean;
  currentMode: string;
  setMode: (mode: string) => void;
  toggleLocations: () => void;
  fetchLocations: () => Promise<void>;
}

export const useOptimalLocationsStore = create<OptimalLocationsState>((set, get) => ({
  locations: [],
  isLoading: false,
  error: null,
  showLocations: false,
  currentMode: 'all',

  setMode: (mode: string) => set({ currentMode: mode }),

  toggleLocations: () => {
    const { showLocations } = get();
    set({ showLocations: !showLocations, error: null });
    
    // UI 토글 시 기본적으로 현재 상태를 엽니다. mode는 패널이나 맵 컴포넌트 측 useEffect에서 별도로 fetch 해줄 예정.
  },

  fetchLocations: async () => {
    // 모드가 바뀌면 locations 캐시 무시하고 새로 불러와야 하므로, 캐시 체크 로직 제거 또는 개선
    const { currentMode } = get();
    set({ isLoading: true, error: null });

    try {
      let fetchUrl = '/data/optimal_locations_pediatric.json'; // fallback 기본값
      
      if (currentMode === 'senior') {
        fetchUrl = '/data/optimal_locations_senior.json';
      } else if (currentMode === 'pediatric') {
        fetchUrl = '/data/optimal_locations_pediatric.json';
      } else {
        // all 이나 adult 일 때는 AI 분석 거점이 아직 없으므로 빈 배열 처리 (또는 pediatric 기본)
        set({ locations: [], isLoading: false });
        return;
      }

      const response = await fetch(fetchUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      const data = await response.json();
      set({ locations: data, isLoading: false });
    } catch (err) {
      console.error('Failed to load optimal locations:', err);
      set({ error: 'AI 입지 분석 데이터를 불러오지 못했습니다.', isLoading: false });
    }
  },
}));
