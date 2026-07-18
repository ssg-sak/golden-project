import { create } from 'zustand';

import type { GeoJsonFeatureCollection } from '../types/geojson';
import type { HospitalRecord } from '../types/hospital';
import type {
  OptimalLocation,
  PolicyOptimizationData,
} from '../../widgets/map-dashboard/lib/useOptimalLocationsStore';

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
  route_result_sha256: string;
}

export interface PolicyReleaseBundle {
  metadata: PolicyReleaseMetadata;
  hospitals: HospitalRecord[];
  vulnerability: GeoJsonFeatureCollection;
  candidates: OptimalLocation[];
  candidate_trace: OptimalLocation[];
  optimization: PolicyOptimizationData;
}

interface PolicyReleaseState {
  release: PolicyReleaseBundle | null;
  isLoading: boolean;
  error: string | null;
  fetchRelease: () => Promise<PolicyReleaseBundle>;
}

function validateRelease(release: PolicyReleaseBundle): void {
  const { metadata } = release;
  const candidateKeys = new Set(
    release.candidates.map((candidate) =>
      `${candidate.mode}:${candidate.id}:${candidate.lat.toFixed(7)}:${candidate.lng.toFixed(7)}`,
    ),
  );
  const traceKeys = new Set(
    release.candidate_trace.map((candidate) =>
      `${candidate.mode}:${candidate.id}:${candidate.lat.toFixed(7)}:${candidate.lng.toFixed(7)}`,
    ),
  );
  const expectedRouteCount =
    metadata.district_count * (metadata.resource_count + metadata.candidate_count);
  const valid =
    Boolean(metadata.version) &&
    metadata.district_count === release.vulnerability.features.length &&
    metadata.resource_count === release.hospitals.length &&
    metadata.resource_count_by_mode.pediatric + metadata.resource_count_by_mode.senior ===
      metadata.resource_count &&
    metadata.candidate_count === release.candidates.length &&
    metadata.route_count === expectedRouteCount &&
    metadata.successful_route_count === metadata.route_count &&
    metadata.missing_route_count === 0 &&
    release.candidate_trace.length === release.candidates.length &&
    candidateKeys.size === traceKeys.size &&
    [...candidateKeys].every((key) => traceKeys.has(key)) &&
    release.optimization.metadata.version === metadata.version &&
    release.optimization.metadata.matrix_source_sha256 === metadata.source_sha256 &&
    release.optimization.metadata.matrix_route_result_sha256 === metadata.route_result_sha256;

  if (!valid) {
    throw new Error('정책 분석 결과의 기관·경로·기준 검증에 실패했습니다.');
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
        if (!response.ok) throw new Error(`정책 분석 결과 조회 실패 (${response.status})`);
        const release = (await response.json()) as PolicyReleaseBundle;
        validateRelease(release);
        set({ release, isLoading: false, error: null });
        return release;
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : '정책 분석 결과를 불러오지 못했습니다.';
        set({ release: null, isLoading: false, error: message });
        throw error;
      })
      .finally(() => {
        inFlight = null;
      });
    return inFlight;
  },
}));
