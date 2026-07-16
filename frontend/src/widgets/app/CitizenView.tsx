import { useCallback, useState } from 'react';

import {
  DASHBOARD_DETAIL_COL_CLASS,
  DASHBOARD_DETAIL_INNER_CLASS,
  DASHBOARD_MAIN_CLASS,
  DASHBOARD_MAP_COL_CLASS,
  DESKTOP_SIDEBAR_WRAPPER_CLASS,
  DASHBOARD_VIEW_ROOT_CLASS,
} from '../../shared/constants/dashboard-layout';
import { HOSPITALS_LOADING_MESSAGE } from '../../shared/constants/loading-messages';
import { useUserLocation } from '../../shared/hooks/useUserLocation';
import { useHospitalStore } from '../../shared/store/hospitalStore';
import type { SevereConditionId } from '../../shared/lib/severe-condition';
import type { HospitalRecord } from '../../shared/types/hospital';
import { EmergencyBanner } from '../shared/EmergencyBanner';
import { DegradedDataBanner } from '../shared/DegradedDataBanner';
import { CitizenMapComponent } from '../map-dashboard/CitizenMapComponent';
import { HospitalDetailPanel } from '../map-dashboard/HospitalDetailPanel';
import { DesktopSidebar } from '../map-dashboard/DesktopSidebar';
import { MobileCitizenHospitalBrowser } from './MobileCitizenHospitalBrowser';

interface KakaoState {
  configured: boolean;
  loading: boolean;
  error: ErrorEvent | null;
}

interface CitizenViewProps {
  kakao: KakaoState;
  onRetryHospitals: () => void;
}

function HospitalsLoadingState() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-4 border border-slate-300 bg-white px-6 text-center">
      <span className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
      <p className="max-w-sm text-base font-semibold leading-relaxed text-slate-800">
        {HOSPITALS_LOADING_MESSAGE}
      </p>
    </div>
  );
}

function HospitalsErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-rose-100 bg-rose-50 px-6 py-8 text-center">
      <p className="text-base font-semibold text-rose-900">지금은 병원 정보를 불러올 수 없습니다</p>
      <p className="text-sm text-rose-700">
        응급·위급 상황이면 <span className="font-bold">119</span> · <span className="font-bold">1339</span>
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="border border-rose-700 bg-rose-700 px-5 py-2 text-sm font-semibold text-white hover:bg-rose-800"
      >
        다시 시도
      </button>
    </div>
  );
}

