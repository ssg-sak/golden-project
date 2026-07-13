import { useEffect, useMemo } from 'react';

import type { UserLocation } from '../../shared/hooks/useUserLocation';
import { useSortedHospitalsByDistance } from '../../shared/hooks/useSortedHospitalsByDistance';
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
}: MobileCitizenHospitalBrowserProps) {
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
      if (etaA != null) return -1;
      if (etaB != null) return 1;
      return 0;
    });
  }, [baseSortedHospitals, etas]);

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-white" aria-label="가까운 응급실 찾기">
      <div className={selectedHospital ? 'hidden' : 'flex min-h-0 flex-1 flex-col'}>
        <header className="shrink-0 border-b border-teal-900 bg-teal-800 px-4 py-3 text-white">
          <p className="text-xs font-semibold text-teal-100">지도 없이 목록으로 확인 · 내 위치와 이동시간 기준</p>
          <div className="mt-1 flex items-end justify-between gap-3">
            <h1 className="text-xl font-extrabold">가까운 응급실</h1>
            <span className="text-sm font-bold text-teal-100">
              {loading ? '확인 중' : `${sortedHospitals.length}곳`}
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-teal-100">
            병상은 이동 중 바뀔 수 있으니 출발 전 병원이나 119에 확인하세요.
          </p>
        </header>

        {hasFallback ? (
          <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">
            실시간 교통 정보를 불러오지 못해 직선거리 순으로 안내합니다.
          </div>
        ) : null}

        <HospitalSidebarControls
          heading="진료 대상과 병상 조건"
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
          {selectedHospital ? <HospitalDetailPanel hospital={selectedHospital} /> : null}
        </div>
      </div>
    </section>
  );
}
