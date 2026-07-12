import { create } from 'zustand';
import { DASHBOARD_SUMMARY_API_URL } from '../config/api';

export interface DashboardSummary {
  adminArea: {
    count: number;
    label: string;
    difference: number;
    changeText: string;
  };
  emergencyFacilities: {
    total: number;
    categories: {
      large: number;
      secondary: number;
      moonlightPediatric: number;
    };
    difference: number;
    changeText: string;
  };
  risk: {
    highRiskCount: number;
    threshold: number;
    difference: number;
    changeText: string;
  };
  population: {
    baseMonth: string;
  };
  status: {
    lastCheckedAt: string | null;
    lastUpdatedAt: string | null;
    stale: boolean;
    dataState?: string;
    failedSources?: string[];
  };
  analysisVersion?: string | null;
}

interface DashboardSummaryStore {
  summary: DashboardSummary | null;
  isLoading: boolean;
  error: string | null;
  lastFetchedAt: string | null;
  fetchSummary: () => Promise<void>;
}

const REFRESH_MS = 60_000;

export const useDashboardSummaryStore = create<DashboardSummaryStore>((set) => ({
  summary: null,
  isLoading: false,
  error: null,
  lastFetchedAt: null,
  fetchSummary: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(DASHBOARD_SUMMARY_API_URL);
      if (!response.ok) {
        throw new Error(`대시보드 요약 조회 실패 (${response.status})`);
      }
      const summary = (await response.json()) as DashboardSummary;
      set({
        summary,
        isLoading: false,
        error: null,
        lastFetchedAt: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '대시보드 요약 조회 실패';
      set({ isLoading: false, error: message });
    }
  },
}));

export function startDashboardSummaryPolling(): () => void {
  const store = useDashboardSummaryStore.getState();
  void store.fetchSummary();

  const timer = window.setInterval(() => {
    if (document.visibilityState === 'visible') {
      void useDashboardSummaryStore.getState().fetchSummary();
    }
  }, REFRESH_MS);

  const onFocus = () => {
    void useDashboardSummaryStore.getState().fetchSummary();
  };
  window.addEventListener('focus', onFocus);

  return () => {
    window.clearInterval(timer);
    window.removeEventListener('focus', onFocus);
  };
}
