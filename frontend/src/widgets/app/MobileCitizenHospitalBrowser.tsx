import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';

import type { UserLocation } from '../../shared/hooks/useUserLocation';
import { useMobileHospitalDetailHistory } from '../../shared/hooks/useMobileHospitalDetailHistory';
import { useSortedHospitalsByDistance } from '../../shared/hooks/useSortedHospitalsByDistance';
import { compareHospitalRecommendations } from '../../shared/lib/hospital-recommendation';
import type { SevereConditionId } from '../../shared/lib/severe-condition';
import type { HospitalRecord } from '../../shared/types/hospital';
import { LocationNotice } from '../landing/LocationNotice';
import { CitizenMapComponent } from '../map-dashboard/CitizenMapComponent';
import { HospitalDetailPanel } from '../map-dashboard/HospitalDetailPanel';
import { HospitalSidebarControls } from '../map-dashboard/HospitalSidebarControls';
import { HospitalSidebarList } from '../map-dashboard/HospitalSidebarList';
import { useEtaController } from '../map-dashboard/lib/useEtaController';

type MapListLayoutMode = 'balanced' | 'mapFocus' | 'listFocus';

const LAYOUT_OPTIONS: { key: MapListLayoutMode; label: string }[] = [
  { key: 'balanced', label: '균형' },
  { key: 'mapFocus', label: '지도 크게' },
  { key: 'listFocus', label: '목록 크게' },
];

const MAP_HEIGHT_MIN = 120;
const MAP_HEIGHT_MAX_RATIO = 0.65;

function getViewportHeight(): number {
  if (typeof window === 'undefined') return 800;
  return window.visualViewport?.height ?? window.innerHeight;
}

function MobileMapLegend() {
  return (
    <div
      className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-slate-200 bg-white px-3 py-1.5 text-[10px] font-semibold"
      aria-label="지도 마커 범례"
    >
      <span className="flex items-center gap-1 text-green-700">
        <span className="h-2 w-2 rounded-full bg-green-500" aria-hidden />
        진료 가능
      </span>
      <span className="flex items-center gap-1 text-red-700">
        <span className="h-2 w-2 rounded-full bg-red-500" aria-hidden />
        수용 불가
      </span>
      <span className="flex items-center gap-1 text-blue-700">
        <span className="h-2 w-2 rounded-full bg-blue-500" aria-hidden />
        내 위치
      </span>
    </div>
  );
}

function getPresetMapHeight(mode: MapListLayoutMode): number {
  const vh = getViewportHeight();
  switch (mode) {
    case 'mapFocus':
      return Math.min(Math.round(vh * 0.58), 448);
    case 'listFocus':
      return Math.min(Math.round(vh * 0.22), 192);
    default:
      return Math.min(Math.round(vh * 0.4), 320);
  }
}

/** 상세 화면 지도는 작게 — 병상·전화 정보가 우선 */
function getDetailMapHeight(): number {
  const vh = getViewportHeight();
  return Math.min(Math.max(Math.round(vh * 0.22), 140), 200);
}

function clampMapHeight(height: number): number {
  const max = Math.round(getViewportHeight() * MAP_HEIGHT_MAX_RATIO);
  return Math.min(max, Math.max(MAP_HEIGHT_MIN, Math.round(height)));
}

