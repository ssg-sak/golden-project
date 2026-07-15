import { Fragment, useState } from 'react';
import { CustomOverlayMap } from 'react-kakao-maps-sdk';
import { useOptimalLocationsStore, type OptimalLocation } from './lib/useOptimalLocationsStore';

function formatKm(value: number | undefined): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return `${value.toFixed(1)}km`;
}

function formatNumber(value: number | undefined): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value.toLocaleString('ko-KR');
}

export function OptimalLocationMarkers() {
  const showOptimalLocations = useOptimalLocationsStore((state) => state.showLocations);
  const optimalLocations = useOptimalLocationsStore((state) => state.locations);
  const [activeLocation, setActiveLocation] = useState<OptimalLocation | null>(null);

  if (!showOptimalLocations) return null;

  return (
    <>
      {optimalLocations.map((loc) => (
        <Fragment key={`${loc.mode ?? 'unknown'}-${loc.id}`}>
          <CustomOverlayMap position={{ lat: loc.lat, lng: loc.lng }} zIndex={10}>
            <button
              type="button"
              className="group relative flex cursor-pointer flex-col items-center focus:outline-none"
              onClick={() => setActiveLocation(loc)}
              onMouseEnter={() => setActiveLocation(loc)}
              onFocus={() => setActiveLocation(loc)}
              aria-label={`정책 우선 검토 후보 ${loc.id} 상세 보기`}
            >
              <div className="absolute bottom-full mb-2 hidden whitespace-nowrap rounded-full bg-gray-900 px-3 py-1.5 text-[11px] font-extrabold text-white shadow-lg group-hover:block group-focus:block">
                후보 {loc.id} 상세 보기
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-700/90 shadow-xl ring-4 ring-indigo-200/60 backdrop-blur-sm transition-transform group-hover:scale-110 group-focus:scale-110">
                <span className="text-sm font-black text-white">검토</span>
              </div>
              <div className="mt-1 rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-extrabold text-indigo-900 shadow">
                후보 {loc.id}
              </div>
            </button>
          </CustomOverlayMap>
        </Fragment>
      ))}

      {activeLocation ? (
        <OptimalLocationDetailPanel
          location={activeLocation}
          onClose={() => setActiveLocation(null)}
        />
      ) : null}
    </>
  );
}

function OptimalLocationDetailPanel({
  location,
  onClose,
}: {
  location: OptimalLocation;
  onClose: () => void;
}) {
  return (
    <aside className="fixed bottom-4 left-1/2 z-[1200] max-h-[min(70dvh,520px)] w-[calc(100vw-1.5rem)] max-w-md -translate-x-1/2 overflow-hidden rounded-2xl bg-gray-950 text-white shadow-2xl ring-1 ring-white/10 sm:bottom-6 sm:right-6 sm:left-auto sm:w-96 sm:translate-x-0">
      <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div>
          <p className="text-sm font-black">정책 우선 검토 후보 {location.id}</p>
          <p className="mt-1 text-[11px] font-semibold text-indigo-100/80">
            확정 입지가 아니라 수요 중심 후보를 좁힌 분석 결과입니다.
          </p>
        </div>
        <button
          type="button"
          className="rounded-full p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
          onClick={onClose}
          aria-label="후보 상세 닫기"
        >
          x
        </button>
      </div>

      <div className="max-h-[calc(min(70dvh,520px)-4rem)] overflow-y-auto px-4 py-3 text-xs font-semibold leading-relaxed text-indigo-100">
        <div className="space-y-1">
          <p>분석 수요: {location.demand.toLocaleString('ko-KR')}건</p>
          {location.accessibility_gain_km !== undefined ? (
            <p>평균 접근성 개선: {formatKm(location.accessibility_gain_km)}</p>
          ) : null}
          {location.scenario_coverage_ratio !== undefined ? (
            <p>민감도 반복률: {(location.scenario_coverage_ratio * 100).toFixed(1)}%</p>
          ) : null}
          {location.before_avg_distance_km !== undefined && location.after_avg_distance_km !== undefined ? (
            <p>
              개선 전후: {formatKm(location.before_avg_distance_km)} - {formatKm(location.after_avg_distance_km)}
            </p>
          ) : null}
          {location.vulnerable_population !== undefined ? (
            <p>커버 취약인구: {formatNumber(location.vulnerable_population)}명</p>
          ) : null}
          {location.covered_district_count !== undefined ? (
            <p>개선 행정동: {formatNumber(location.covered_district_count)}곳</p>
          ) : null}
          {location.nearest_existing_hospital ? (
            <p>
              최근접 기존 병원: {location.nearest_existing_hospital}
              {location.nearest_existing_hospital_distance_km !== undefined
                ? ` (${formatKm(location.nearest_existing_hospital_distance_km)})`
                : ''}
            </p>
          ) : null}
          {location.score !== undefined ? (
            <p>설명용 점수: {location.score.toFixed(1)}점</p>
          ) : null}
        </div>

        {location.interpretation ? (
          <p className="mt-3 rounded-xl bg-white/10 p-3 text-white/90">
            {location.interpretation}
          </p>
        ) : null}

        <div className="mt-3 border-t border-white/10 pt-3 text-[11px] text-indigo-100/80">
          <p className="font-black text-white">해석 주의</p>
          <p>이 후보는 K-Means 기반 수요 중심 후보이며 p-median, MCLP 같은 실제 입지 최적화 모델과 비교가 필요합니다.</p>
          <p>교통 시간, 부지 가능성, 병원별 역할, 예산, 법적 지정 요건은 아직 반영되지 않았습니다.</p>
          <p className="mt-1 rounded-lg bg-white/10 p-2 text-indigo-50">
            설명용 점수는 평균 접근성 개선 km x log(1 + 커버 취약인구)입니다. 최종 정책 결정 점수가 아닙니다.
          </p>
        </div>
      </div>
    </aside>
  );
}
