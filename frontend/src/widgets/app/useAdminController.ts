import { useCallback, useEffect, useMemo, useState } from 'react';
import { ENV } from '../../shared/config/env';
import { useDashboardSummaryStore } from '../../shared/store/dashboardSummaryStore';
import { useHospitalStore } from '../../shared/store/hospitalStore';
import { useVulnerabilityStore } from '../../shared/store/vulnerabilityStore';
import { useOptimalLocationsStore } from '../map-dashboard/lib/useOptimalLocationsStore';
import { usePolicyReleaseStore } from '../../shared/store/policyReleaseStore';
import { parseVulnerabilityRecords } from '../../data/api/vulnerability';
import { usePresetStore } from '../map-dashboard/lib/usePresetStore';
import type { HospitalRecord } from '../../shared/types/hospital';
import { toAdmNmKey } from '../../shared/types/vulnerability';

export function useAdminController() {
  const useDynamicDashboard = ENV.USE_DYNAMIC_DASHBOARD_DATA;

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

  const sourceVulnerabilityData = useVulnerabilityStore((state) => state.records);
  const vulnerabilityUpdatedAt = useVulnerabilityStore((state) => state.lastUpdatedAt);
  const policyRelease = usePolicyReleaseStore((state) => state.release);
  const policyReleaseLoading = usePolicyReleaseStore((state) => state.isLoading);
  const policyReleaseError = usePolicyReleaseStore((state) => state.error);
  const fetchPolicyRelease = usePolicyReleaseStore((state) => state.fetchRelease);

  useEffect(() => {
    void fetchPolicyRelease().catch(() => undefined);
  }, [fetchPolicyRelease]);

  const hospitals = useMemo(() => policyRelease?.hospitals ?? [], [policyRelease]);
  const vulnerabilityData = useMemo(
    () =>
      policyRelease
        ? parseVulnerabilityRecords(policyRelease.vulnerability.features)
        : sourceVulnerabilityData,
    [policyRelease, sourceVulnerabilityData],
  );
  const vulnerabilityFeatures = policyRelease?.vulnerability.features ?? [];

  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [selectedHospital, setSelectedHospital] = useState<HospitalRecord | null>(null);
  const [riskThreshold, setRiskThreshold] = useState(10000);

  useEffect(() => {
    if (policyRelease) setRiskThreshold(policyRelease.metadata.risk_threshold);
  }, [policyRelease]);

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

  const dashboardRiskThreshold = dashboardSummary?.risk.threshold;

  useEffect(() => {
    if (!useDynamicDashboard || dashboardRiskThreshold === undefined) return;
    setRiskThreshold(dashboardRiskThreshold);
  }, [useDynamicDashboard, dashboardRiskThreshold]);

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

  const activePreset = usePresetStore((state) => state.activePreset);

  const districtCount = policyRelease?.metadata.district_count ?? 0;
  const tier1Count = hospitals.filter((hospital) => hospital.tier === 1).length;
  const tier2Count = hospitals.filter((hospital) => hospital.tier === 2).length;
  const tier3Count = hospitals.filter((hospital) => hospital.tier === 3).length;
  const isDetailOpen = selectedHospital !== null || selectedVulnerability !== null || activePreset !== null;

  const policyStatus = useMemo(() => {
    if (policyReleaseError || (!policyRelease && !policyReleaseLoading)) {
      return {
        tone: 'danger' as const,
        message: policyReleaseError ?? '검증된 정책 분석 릴리스를 불러오지 못했습니다.',
        actionLabel: '정책 릴리스 다시 조회',
        onAction: (): void => { void fetchPolicyRelease(); },
        actionLoading: policyReleaseLoading,
      };
    }
    if (useDynamicDashboard && dashboardError && !dashboardSummary) {
      return {
        tone: 'warning' as const,
        message: `${dashboardError} 저장된 분석 자료를 먼저 표시합니다.`,
        actionLabel: '정책 요약 다시 조회',
        onAction: (): void => { void fetchDashboardSummary(); },
        actionLoading: dashboardLoading,
      };
    }
    if (useDynamicDashboard && dashboardSummary?.status.stale) {
      return {
        tone: 'info' as const,
        message: '공공데이터 갱신이 지연되어 마지막 정상 자료를 표시 중입니다.',
      };
    }
    return null;
  }, [
    useDynamicDashboard,
    policyRelease,
    policyReleaseError,
    policyReleaseLoading,
    fetchPolicyRelease,
    dashboardError,
    dashboardSummary,
    fetchDashboardSummary,
    dashboardLoading,
  ]);

  return {
    hospitals,
    hospitalsLoading: policyReleaseLoading,
    hospitalsError: policyReleaseError,
    hospitalsUpdatedAt: useDynamicDashboard
      ? (dashboardSummary?.status.lastUpdatedAt ?? dashboardFetchedAt)
      : hospitalsUpdatedAt,
    vulnerabilityData,
    vulnerabilityFeatures,
    vulnerabilityError: policyReleaseError,
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
    highRiskDistrictCount,
    vulnerabilitySummary,
    highlightedHospitalName,
    statsLoading: policyReleaseLoading,
    mapBlocked: policyReleaseLoading || policyReleaseError !== null,
    isDetailOpen,
    policyStatus,
    selectedVulnerability,
    activePreset,
    districtCount,
    tier1Count,
    tier2Count,
    tier3Count,
    populationBaseMonth: policyRelease?.metadata.population_base_month ?? '확인 중',
    dataStale: false,
    useDynamicDashboard,
  };
}