interface KakaoMapState {
  configured: boolean;
  loading: boolean;
  error: ErrorEvent | null;
}

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
  kakao: KakaoMapState;
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
  kakao,
}: MobileCitizenHospitalBrowserProps) {
  const [layoutMode, setLayoutMode] = useState<MapListLayoutMode>('balanced');
  const [mapHeightPx, setMapHeightPx] = useState(() => getPresetMapHeight('balanced'));
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null);

  const { closeDetail } = useMobileHospitalDetailHistory(selectedHospital, onHospitalSelect);
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

  const showMap =
    kakao.configured && !kakao.loading && kakao.error === null && !loading;
  const mapUnavailableReason = !kakao.configured
    ? '지도를 사용할 수 없어 목록으로 확인합니다.'
    : kakao.loading
      ? '지도를 불러오는 중…'
      : kakao.error
        ? '지도를 불러오지 못해 목록으로 확인합니다.'
        : null;
  const detailWithMap = Boolean(selectedHospital && showMap);

  const applyLayoutMode = useCallback((mode: MapListLayoutMode) => {
    setLayoutMode(mode);
    setMapHeightPx(getPresetMapHeight(mode));
  }, []);

  const handleMapHospitalSelect = useCallback(
    (hospital: HospitalRecord) => {
      onHospitalSelect(hospital);
    },
    [onHospitalSelect],
  );

  const handleListHospitalSelect = useCallback(
    (hospital: HospitalRecord | null) => {
      onHospitalSelect(hospital);
    },
    [onHospitalSelect],
  );

  const handleDragPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      dragRef.current = { startY: event.clientY, startHeight: mapHeightPx };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [mapHeightPx],
  );

  const handleDragPointerMove = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const deltaY = event.clientY - dragRef.current.startY;
    setMapHeightPx(clampMapHeight(dragRef.current.startHeight + deltaY));
  }, []);

  const handleDragPointerUp = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
  }, []);

  const mapBlock = (heightPx: number, ariaLabel: string, withLegend = false) => (
    <>
      <div
        className="relative isolate w-full shrink-0 overflow-hidden border-b border-slate-300 bg-slate-100"
        style={{ height: heightPx, minHeight: MAP_HEIGHT_MIN }}
        aria-label={ariaLabel}
      >
        <CitizenMapComponent
          variant="mobileEmbed"
          hospitals={hospitals}
          selectedHospital={selectedHospital}
          onHospitalSelect={handleMapHospitalSelect}
          userLocation={userLocation}
          showAvailableOnly={showAvailableOnly}
          careTarget={careTarget}
          severeCondition={severeCondition}
        />
      </div>
      {withLegend ? <MobileMapLegend /> : null}
    </>
  );

  const detailShellClass =
    'fixed inset-x-0 bottom-0 z-[150] flex flex-col overflow-hidden bg-white';

  if (detailWithMap && selectedHospital) {
    return (
      <section
        className={detailShellClass}
        style={{ top: 'var(--mobile-nav-height, 0px)' }}
        aria-label="병원 상세"
      >
        <div className="shrink-0 border-b border-slate-200 bg-white px-3 py-2">
          <button
            type="button"
            onClick={closeDetail}
            className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border border-teal-900 bg-white px-3 py-2 text-sm font-extrabold text-teal-950 shadow-sm transition-colors hover:bg-teal-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
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
        </div>
        {mapBlock(getDetailMapHeight(), '선택한 병원 카카오맵', true)}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden" style={{ flex: '1 1 0%' }}>
          <HospitalDetailPanel
            hospital={selectedHospital}
            severeCondition={severeCondition}
            layout="panel"
            compact
          />
        </div>
      </section>
    );
  }

  if (selectedHospital && !showMap) {
    return (
      <section
        className={detailShellClass}
        style={{ top: 'var(--mobile-nav-height, 0px)' }}
        aria-label="병원 상세"
      >
        <div className="shrink-0 border-b border-slate-200 bg-white px-3 py-2">
          <button
            type="button"
            onClick={closeDetail}
            className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border border-teal-900 bg-white px-3 py-2 text-sm font-extrabold text-teal-950 shadow-sm transition-colors hover:bg-teal-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
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
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden" style={{ flex: '1 1 0%' }}>
          <HospitalDetailPanel
            hospital={selectedHospital}
            severeCondition={severeCondition}
            layout="panel"
            compact
          />
        </div>
      </section>
    );
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white" aria-label="가까운 응급기관 찾기">
      <header className="shrink-0 border-b border-teal-900 bg-teal-800 px-4 py-3 text-white">
        <p className="text-xs font-semibold text-teal-100">
          {showMap
            ? '카카오맵과 목록으로 비교 · 현재 위치 기준'
            : '목록으로 확인 · 현재 위치 기준'}
        </p>
        <div className="mt-1 flex items-end justify-between gap-3">
          <h1 className="text-xl font-extrabold">가까운 응급기관</h1>
          <span className="text-sm font-bold text-teal-100">
            {loading ? '확인 중' : `${sortedHospitals.length}곳`}
          </span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-teal-100">
          {showMap
            ? '지도·목록에서 고르면 상세와 함께 지도에서 위치를 확인합니다.'
            : '병상과 이동시간은 계속 바뀔 수 있습니다. 출발 전 병원이나 119에 확인하세요.'}
        </p>
      </header>

      {hasFallback ? (
        <div className="shrink-0 border-l-4 border-amber-400 bg-amber-50 px-4 py-2 text-xs leading-relaxed text-amber-900">
          실시간 교통 정보를 불러오지 못해 저장된 이동시간을 사용합니다.
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

      {showMap ? (
        <>
          <div
            className="flex shrink-0 items-center gap-1 border-b border-slate-200 bg-slate-50 px-3 py-1.5"
            role="group"
            aria-label="지도와 목록 보기 비율"
          >
            <span className="mr-1 text-[11px] font-semibold text-slate-500">보기</span>
            {LAYOUT_OPTIONS.map((option) => {
              const active = layoutMode === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => applyLayoutMode(option.key)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors ${
                    active
                      ? 'bg-teal-800 text-white'
                      : 'bg-white text-slate-600 ring-1 ring-slate-300 hover:bg-slate-100'
                  }`}
                  aria-pressed={active}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          {mapBlock(mapHeightPx, '주변 응급기관 카카오맵', true)}
          <button
            type="button"
            className="flex h-5 w-full shrink-0 cursor-row-resize touch-none items-center justify-center border-b border-slate-200 bg-slate-100"
            aria-label="지도와 목록 높이 조절"
            onPointerDown={handleDragPointerDown}
            onPointerMove={handleDragPointerMove}
            onPointerUp={handleDragPointerUp}
            onPointerCancel={handleDragPointerUp}
          >
            <span className="h-1 w-10 rounded-full bg-slate-400" aria-hidden />
          </button>
        </>
      ) : mapUnavailableReason ? (
        <div className="shrink-0 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600">
          {mapUnavailableReason}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden" style={{ flex: '1 1 0%' }}>
        <HospitalSidebarList
          sortedHospitals={sortedHospitals}
          selectedHospital={selectedHospital}
          onHospitalSelect={handleListHospitalSelect}
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
    </section>
  );
}
