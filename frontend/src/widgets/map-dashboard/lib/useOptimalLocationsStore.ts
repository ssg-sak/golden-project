import { create } from 'zustand';

export interface OptimalLocation {
  id: number;
  lat: number;
  lng: number;
  demand: number;
  mode?: 'pediatric' | 'senior';
  candidate_type?: 'kmeans_centroid' | 'district_centroid' | 'grid_candidate';
  candidate_group?: 'main_daegu' | 'separate_region' | 'hold';
  covered_districts?: string[];
  nearest_existing_hospital?: string;
  before_avg_distance_km?: number;
  after_avg_distance_km?: number;
  accessibility_gain_km?: number;
  vulnerable_population?: number;
  covered_district_count?: number;
  nearest_existing_hospital_distance_km?: number;
  scenario_coverage_ratio?: number;
  score?: number;
  interpretation?: string;
  top_improved_districts?: Array<{
    adm_nm: string;
    before_distance_km: number;
    after_distance_km: number;
    gain_km: number;
    vulnerable_population: number;
  }>;
}

function isRemoteLowDemandCandidate(location: OptimalLocation): boolean {
  return (
    location.candidate_group === 'separate_region' ||
    location.candidate_group === 'hold' ||
    (location.lat >= 36 && location.demand < 10)
  );
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

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return (await response.json()) as T;
}

export const useOptimalLocationsStore = create<OptimalLocationsState>((set, get) => ({
  locations: [],
  isLoading: false,
  error: null,
  showLocations: false,
  currentMode: 'all',

  setMode: (mode: string) => {
    const isSupportedMode = mode === 'pediatric' || mode === 'senior';
    set({
      currentMode: mode,
      locations: isSupportedMode ? get().locations : [],
      showLocations: isSupportedMode ? get().showLocations : false,
      error: null,
    });
  },

  toggleLocations: () => {
    const { showLocations } = get();
    set({ showLocations: !showLocations, error: null });
  },

  fetchLocations: async () => {
    const { currentMode } = get();
    set({ isLoading: true, error: null });

    try {
      const dataBaseUrl = `${import.meta.env.BASE_URL}data/`;
      if (currentMode !== 'pediatric' && currentMode !== 'senior') {
        set({ locations: [], isLoading: false });
        return;
      }

      let data: OptimalLocation[] = [];
      try {
        const stableCandidates = await fetchJson<OptimalLocation[]>(`${dataBaseUrl}stable_policy_candidates.json`);
        data = stableCandidates.filter((location) => location.mode === currentMode);
      } catch {
        const tracedCandidates = await fetchJson<OptimalLocation[]>(`${dataBaseUrl}accessibility_candidate_trace.json`);
        data = tracedCandidates.filter((location) => location.mode === currentMode);
      }

      if (data.length === 0) {
        const fallbackFile =
          currentMode === 'senior' ? 'optimal_locations_senior.json' : 'optimal_locations_pediatric.json';
        data = await fetchJson<OptimalLocation[]>(`${dataBaseUrl}${fallbackFile}`);
      }

      set({
        locations: data.filter((location) => !isRemoteLowDemandCandidate(location)),
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to load optimal locations:', error);
      set({ error: '입지 분석 데이터를 불러오지 못했습니다.', isLoading: false });
    }
  },
}));