export function CitizenView({ kakao, onRetryHospitals }: CitizenViewProps) {
  const hospitals = useHospitalStore((state) => state.hospitals);
  const hospitalsLoading = useHospitalStore((state) => state.isLoading);
  const hospitalsError = useHospitalStore((state) => state.error);
  const hospitalsDegraded = useHospitalStore((state) => state.isDegraded);
  const hospitalsDegradedMode = useHospitalStore((state) => state.degradedMode);

  const { location, isLocating, errorReason, retry } = useUserLocation();
  const [selectedHospital, setSelectedHospital] = useState<HospitalRecord | null>(null);
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [careTarget, setCareTarget] = useState<'all' | 'adult' | 'pediatric' | 'senior'>('all');
  const [severeCondition, setSevereCondition] = useState<SevereConditionId>('all');


  const handleHospitalSelect = useCallback((hospital: HospitalRecord | null) => {
    setSelectedHospital(hospital);
  }, []);

  const handleCareTargetChange = useCallback(
    (value: 'all' | 'adult' | 'pediatric' | 'senior') => {
      setCareTarget(value);
      if (value === 'pediatric') {
        setShowAvailableOnly(false);
      }
      if (selectedHospital && value === 'adult' && selectedHospital.tier === 3) {
        setSelectedHospital(null);
      }
      if (selectedHospital && value === 'pediatric' && selectedHospital.tier !== 3) {
        setSelectedHospital(null);
      }
      if (selectedHospital && value === 'senior' && ![1, 2].includes(selectedHospital.tier)) {
        setSelectedHospital(null);
      }
      if (value !== 'pediatric' && severeCondition === 'pediatric_night_holiday') {
        setSevereCondition('all');
      }
    },
    [selectedHospital, severeCondition],
  );

  const handleSevereConditionChange = useCallback((value: SevereConditionId) => {
    setSevereCondition(value);
    setSelectedHospital(null);
  }, []);

  const mapBlocked = hospitalsLoading || hospitalsError !== null;

  return (
    <div className={`${DASHBOARD_VIEW_ROOT_CLASS} relative bg-[#eef2f3]`}>
      <div className="hidden lg:static lg:block lg:p-0">
        <EmergencyBanner />
        
        {hospitalsDegraded ? (
          <DegradedDataBanner
            compact
            isRetrying={hospitalsLoading}
            message={
              hospitalsDegradedMode === 'stale-cache'
                ? '네트워크 문제로 이전에 불러온 병원 정보를 표시 중입니다. 병상 수는 최신이 아닐 수 있습니다.'
                : '실시간 병상 정보를 확인하지 못해 기본 병원 목록을 표시 중입니다. 거리·전화·길찾기를 우선 참고해 주세요.'
            }
            onRetry={onRetryHospitals}
          />
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:hidden">
        <EmergencyBanner />
        {hospitalsDegraded ? (
          <DegradedDataBanner
            compact
            isRetrying={hospitalsLoading}
            message={
              hospitalsDegradedMode === 'stale-cache'
                ? '네트워크 문제로 이전 병원 정보를 표시 중입니다. 병상 수는 최신이 아닐 수 있습니다.'
                : '실시간 병상을 확인하지 못해 기본 병원 목록을 표시 중입니다.'
            }
            onRetry={onRetryHospitals}
          />
        ) : null}
        <MobileCitizenHospitalBrowser
          hospitals={hospitals}
          selectedHospital={selectedHospital}
          onHospitalSelect={handleHospitalSelect}
          loading={hospitalsLoading}
          userLocation={location}
          isLocating={isLocating}
          locationErrorReason={errorReason}
          onRetryLocation={retry}
          showAvailableOnly={showAvailableOnly}
          onShowAvailableOnlyChange={setShowAvailableOnly}
          careTarget={careTarget}
          onCareTargetChange={handleCareTargetChange}
          severeCondition={severeCondition}
          onSevereConditionChange={handleSevereConditionChange}
          kakao={kakao}
        />
      </div>

      <main className={`${DASHBOARD_MAIN_CLASS} max-lg:hidden`}>
        {/* 데스크톱 사이드바 (lg 이상에서만 렌더링) */}
        <div className={`hidden lg:flex ${DESKTOP_SIDEBAR_WRAPPER_CLASS}`}>
          <DesktopSidebar
            hospitals={hospitals}
            selectedHospital={selectedHospital}
            onHospitalSelect={handleHospitalSelect}
            loading={hospitalsLoading}
            userLocation={location}
            isLocating={isLocating}
            locationErrorReason={errorReason}
            onRetryLocation={retry}
            showAvailableOnly={showAvailableOnly}
            onShowAvailableOnlyChange={setShowAvailableOnly}
            careTarget={careTarget}
            onCareTargetChange={handleCareTargetChange}
            severeCondition={severeCondition}
            onSevereConditionChange={handleSevereConditionChange}
          />
        </div>

        <div className={DASHBOARD_MAP_COL_CLASS}>
          {!kakao.configured ? (
            <div className="flex h-full flex-1 items-center justify-center rounded-xl bg-amber-50 px-6 text-center text-sm text-amber-900">
              지도를 사용할 수 없습니다.
            </div>
          ) : null}

          {kakao.configured && kakao.loading ? (
            <div className="flex h-full flex-1 items-center justify-center text-sm text-indigo-600">
              <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
              카카오맵 불러오는 중…
            </div>
          ) : null}

          {kakao.configured && kakao.error ? (
            <div className="flex h-full flex-1 items-center justify-center bg-red-50 px-6 text-center text-sm text-red-700">
              지도를 불러오지 못했습니다.
            </div>
          ) : null}

          {kakao.configured && !kakao.loading && !kakao.error && hospitalsLoading ? (
            <HospitalsLoadingState />
          ) : null}

          {kakao.configured && !kakao.loading && !kakao.error && hospitalsError ? (
            <HospitalsErrorState onRetry={onRetryHospitals} />
          ) : null}

          {kakao.configured && !kakao.loading && !kakao.error && !mapBlocked ? (
            <CitizenMapComponent
              hospitals={hospitals}
              selectedHospital={selectedHospital}
              onHospitalSelect={handleHospitalSelect}
              userLocation={location}
              showAvailableOnly={showAvailableOnly}
              careTarget={careTarget}
              severeCondition={severeCondition}
            />
          ) : null}
        </div>

        {/* 데스크톱 DetailPanel (lg 이상에서만 렌더링) */}
        <div
          className={`${DASHBOARD_DETAIL_COL_CLASS} hidden lg:block ${
            selectedHospital ? 'lg:flex' : ''
          }`}
        >
          <div className={DASHBOARD_DETAIL_INNER_CLASS}>
            <HospitalDetailPanel hospital={selectedHospital} severeCondition={severeCondition} />
          </div>
        </div>
      </main>
    </div>
  );
}
