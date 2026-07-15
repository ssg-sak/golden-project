import { useEffect, useMemo } from 'react';

import type { UserLocation } from '../../shared/hooks/useUserLocation';
import { useSortedHospitalsByDistance } from '../../shared/hooks/useSortedHospitalsByDistance';
import { compareHospitalRecommendations } from '../../shared/lib/hospital-recommendation';
import type { SevereConditionId } from '../../shared/lib/severe-condition';
import type { HospitalRecord } from '../../shared/types/hospital';
import { LocationNotice } from '../landing/LocationNotice';
import { HospitalDetailPanel } from '../map-dashboard/HospitalDetailPanel';
import { HospitalSidebarControls } from '../map-dashboard/HospitalSidebarControls';
import { HospitalSidebarList } from '../map-dashboard/HospitalSidebarList';
import { useEtaController } from '../map-dashboard/lib/useEtaController';

interface MobileCitizenHospitalBrowserProps {
  hospitals: HospitalRecord[];
  selectedHospital: HospitalRecord | null;
  onHospitalSelect: (hospital: HospitalRecord | null) => void;
  loading: boolean;
  userLocation: UserLocation | null;
  isLocating: boolean;
  locationErrorReason: Parameters<typeof LocationNotice>[0]['errorReason'];
  onRetryLocation: () => void;
  showAvailableOnly: boolean;
  onShowAvailableOnlyChange: (value: boolean) => void;
  careTarget: 'all' | 'adult' | 'pediatric' | 'senior';
  onCareTargetChange: (value: 'all' | 'adult' | 'pediatric' | 'senior') => void;
  severeCondition: SevereConditionId;
  onSevereConditionChange: (value: SevereConditionId) => void;
}

export function MobileCitizenHospitalBrowser({
  hospitals,
  selectedHospital,
  onHospitalSelect,
  loading,
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
}: MobileCitizenHospitalBrowserProps) {
  const { etas, hasFallback, fetchEtas } = useEtaController();
  const baseSortedHospitals = useSortedHospitalsByDistance(
    hospitals,
    userLocation?.lat,
    userLocation?.lng,
    { availableOnly: showAvailableOnly, careTarget, severeCondition, sortMode: 'recommendation' },
  );

  useEffect(() => {
    if (userLocation && hospitals.length > 0) {
      fetchEtas(userLocation.lat, userLocation.lng, hospitals);
    }
  }, [userLocation, hospitals, fetchEtas]);

  const sortedHospitals = useMemo(() => {
    return [...baseSortedHospitals].sort((a, b) => compareHospitalRecommendations(a, b, etas));
  }, [baseSortedHospitals, etas]);

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-white" aria-label="가까운 응급기관 찾기">
      <div className={selectedHospital ? 'hidden' : 'flex min-h-0 flex-1 flex-col'}>
        <header className="shrink-0 border-b border-teal-900 bg-teal-800 px-4 py-3 text-white">
          <p className="text-xs font-semibold text-teal-100">지도 없이 목록으로 확인 · 현재 위치 기준</p>
          <div className="mt-1 flex items-end justify-between gap-3">
            <h1 className="text-xl font-extrabold">가까운 응급기관</h1>
            <span className="text-sm font-bold text-teal-100">
              {loading ? '확인 중' : `${sortedHospitals.length}곳`}
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-teal-100">
            병상과 이동시간은 계속 바뀔 수 있습니다. 출발 전 병원이나 119에 확인하세요.
          </p>
        </header>

        {hasFallback ? (
          <div className="shrink-0 border-l-4 border-amber-400 bg-amber-50 px-4 py-2 text-xs leading-relaxed text-amber-900">
            현재 차량 이동시간을 불러오지 못해 거리 기준으로 안내합니다.
          </div>
        ) : null}

        <HospitalSidebarControls
          heading="누가 진료받나요?"
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
      </div>

      <div className={selectedHospital ? 'flex min-h-0 flex-1 flex-col' : 'hidden'}>
        <button
          type="button"
          onClick={() => onHospitalSelect(null)}
          className="fixed left-3 top-[calc(var(--mobile-nav-height,0px)+0.75rem)] z-[200] inline-flex min-h-11 max-w-[calc(100vw-1.5rem)] items-center gap-2 rounded-full border border-teal-900 bg-white/95 px-3 py-2 text-sm font-extrabold text-teal-950 shadow-lg backdrop-blur transition-colors hover:bg-teal-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
          aria-label="병원 상세를 닫고 병원 목록으로 돌아가기"
        >
          <span
            aria-hidden
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-800 text-lg font-bold text-white"
          >
            ←
          </span>
          <span className="truncate">병원 목록으로</span>
        </button>
        <div className="min-h-0 flex-1 overflow-hidden">
          {selectedHospital ? (
            <HospitalDetailPanel hospital={selectedHospital} severeCondition={severeCondition} />
          ) : null}
        </div>
      </div>
    </section>
  );
}
