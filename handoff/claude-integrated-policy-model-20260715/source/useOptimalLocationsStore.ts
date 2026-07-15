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
  accessibility_metric?: 'actual_road_time' | 'estimated_drive_time' | 'distance';
  before_avg_eta_minutes?: number;
  after_avg_eta_minutes?: number;
  accessibility_gain_minutes?: number;
  p_median_weighted_eta_minutes?: number;
  mclp_15min_population?: number;
  mclp_15min_coverage_ratio?: number;
  mclp_30min_population?: number;
  mclp_30min_coverage_ratio?: number;
  time_based_score?: number;
  time_improved_district_count?: number;
  time_improved_population?: number;
  optimal_combinations?: {
    p_median?: string[];
    mclp_15min?: string[];
    mclp_30min?: string[];
  };
  top_improved_districts?: Array<{
    adm_nm: string;
    before_distance_km: number;
    after_distance_km: number;
    gain_km: number;
    vulnerable_population: number;
  }>;
  top_time_improved_districts?: Array<{
    adm_nm: string;
    before_eta_minutes: number;
    after_eta_minutes: number;
    gain_minutes: number;
    after_road_distance_km: number;
    vulnerable_population: number;
    covered_15min: boolean;
    covered_30min: boolean;
  }>;
}

interface PolicyOptimizationObjective {
  candidate_ids: number[];
  candidate_resource_ids: string[];
  weighted_average_eta_minutes: number;
  covered_15min_population: number;
  covered_15min_ratio: number;
  covered_30min_population: number;
  covered_30min_ratio: number;
  improved_population: number;
}

export interface PolicyOptimizationResult {
  facility_count: number;
  combination_count: number;
  p_median_optimum: PolicyOptimizationObjective;
  mclp_15min_optimum: PolicyOptimizationObjective;
  mclp_30min_optimum: PolicyOptimizationObjective;
}

export interface PolicyOptimizationData {
  metadata: {
    matrix_method: 'actual_road_route_api';
    optimization: 'exact_enumeration';
    max_facilities: number;
    objective_populations: Record<'pediatric' | 'senior', number>;
  };
  results: Record<'pediatric' | 'senior', PolicyOptimizationResult[]>;
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
  optimization: PolicyOptimizationData | null;
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
  optimization: null,
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

      const optimization = await fetchJson<PolicyOptimizationData>(
        `${dataBaseUrl}policy_location_optimization.json`,
      );

      set({
        locations: data.filter((location) => !isRemoteLowDemandCandidate(location)),
        optimization,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to load optimal locations:', error);
      set({ error: '입지 분석 데이터를 불러오지 못했습니다.', isLoading: false });
    }
  },
}));
