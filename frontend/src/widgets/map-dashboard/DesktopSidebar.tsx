import { useEffect, useMemo } from 'react';
import { DESKTOP_SIDEBAR_PANEL_CLASS } from '../../shared/constants/dashboard-layout';
import { useEtaController } from './lib/useEtaController';
import { useSortedHospitalsByDistance } from '../../shared/hooks/useSortedHospitalsByDistance';
import type { UserLocation } from '../../shared/hooks/useUserLocation';
import type { HospitalRecord } from '../../shared/types/hospital';
import { LocationNotice } from '../landing/LocationNotice';
import { CitizenLocationIcon, PanelSidebarHeader } from '../shared/PanelSidebarHeader';

import { HospitalSidebarControls } from './HospitalSidebarControls';
import { HospitalSidebarList } from './HospitalSidebarList';

interface DesktopSidebarProps {
  hospitals: HospitalRecord[];
  selectedHospital: HospitalRecord | null;
  onHospitalSelect: (hospital: HospitalRecord) => void;
  loading?: boolean;
  userLocation: UserLocation | null;
  isLocating: boolean;
  locationErrorReason: Parameters<typeof LocationNotice>[0]['errorReason'];
  onRetryLocation?: () => void;
  showAvailableOnly: boolean;
  onShowAvailableOnlyChange: (value: boolean) => void;
  careTarget: 'all' | 'adult' | 'pediatric' | 'senior';
  onCareTargetChange: (value: 'all' | 'adult' | 'pediatric' | 'senior') => void;
}

export function DesktopSidebar({
  hospitals,
  selectedHospital,
  onHospitalSelect,
  loading = false,
  userLocation,
  isLocating,
  locationErrorReason,
  onRetryLocation,
  showAvailableOnly,
  onShowAvailableOnlyChange,
  careTarget,
  onCareTargetChange,
}: DesktopSidebarProps) {
  const { etas, hasFallback, fetchEtas } = useEtaController();

  const baseSortedHospitals = useSortedHospitalsByDistance(
    hospitals,
    userLocation?.lat,
    userLocation?.lng,
    { availableOnly: showAvailableOnly, careTarget },
  );

  useEffect(() => {
    if (userLocation && hospitals.length > 0) {
      fetchEtas(userLocation.lat, userLocation.lng, hospitals);
    }
  }, [userLocation, hospitals, fetchEtas]);

  const sortedHospitals = useMemo(() => {
    return [...baseSortedHospitals].sort((a, b) => {
      const etaA = etas[a.name]?.eta_seconds;
      const etaB = etas[b.name]?.eta_seconds;

      if (etaA != null && etaB != null) return etaA - etaB;
      if (etaA != null && etaB == null) return -1;
      if (etaB != null && etaA == null) return 1;
      return 0;
    });
  }, [baseSortedHospitals, etas]);

  return (
    <aside className={DESKTOP_SIDEBAR_PANEL_CLASS}>
      <PanelSidebarHeader
        variant="citizen"
        icon={<CitizenLocationIcon />}
        title="가장 가까운 응급실"
        subtitle="내 위치 기준 · 거리는 참고용"
      />

      {hasFallback && (
        <div className="border-l-4 border-amber-400 bg-amber-50 p-2 text-xs text-amber-800">
          <p className="font-bold">⚠️ [안내] 실시간 교통 정보 연동 실패</p>
          <p className="mt-0.5">실시간 길찾기를 불러올 수 없어 직선거리 우선으로 대체 표시됩니다.</p>
        </div>
      )}

      <HospitalSidebarControls
        isLocating={isLocating}
        locationSource={userLocation?.source ?? null}
        locationErrorReason={locationErrorReason}
        onRetryLocation={onRetryLocation}
        showAvailableOnly={showAvailableOnly}
        onShowAvailableOnlyChange={onShowAvailableOnlyChange}
        careTarget={careTarget}
        onCareTargetChange={onCareTargetChange}
      />

      <HospitalSidebarList
        sortedHospitals={sortedHospitals}
        selectedHospital={selectedHospital}
        onHospitalSelect={onHospitalSelect}
        loading={loading}
        userLocation={userLocation}
        isLocating={isLocating}
        onRetryLocation={onRetryLocation}
        showAvailableOnly={showAvailableOnly}
        onShowAvailableOnlyChange={onShowAvailableOnlyChange}
        onCareTargetChange={onCareTargetChange}
      />
    </aside>
  );
}
