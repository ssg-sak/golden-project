import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  const hospitals = useHospitalStore((state) => state.hospitals);
  const hospitalsLoading = useHospitalStore((state) => state.isLoading);
  const hospitalsError = useHospitalStore((state) => state.error);
  const hospitalsDegraded = useHospitalStore((state) => state.isDegraded);
  const hospitalsDegradedMode = useHospitalStore((state) => state.degradedMode);
  const hospitalsUpdatedAt = useHospitalStore((state) => state.lastUpdatedAt);

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
  const [riskThreshold, setRiskThreshold] = useState(0);
  const [totalHospitalsDelta, setTotalHospitalsDelta] = useState<number | null>(null);
  const [highRiskDelta, setHighRiskDelta] = useState<number | null>(null);
  const previousSnapshotRef = useRef<{ totalHospitals: number; highRisk: number } | null>(null);

  const selectedVulnerability = useMemo(() => {
    if (!selectedDistrict) return null;
    const key = toAdmNmKey(selectedDistrict);
    return vulnerabilityData.find((row) => row.adm_nm === key) ?? null;
  }, [vulnerabilityData, selectedDistrict]);

  const vulnerabilityRange = useMemo(() => {
    if (vulnerabilityData.length === 0) return { min: 0, max: 0 };
    const values = vulnerabilityData.map((row) => row.vulnerability_index);
    return { min: Math.min(...values), max: Math.max(...values) };
  }, [vulnerabilityData]);

  useEffect(() => {
    if (vulnerabilityData.length === 0) return;
    const sorted = [...vulnerabilityData].sort((a, b) => b.vulnerability_index - a.vulnerability_index);
    const defaultCutoff = sorted[Math.floor(sorted.length * 0.25)]?.vulnerability_index ?? 0;
    setRiskThreshold((current) => (current === 0 ? defaultCutoff : current));
  }, [vulnerabilityData]);

  useEffect(() => {
    if (riskThreshold < vulnerabilityRange.min) {
      setRiskThreshold(vulnerabilityRange.min);
    } else if (riskThreshold > vulnerabilityRange.max) {
      setRiskThreshold(vulnerabilityRange.max);
    }
  }, [riskThreshold, vulnerabilityRange.max, vulnerabilityRange.min]);

  const highRiskDistrictCount = useMemo(
    () => vulnerabilityData.filter((row) => row.vulnerability_index >= riskThreshold).length,
    [vulnerabilityData, riskThreshold],
  );

  const vulnerabilitySummary = useMemo(() => {
    if (vulnerabilityData.length === 0) return null;
    const total = vulnerabilityData.length;
    return {
      avgVulnerabilityIndex:
        vulnerabilityData.reduce((acc, row) => acc + row.vulnerability_index, 0) / total,
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
  }, [fetchVulnerability]);

  useEffect(() => {
    if (hospitalsLoading || vulnerabilityLoading) return;
    const totalHospitals = hospitals.length;
    const currentHighRisk = highRiskDistrictCount;
    const previous = previousSnapshotRef.current;
    if (previous) {
      setTotalHospitalsDelta(totalHospitals - previous.totalHospitals);
      setHighRiskDelta(currentHighRisk - previous.highRisk);
    }
    previousSnapshotRef.current = { totalHospitals, highRisk: currentHighRisk };
  }, [hospitals.length, highRiskDistrictCount, hospitalsLoading, vulnerabilityLoading]);

  const activePreset = usePresetStore((state) => state.activePreset);

  const statsLoading = hospitalsLoading || vulnerabilityLoading;
  const mapBlocked = hospitalsLoading || hospitalsError !== null;
  const isDetailOpen = selectedHospital !== null || selectedVulnerability !== null || activePreset !== null;

  const policyStatus = useMemo(() => {
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
    return null;
  }, [
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
    hospitalsUpdatedAt,
    vulnerabilityData,
    vulnerabilityError,
    vulnerabilityUpdatedAt,
    currentMode,
    setOptimalMode,
    selectedDistrict,
    handleDistrictSelect,
    selectedHospital,
    handleHospitalSelect,
    riskThreshold,
    setRiskThreshold,
    totalHospitalsDelta,
    highRiskDelta,
    highRiskDistrictCount,
    vulnerabilitySummary,
    highlightedHospitalName,
    statsLoading,
    mapBlocked,
    isDetailOpen,
    policyStatus,
    selectedVulnerability,
    activePreset,
  };
}
