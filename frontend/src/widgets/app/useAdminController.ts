import { useCallback, useEffect, useMemo, useState } from 'react';
import { ENV } from '../../shared/config/env';
import { useDashboardSummaryStore } from '../../shared/store/dashboardSummaryStore';
import { useHospitalStore } from '../../shared/store/hospitalStore';
import { useVulnerabilityStore } from '../../shared/store/vulnerabilityStore';
import { useOptimalLocationsStore } from '../map-dashboard/lib/useOptimalLocationsStore';
import { usePresetStore } from '../map-dashboard/lib/usePresetStore';
import type { HospitalRecord } from '../../shared/types/hospital';
import { toAdmNmKey } from '../../shared/types/vulnerability';

interface KakaoState {
  configured: boolean;
  loading: boolean;
  error: ErrorEvent | null;
}

export function useAdminController(_kakao: KakaoState, onRetryHospitals: () => void) {
  const useDynamicDashboard = ENV.USE_DYNAMIC_DASHBOARD_DATA;

  const hospitals = useHospitalStore((state) => state.hospitals);
  const hospitalsLoading = useHospitalStore((state) => state.isLoading);
  const hospitalsError = useHospitalStore((state) => state.error);
  const hospitalsDegraded = useHospitalStore((state) => state.isDegraded);
  const hospitalsDegradedMode = useHospitalStore((state) => state.degradedMode);
  const hospitalsUpdatedAt = useHospitalStore((state) => state.lastUpdatedAt);

  const dashboardSummary = useDashboardSummaryStore((state) => state.summary);
  const dashboardLoading = useDashboardSummaryStore((state) => state.isLoading);
  const dashboardError = useDashboardSummaryStore((state) => state.error);
  const dashboardFetchedAt = useDashboardSummaryStore((state) => state.lastFetchedAt);
  const fetchDashboardSummary = useDashboardSummaryStore((state) => state.fetchSummary);

  const currentMode = useOptimalLocationsStore((state) => state.currentMode);
  const setOptimalMode = useOptimalLocationsStore((state) => state.setMode);
  const showLocations = useOptimalLocationsStore((state) => state.showLocations);
  const fetchLocations = useOptimalLocationsStore((state) => state.fetchLocations);

  useEffect(() => {
    if (showLocations) {
      fetchLocations();
    }
  }, [currentMode, showLocations, fetchLocations]);

  const vulnerabilityData = useVulnerabilityStore((state) => state.records);
  const vulnerabilityLoading = useVulnerabilityStore((state) => state.isLoading);
  const vulnerabilityError = useVulnerabilityStore((state) => state.error);
  const vulnerabilityDegraded = useVulnerabilityStore((state) => state.isDegraded);
  const vulnerabilityUpdatedAt = useVulnerabilityStore((state) => state.lastUpdatedAt);
  const fetchVulnerability = useVulnerabilityStore((state) => state.fetchVulnerability);

  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [selectedHospital, setSelectedHospital] = useState<HospitalRecord | null>(null);
  const [riskThreshold, setRiskThreshold] = useState(10000);

  // 선택 이후 실제 API 응답이 도착해도 정적 폴백 객체가 남지 않도록 최신 store 레코드로 재결합한다.
  const resolvedSelectedHospital = useMemo(() => {
    if (!selectedHospital) return null;
    return hospitals.find((hospital) => hospital.name === selectedHospital.name) ?? selectedHospital;
  }, [hospitals, selectedHospital]);

  const selectedVulnerability = useMemo(() => {
    if (!selectedDistrict) return null;
    const key = toAdmNmKey(selectedDistrict);
    return vulnerabilityData.find((row) => row.adm_nm === key) ?? null;
  }, [vulnerabilityData, selectedDistrict]);

  const vulnerabilityRange = useMemo(() => {
    if (vulnerabilityData.length === 0) return { min: 0, max: 0 };
    const values = vulnerabilityData.map((row) => row.vdi_log);
    return { min: Math.min(...values), max: Math.max(...values) };
  }, [vulnerabilityData]);

  useEffect(() => {
    if (useDynamicDashboard && dashboardSummary) {
      return;
    }
    if (vulnerabilityData.length === 0) return;
    const sorted = [...vulnerabilityData].sort((a, b) => b.vdi_log - a.vdi_log);
    const defaultCutoff = sorted[Math.floor(sorted.length * 0.25)]?.vdi_log ?? 0;
    setRiskThreshold((current) => (current === 0 ? defaultCutoff : current));
  }, [useDynamicDashboard, dashboardSummary, vulnerabilityData]);

  useEffect(() => {
    if (useDynamicDashboard) return;
    if (riskThreshold < vulnerabilityRange.min) {
      setRiskThreshold(vulnerabilityRange.min);
    } else if (riskThreshold > vulnerabilityRange.max) {
      setRiskThreshold(vulnerabilityRange.max);
    }
  }, [useDynamicDashboard, riskThreshold, vulnerabilityRange.max, vulnerabilityRange.min]);

  const highRiskDistrictCount = useMemo(() => {
    return vulnerabilityData.filter((row) => row.vdi_log >= riskThreshold).length;
  }, [vulnerabilityData, riskThreshold]);

  const vulnerabilitySummary = useMemo(() => {
    if (vulnerabilityData.length === 0) return null;
    const total = vulnerabilityData.length;
    return {
      avgVulnerabilityIndex:
        vulnerabilityData.reduce((acc, row) => acc + row.vdi_log, 0) / total,
      avgDistanceKm:
        vulnerabilityData.reduce((acc, row) => acc + row.min_dist_to_hospital, 0) / total,
      avgVulnerablePop:
        vulnerabilityData.reduce((acc, row) => acc + row.vulnerable_pop, 0) / total,
      riskThreshold,
    };
  }, [vulnerabilityData, riskThreshold]);

  const highlightedHospitalName = useMemo(() => {
    if (!selectedVulnerability || selectedHospital) return null;
    return selectedVulnerability.nearest_hospital_name ?? null;
  }, [selectedVulnerability, selectedHospital]);

  const handleHospitalSelect = useCallback((hospital: HospitalRecord | null) => {
    setSelectedHospital(hospital);
    if (hospital) setSelectedDistrict(null);
  }, []);

  const handleDistrictSelect = useCallback((admNm: string | null) => {
    setSelectedDistrict(admNm);
    if (admNm) {
      setSelectedHospital(null);
    }
  }, []);

  const handleRetryVulnerability = useCallback(() => {
    void fetchVulnerability();
    if (useDynamicDashboard) {
      void fetchDashboardSummary();
    }
  }, [fetchVulnerability, useDynamicDashboard, fetchDashboardSummary]);

  const activePreset = usePresetStore((state) => state.activePreset);

  const districtCount = useDynamicDashboard
    ? (dashboardSummary?.adminArea.count ?? 0)
    : vulnerabilityError
      ? 0
      : vulnerabilityData.length;

  const tier1Count = useDynamicDashboard
    ? (dashboardSummary?.emergencyFacilities.categories.large ?? 0)
    : hospitals.filter((h) => h.tier === 1).length;
  const tier2Count = useDynamicDashboard
    ? (dashboardSummary?.emergencyFacilities.categories.secondary ?? 0)
    : hospitals.filter((h) => h.tier === 2).length;
  const tier3Count = useDynamicDashboard
    ? (dashboardSummary?.emergencyFacilities.categories.moonlightPediatric ?? 0)
    : hospitals.filter((h) => h.tier === 3).length;

  const statsLoading = useDynamicDashboard
    ? dashboardLoading && !dashboardSummary
    : hospitalsLoading || vulnerabilityLoading;

  const mapBlocked = hospitalsLoading || hospitalsError !== null;
  const isDetailOpen = selectedHospital !== null || selectedVulnerability !== null || activePreset !== null;

  const policyStatus = useMemo(() => {
    if (useDynamicDashboard && dashboardError && !dashboardSummary) {
      return {
        tone: 'warning' as const,
        message: `${dashboardError} 저장된 분석 데이터를 먼저 보여드리고 있습니다.`,
        actionLabel: '정책 요약 다시 시도',
        onAction: () => void fetchDashboardSummary(),
        actionLoading: dashboardLoading,
      };
    }
    if (hospitalsError) {
      return {
        tone: 'danger' as const,
        message: `${hospitalsError} 다시 시도해 주세요.`,
        actionLabel: '병원 다시 시도',
        onAction: onRetryHospitals,
        actionLoading: hospitalsLoading,
      };
    }
    if (hospitalsDegraded) {
      return {
        tone: 'warning' as const,
        message:
          hospitalsDegradedMode === 'stale-cache'
            ? '병원 API가 불안정해 이전 병상 데이터를 표시 중입니다.'
            : '병원 실시간 병상 연결 실패로 기본 병원 목록을 표시 중입니다.',
        actionLabel: '병원 다시 시도',
        onAction: onRetryHospitals,
        actionLoading: hospitalsLoading,
      };
    }
    if (vulnerabilityError) {
      return {
        tone: 'warning' as const,
        message: `${vulnerabilityError} 저장된 분석 또는 병원 위치 정보로 계속 진행합니다.`,
        actionLabel: '분석 다시 시도',
        onAction: handleRetryVulnerability,
        actionLoading: vulnerabilityLoading,
      };
    }
    if (vulnerabilityDegraded) {
      return {
        tone: 'info' as const,
        message: '동네 분석 API에 연결하지 못해 저장된 분석 데이터를 표시 중입니다.',
      };
    }
    if (useDynamicDashboard && dashboardSummary?.status.stale) {
      return {
        tone: 'info' as const,
        message: '공공데이터 갱신이 24시간 이상 지연되었습니다. 마지막 정상 자료를 표시 중입니다.',
      };
    }
    return null;
  }, [
    useDynamicDashboard,
    dashboardError,
    dashboardSummary,
    fetchDashboardSummary,
    dashboardLoading,
    hospitalsError,
    hospitalsDegraded,
    hospitalsDegradedMode,
    onRetryHospitals,
    hospitalsLoading,
    vulnerabilityError,
    handleRetryVulnerability,
    vulnerabilityLoading,
    vulnerabilityDegraded,
  ]);

  return {
    hospitals,
    hospitalsLoading,
    hospitalsError,
    hospitalsUpdatedAt: useDynamicDashboard
      ? (dashboardSummary?.status.lastUpdatedAt ?? dashboardFetchedAt)
      : hospitalsUpdatedAt,
    vulnerabilityData,
    vulnerabilityError,
    vulnerabilityUpdatedAt: useDynamicDashboard
      ? (dashboardSummary?.status.lastUpdatedAt ?? dashboardFetchedAt)
      : vulnerabilityUpdatedAt,
    currentMode,
    setOptimalMode,
    selectedDistrict,
    handleDistrictSelect,
    selectedHospital: resolvedSelectedHospital,
    handleHospitalSelect,
    riskThreshold,
    setRiskThreshold,
    totalHospitalsDelta: useDynamicDashboard ? dashboardSummary?.emergencyFacilities.difference ?? null : null,
    highRiskDelta: useDynamicDashboard ? dashboardSummary?.risk.difference ?? null : null,
    highRiskDistrictCount,
    vulnerabilitySummary,
    highlightedHospitalName,
    statsLoading,
    mapBlocked,
    isDetailOpen,
    policyStatus,
    selectedVulnerability,
    activePreset,
    districtCount,
    tier1Count,
    tier2Count,
    tier3Count,
    populationBaseMonth: dashboardSummary?.population.baseMonth ?? '2026.06',
    adminAreaChangeText: dashboardSummary?.adminArea.changeText,
    emergencyChangeText: dashboardSummary?.emergencyFacilities.changeText,
    highRiskChangeText: dashboardSummary?.risk.changeText,
    dataStale: dashboardSummary?.status.stale ?? false,
    useDynamicDashboard,
  };
}
