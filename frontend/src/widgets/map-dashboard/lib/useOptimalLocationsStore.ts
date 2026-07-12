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
  },

  fetchLocations: async () => {
    const { currentMode } = get();
    set({ isLoading: true, error: null });

    try {
      const dataBaseUrl = `${import.meta.env.BASE_URL}data/`;
      let fetchUrl = `${dataBaseUrl}optimal_locations_pediatric.json`;

      if (currentMode === 'senior') {
        fetchUrl = `${dataBaseUrl}optimal_locations_senior.json`;
      } else if (currentMode === 'pediatric') {
        fetchUrl = `${dataBaseUrl}optimal_locations_pediatric.json`;
      } else {
        set({ locations: [], isLoading: false });
        return;
      }

      const response = await fetch(fetchUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      const data = (await response.json()) as OptimalLocation[];
      set({ locations: data, isLoading: false });
    } catch (error) {
      console.error('Failed to load optimal locations:', error);
      set({ error: '입지 분석 데이터를 불러오지 못했습니다.', isLoading: false });
    }
  },
}));
