import { useEffect } from 'react';

import { ENV } from '../config/env';
import { startDashboardSummaryPolling } from '../store/dashboardSummaryStore';
import { useHospitalStore } from '../store/hospitalStore';
import { useVulnerabilityStore } from '../store/vulnerabilityStore';

/**
 * 앱 최상위에서 병원·취약지구 데이터를 한 번만 불러옵니다.
 * 모드 전환 시 재요청하지 않아 깜빡임을 줄입니다.
 *
 * 실패 시(`error !== null`) 자동 재시도하지 않습니다. 화면의 「다시 시도」로만 재요청합니다.
 */
export function AppDataBootstrap({ children }: { children: React.ReactNode }) {
  const hospitals = useHospitalStore((state) => state.hospitals);
  const hospitalsLoading = useHospitalStore((state) => state.isLoading);
  const hospitalsError = useHospitalStore((state) => state.error);
  const fetchHospitals = useHospitalStore((state) => state.fetchHospitals);

  const vulnerabilityFeatures = useVulnerabilityStore((state) => state.features);
  const vulnerabilityLoading = useVulnerabilityStore((state) => state.isLoading);
  const vulnerabilityError = useVulnerabilityStore((state) => state.error);
  const fetchVulnerability = useVulnerabilityStore((state) => state.fetchVulnerability);

  useEffect(() => {
    if (hospitals.length === 0 && !hospitalsLoading && hospitalsError === null) {
      void fetchHospitals();
    }
  }, [hospitals.length, hospitalsLoading, hospitalsError, fetchHospitals]);

  useEffect(() => {
    if (
      vulnerabilityFeatures.length === 0 &&
      !vulnerabilityLoading &&
      vulnerabilityError === null
    ) {
      void fetchVulnerability();
    }
  }, [
    vulnerabilityFeatures.length,
    vulnerabilityLoading,
    vulnerabilityError,
    fetchVulnerability,
  ]);

  useEffect(() => {
    if (!ENV.USE_DYNAMIC_DASHBOARD_DATA) return undefined;
    return startDashboardSummaryPolling();
  }, []);

  return children;
}
