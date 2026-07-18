import { create } from 'zustand';

import type { GeoJsonFeatureCollection } from '../types/geojson';
import type { HospitalRecord } from '../types/hospital';
import type {
  OptimalLocation,
  PolicyOptimizationData,
} from '../../widgets/map-dashboard/lib/useOptimalLocationsStore';
import type { ResourceRecommendation } from '../../widgets/map-dashboard/lib/useResourceSimulation';

export interface PolicyReleaseMetadata {
  version: string;
  released_at: string;
  population_base_month: string;
  district_count: number;
  resource_count: number;
  resource_count_by_mode: { pediatric: number; senior: number };
  candidate_count: number;
  risk_threshold: number;
  high_risk_district_count: number;
  route_count: number;
  successful_route_count: number;
  missing_route_count: number;
  source_sha256: string;
}

export interface PolicyReleaseBundle {
  metadata: PolicyReleaseMetadata;
  hospitals: HospitalRecord[];
  vulnerability: GeoJsonFeatureCollection;
  candidates: OptimalLocation[];
  candidate_trace: OptimalLocation[];
  optimization: PolicyOptimizationData;
  recommendations: ResourceRecommendation[];
}

interface PolicyReleaseState {
  release: PolicyReleaseBundle | null;
  isLoading: boolean;
  error: string | null;
  fetchRelease: () => Promise<PolicyReleaseBundle>;
}

function validateRelease(release: PolicyReleaseBundle): void {
  const { metadata } = release;
  const valid =
    metadata.version === '2026-07-18-r2' &&
    metadata.district_count === 150 &&
    metadata.resource_count === 25 &&
    metadata.resource_count_by_mode.pediatric === 6 &&
    metadata.resource_count_by_mode.senior === 19 &&
    metadata.candidate_count === 9 &&
    metadata.route_count === 5100 &&
    metadata.successful_route_count === 5100 &&
    metadata.missing_route_count === 0 &&
    release.hospitals.length === 25 &&
    release.vulnerability.features.length === 150 &&
    release.candidates.length === 9 &&
    release.recommendations.length === 9 &&
    release.optimization.metadata.version === metadata.version &&
    release.optimization.metadata.matrix_source_sha256 === metadata.source_sha256;

  if (!valid) {
    throw new Error('정책 분석 릴리스의 기관·경로·버전 검증에 실패했습니다.');
  }
}

let inFlight: Promise<PolicyReleaseBundle> | null = null;

export const usePolicyReleaseStore = create<PolicyReleaseState>((set, get) => ({
  release: null,
  isLoading: false,
  error: null,
  fetchRelease: async () => {
    const current = get().release;
    if (current) return current;
    if (inFlight) return inFlight;

    set({ isLoading: true, error: null });
    inFlight = fetch(`${import.meta.env.BASE_URL}data/policy_release.json`)
      .then(async (response) => {
        if (!response.ok) throw new Error(`정책 분석 릴리스 조회 실패 (${response.status})`);
        const release = (await response.json()) as PolicyReleaseBundle;
        validateRelease(release);
        set({ release, isLoading: false, error: null });
        return release;
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : '정책 분석 릴리스를 불러오지 못했습니다.';
        set({ release: null, isLoading: false, error: message });
        throw error;
      })
      .finally(() => {
        inFlight = null;
      });
    return inFlight;
  },
}));
