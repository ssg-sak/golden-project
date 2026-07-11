import { useEffect, useMemo, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import { useEtaController } from './lib/useEtaController';
import { useSortedHospitalsByDistance } from '../../shared/hooks/useSortedHospitalsByDistance';
import type { UserLocation } from '../../shared/hooks/useUserLocation';
import type { HospitalRecord } from '../../shared/types/hospital';
import { LocationNotice } from '../landing/LocationNotice';
import { CitizenLocationIcon, PanelSidebarHeader } from '../shared/PanelSidebarHeader';

import { HospitalSidebarControls } from './HospitalSidebarControls';
import { HospitalSidebarList } from './HospitalSidebarList';
import { HospitalDetailPanel } from './HospitalDetailPanel';

interface MobileBottomSheetProps {
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
}

export function MobileBottomSheet({
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
}: MobileBottomSheetProps) {
  const { etas, hasFallback, fetchEtas } = useEtaController();
  const controls = useAnimation();
  const [sheetState, setSheetState] = useState<'expanded' | 'half' | 'collapsed'>('half');

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

  // 병원 선택 시 자동으로 시트를 half나 expanded로 올림
  useEffect(() => {
    if (selectedHospital && sheetState === 'collapsed') {
      setSheetState('half');
    }
  }, [selectedHospital, sheetState]);

  useEffect(() => {
    controls.start(sheetState);
  }, [sheetState, controls]);

  const handleDragEnd = (_event: any, info: PanInfo) => {
    const threshold = 50;
    const velocity = info.velocity.y;
    const offset = info.offset.y;

    if (velocity > 400 || offset > threshold) {
      // Swipe Down
      if (sheetState === 'expanded') setSheetState('half');
      else setSheetState('collapsed');
    } else if (velocity < -400 || offset < -threshold) {
      // Swipe Up
      if (sheetState === 'collapsed') setSheetState('half');
      else setSheetState('expanded');
    } else {
      controls.start(sheetState);
    }
  };

  const variants = {
    expanded: { y: 0 },
    half: { y: '40dvh' },
    collapsed: { y: 'calc(90dvh - 150px)' }, // 헤더(약 150px)만 보이도록 조절
  };

  return (
    <motion.aside
      initial="half"
      animate={controls}
      variants={variants}
      transition={{ type: 'spring', damping: 30, stiffness: 400 }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      className="fixed bottom-0 left-0 right-0 z-[100] flex h-[90dvh] flex-col overflow-hidden rounded-t-3xl bg-white/95 backdrop-blur-md shadow-[0_-8px_30px_rgba(0,0,0,0.12)]"
    >
      {/* 드래그 핸들 */}
      <div 
        className="flex w-full cursor-grab active:cursor-grabbing items-center justify-center pb-2 pt-3 shrink-0"
        aria-label="시트 높이 조절"
      >
        <div className="h-1.5 w-12 rounded-full bg-slate-300" />
      </div>

      {selectedHospital ? (
        // 선택된 병원이 있으면 상세 패널 렌더링
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="px-4 pb-2 pt-1 shrink-0">
            <button
              onClick={() => onHospitalSelect(null)}
              className="flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-900"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              목록으로 돌아가기
            </button>
          </div>
          <div className="flex-1 overflow-y-auto pb-20">
            <HospitalDetailPanel hospital={selectedHospital} />
          </div>
        </div>
      ) : (
        // 병원이 선택되지 않았으면 리스트 렌더링
        <div className="flex flex-1 flex-col overflow-hidden pointer-events-auto">
          <PanelSidebarHeader
            variant="citizen"
            icon={<CitizenLocationIcon />}
            title="가장 가까운 응급실"
            subtitle="내 위치 기준 · 거리는 참고용"
          />

          {hasFallback && (
            <div className="shrink-0 border-l-4 border-amber-400 bg-amber-50 p-2 text-xs text-amber-800">
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
        </div>
      )}
    </motion.aside>
  );
}
