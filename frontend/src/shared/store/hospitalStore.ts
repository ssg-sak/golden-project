import { create } from 'zustand';

import { fetchHospitals } from '../../data/api/hospitals';
import { STATIC_FALLBACK_HOSPITAL_DATA } from '../data/static-fallback-hospitals';
import { FetchTimeoutError } from '../lib/fetch-with-timeout';
import { readErrorMessage } from '../lib/error-message';
import type { HospitalRecord } from '../types/hospital';

interface HospitalStore {
  hospitals: HospitalRecord[];
  isLoading: boolean;
  /** 서킷 브레이커·네트워크 폴백 사용 여부 — UI 배너 표시 */
  isDegraded: boolean;
  /** 폴백 성격 구분: 이전 캐시 유지 vs 정적 null 폴백 */
  degradedMode: 'stale-cache' | 'static-fallback' | null;
  /** 마지막 병원 데이터 갱신 시각 (성공/폴백 포함) */
  lastUpdatedAt: string | null;
  /** 폴백 불가한 치명적 실패 (병원 목록 자체 없음) */
  error: string | null;
  fetchHospitals: () => Promise<void>;
}

let hospitalFetchSeq = 0;
let abortController: AbortController | null = null;

function pickFallbackHospitals(previous: HospitalRecord[]): HospitalRecord[] {
  if (previous.length > 0) return previous;
  return STATIC_FALLBACK_HOSPITAL_DATA;
}

export const useHospitalStore = create<HospitalStore>((set, get) => ({
  hospitals: [],
  isLoading: false,
  isDegraded: false,
  degradedMode: null,
  lastUpdatedAt: null,
  error: null,

  fetchHospitals: async () => {
    const fetchId = ++hospitalFetchSeq;

    if (abortController) {
      abortController.abort();
    }
    abortController = new AbortController();
    const signal = abortController.signal;

    const previous = get().hospitals;

    set({ isLoading: true, error: null, isDegraded: false, degradedMode: null });

    try {
      const result = await fetchHospitals(signal);
      if (fetchId !== hospitalFetchSeq) return;

      set({
        hospitals: result.hospitals,
        isLoading: false,
        error: null,
        isDegraded: result.cacheStale,
        degradedMode: result.cacheStale ? 'stale-cache' : null,
        lastUpdatedAt: result.cacheUpdatedAt,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      if (fetchId !== hospitalFetchSeq) return;

      const fallback = pickFallbackHospitals(previous);

      if (fallback.length === 0) {
        set({
          hospitals: [],
          isLoading: false,
          error: readErrorMessage(error, '지금은 병원 정보를 불러올 수 없습니다'),
          isDegraded: false,
          degradedMode: null,
        });
        return;
      }

      if (import.meta.env.DEV) {
        const reason =
          error instanceof FetchTimeoutError
            ? 'circuit breaker timeout (6s)'
            : error;
        console.warn('[hospitalStore] graceful degradation:', reason);
      }

      const usedPrevious = previous.length > 0;

      set({
        hospitals: fallback,
        isLoading: false,
        error: null,
        isDegraded: true,
        degradedMode: usedPrevious ? 'stale-cache' : 'static-fallback',
      });

      if (import.meta.env.DEV && usedPrevious) {
        console.warn('[hospitalStore] kept previous hospital list (stale beds possible)');
      }
    }
  },
}));
