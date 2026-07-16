import { useEffect, useMemo } from 'react';
import { CITIZEN_SIDEBAR_PANEL_CLASS } from '../../shared/constants/dashboard-layout';
import { useEtaController } from './lib/useEtaController';
import { useSortedHospitalsByDistance } from '../../shared/hooks/useSortedHospitalsByDistance';
import { compareHospitalRecommendations } from '../../shared/lib/hospital-recommendation';
import type { SevereConditionId } from '../../shared/lib/severe-condition';
import type { UserLocation } from '../../shared/hooks/useUserLocation';
import type { HospitalRecord } from '../../shared/types/hospital';
import { LocationNotice } from '../landing/LocationNotice';
import { CitizenLocationIcon, PanelSidebarHeader } from '../shared/PanelSidebarHeader';

import { HospitalSidebarControls } from './HospitalSidebarControls';
import { HospitalSidebarList } from './HospitalSidebarList';

interface DesktopSidebarProps {
  hospitals: HospitalRecord[];
  selectedHospital: HospitalRecord | null;
  onHospitalSelect: (hospital: HospitalRecord | null) => void;
  loading?: boolean;
  userLocation: UserLocation | null;
  isLocating: boolean;
  locationErrorReason: Parameters<typeof LocationNotice>[0]['errorReason'];
  onRetryLocation?: () => void;
  showAvailableOnly: boolean;
  onShowAvailableOnlyChange: (value: boolean) => void;
  careTarget: 'all' | 'adult' | 'pediatric' | 'senior';
  onCareTargetChange: (value: 'all' | 'adult' | 'pediatric' | 'senior') => void;
  severeCondition: SevereConditionId;
  onSevereConditionChange: (value: SevereConditionId) => void;
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
  severeCondition,
  onSevereConditionChange,
}: DesktopSidebarProps) {
  const { etas, hasFallback, fetchEtas } = useEtaController();

  const baseSortedHospitals = useSortedHospitalsByDistance(
    hospitals,
    userLocation?.lat,
    userLocation?.lng,
    { availableOnly: showAvailableOnly, careTarget, severeCondition, sortMode: 'recommendation' },
  );

  useEffect(() => {
    if (userLocation && baseSortedHospitals.length > 0) {
      fetchEtas(userLocation.lat, userLocation.lng, baseSortedHospitals);
    }
  }, [userLocation, baseSortedHospitals, fetchEtas]);

  const sortedHospitals = useMemo(() => {
    return [...baseSortedHospitals].sort((a, b) => compareHospitalRecommendations(a, b, etas));
  }, [baseSortedHospitals, etas]);

  return (
    <aside className={CITIZEN_SIDEBAR_PANEL_CLASS}>
      <PanelSidebarHeader
        variant="citizen"
        icon={<CitizenLocationIcon />}
        title="가장 가까운 응급실"
        subtitle="내 위치 기준 · 거리는 참고용"
      />

      {hasFallback && (
        <div className="border-l-4 border-amber-400 bg-amber-50 p-2 text-xs text-amber-800">
          <p className="font-bold">⚠️ [안내] 실시간 교통 정보 연동 실패</p>
          <p className="mt-0.5">실시간 교통 정보를 불러오지 못해 저장된 이동시간을 사용합니다.</p>
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
        severeCondition={severeCondition}
        onSevereConditionChange={onSevereConditionChange}
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
        severeCondition={severeCondition}
      />
    </aside>
  );
}
