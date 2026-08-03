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

interface PolicyReleasePointer {
  version: string;
  released_at: string;
  population_base_month: string;
  content_sha256: string;
  bundle_sha256: string;
  bundle_url: string;
}

interface PolicyReleaseState {
  release: PolicyReleaseBundle | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastCheckedAt: string | null;
  fetchRelease: () => Promise<PolicyReleaseBundle>;
  refreshLatest: () => Promise<PolicyReleaseBundle>;
}

export function validateRelease(release: PolicyReleaseBundle): void {
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

export function isSafeBundleUrl(bundleUrl: string): boolean {
  return (
    bundleUrl.startsWith('data/releases/') &&
    bundleUrl.endsWith('/policy_release.json') &&
    !bundleUrl.includes('..') &&
    !bundleUrl.includes('://')
  );
}

async function sha256Hex(content: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', content);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function fetchPointer(): Promise<PolicyReleasePointer | null> {
  const response = await fetch(
    `${import.meta.env.BASE_URL}data/policy_release.latest.json?t=${Date.now()}`,
    { cache: 'no-store' },
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`최신 분석 버전 확인 실패 (${response.status})`);
  const pointer = (await response.json()) as PolicyReleasePointer;
  if (!pointer.version || !pointer.bundle_sha256 || !isSafeBundleUrl(pointer.bundle_url)) {
    throw new Error('최신 분석 버전 정보가 올바르지 않습니다.');
  }
  return pointer;
}

async function fetchBundle(pointer: PolicyReleasePointer | null): Promise<PolicyReleaseBundle> {
  const bundleUrl = pointer?.bundle_url ?? 'data/policy_release.json';
  const response = await fetch(`${import.meta.env.BASE_URL}${bundleUrl}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`정책 분석 결과 조회 실패 (${response.status})`);
  const rawContent = await response.arrayBuffer();
  if (pointer && crypto?.subtle) {
    const actualHash = await sha256Hex(rawContent);
    if (actualHash !== pointer.bundle_sha256) {
      throw new Error('새 분석 결과의 파일 검증에 실패했습니다.');
    }
  }
  const release = JSON.parse(new TextDecoder().decode(rawContent)) as PolicyReleaseBundle;
  validateRelease(release);
  if (pointer && release.metadata.version !== pointer.version) {
    throw new Error('최신 버전 정보와 분석 결과 버전이 다릅니다.');
  }
  return release;
}

let inFlight: Promise<PolicyReleaseBundle> | null = null;

async function loadLatest(currentVersion?: string): Promise<PolicyReleaseBundle | null> {
  const pointer = await fetchPointer();
  if (pointer && pointer.version === currentVersion) return null;
  return fetchBundle(pointer);
}

export const usePolicyReleaseStore = create<PolicyReleaseState>((set, get) => ({
  release: null,
  isLoading: false,
  isRefreshing: false,
  error: null,
  lastCheckedAt: null,
  fetchRelease: async () => {
    const current = get().release;
    if (current) return current;
    if (inFlight) return inFlight;

    set({ isLoading: true, error: null });
    inFlight = loadLatest()
      .then((latest) => {
        if (!latest) throw new Error('정책 분석 결과를 찾지 못했습니다.');
        set({
          release: latest,
          isLoading: false,
          error: null,
          lastCheckedAt: new Date().toISOString(),
        });
        return latest;
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
  refreshLatest: async () => {
    if (inFlight) return inFlight;
    const current = get().release;
    if (!current) return get().fetchRelease();

    set({ isRefreshing: true });
    inFlight = loadLatest(current.metadata.version)
      .then((latest) => {
        const release = latest ?? current;
        set({
          release,
          isRefreshing: false,
          error: null,
          lastCheckedAt: new Date().toISOString(),
        });
        return release;
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : '정책 분석 결과를 불러오지 못했습니다.';
        // 새 파일 검증에 실패하면 이미 표시 중인 검증본을 그대로 유지한다.
        set({ release: current, isRefreshing: false, error: message });
        return current;
      })
      .finally(() => {
        inFlight = null;
      });
    return inFlight;
  },
}));

export function startPolicyReleasePolling(intervalMs = 5 * 60 * 1000): () => void {
  const refresh = () => {
    void usePolicyReleaseStore.getState().refreshLatest();
  };
  const intervalId = window.setInterval(refresh, intervalMs);
  window.addEventListener('focus', refresh);
  return () => {
    window.clearInterval(intervalId);
    window.removeEventListener('focus', refresh);
  };
}
