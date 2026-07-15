import { Fragment, useState } from 'react';
import { CustomOverlayMap } from 'react-kakao-maps-sdk';

import { useOptimalLocationsStore, type OptimalLocation } from './lib/useOptimalLocationsStore';

function formatNumber(value: number | undefined): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value.toLocaleString('ko-KR');
}

function formatMinutes(value: number | undefined): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return `${value.toFixed(1)}분`;
}

function formatPercent(value: number | undefined): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return `${(value * 100).toFixed(1)}%`;
}

function MetricCard({ label, value, detail }: { label: string; value: string | null; detail?: string | null }) {
  if (!value) return null;
  return (
    <div className="rounded-xl bg-white/[0.07] p-3 ring-1 ring-white/10">
      <p className="text-[10px] font-bold text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-black text-white">{value}</p>
      {detail ? <p className="mt-1 text-[10px] text-slate-400">{detail}</p> : null}
    </div>
  );
}

export function OptimalLocationMarkers() {
  const showOptimalLocations = useOptimalLocationsStore((state) => state.showLocations);
  const optimalLocations = useOptimalLocationsStore((state) => state.locations);
  const [activeLocation, setActiveLocation] = useState<OptimalLocation | null>(null);

  if (!showOptimalLocations) return null;

  return (
    <>
      {optimalLocations.map((location) => (
        <Fragment key={`${location.mode ?? 'unknown'}-${location.id}`}>
          <CustomOverlayMap position={{ lat: location.lat, lng: location.lng }} zIndex={10}>
            <button
              type="button"
              className="group relative flex cursor-pointer flex-col items-center focus:outline-none"
              onClick={() => setActiveLocation(location)}
              onFocus={() => setActiveLocation(location)}
              aria-label={`정책 검토 후보 ${location.id} 상세 보기`}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0f766e] text-sm font-black text-white shadow-xl ring-4 ring-teal-100/80 transition-transform group-hover:-translate-y-0.5 group-focus:-translate-y-0.5">
                {location.id}
              </span>
              <span className="mt-1 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-extrabold text-slate-800 shadow ring-1 ring-slate-200">
                검토 후보
              </span>
            </button>
          </CustomOverlayMap>
        </Fragment>
      ))}

      {activeLocation ? (
        <OptimalLocationDetailPanel location={activeLocation} onClose={() => setActiveLocation(null)} />
      ) : null}
    </>
  );
}

function CombinationLines({ location }: { location: OptimalLocation }) {
  const combinations = location.optimal_combinations;
  if (!combinations) return null;
  return (
    <section className="rounded-xl bg-emerald-400/10 p-3 ring-1 ring-emerald-300/20">
      <p className="font-black text-emerald-100">함께 검토하면 좋은 후보 조합</p>
      {combinations.p_median?.length ? (
        <p className="mt-1">평균 이동 부담 기준: {combinations.p_median.join(' / ')}</p>
      ) : null}
      {combinations.mclp_15min?.length ? (
        <p className="mt-1">15분 도착 기준: {combinations.mclp_15min.join(' / ')}</p>
      ) : null}
      {combinations.mclp_30min?.length ? (
        <p className="mt-1">30분 도착 기준: {combinations.mclp_30min.join(' / ')}</p>
      ) : null}
    </section>
  );
}

function OptimalLocationDetailPanel({ location, onClose }: { location: OptimalLocation; onClose: () => void }) {
  return (
    <aside className="fixed bottom-4 left-1/2 z-[1200] max-h-[min(72dvh,560px)] w-[calc(100vw-1.5rem)] max-w-md -translate-x-1/2 overflow-hidden rounded-2xl bg-slate-950 text-white shadow-2xl ring-1 ring-white/10 sm:bottom-6 sm:right-6 sm:left-auto sm:w-96 sm:translate-x-0">
      <header className="flex items-start justify-between gap-3 border-b border-white/10 bg-[linear-gradient(125deg,#0f172a,#134e4a)] px-4 py-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-teal-200">
            {location.mode === 'pediatric' ? '소아 야간·휴일 접근성' : '고령층 응급 접근성'}
          </p>
          <h2 className="mt-1 text-lg font-black">정책 검토 후보 {location.id}</h2>
          <p className="mt-1 text-[11px] text-slate-300">실제 도로 이동시간으로 다시 확인한 결과</p>
        </div>
        <button
          type="button"
          className="rounded-full p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
          onClick={onClose}
          aria-label="후보 상세 닫기"
        >
          x
        </button>
      </header>

      <div className="max-h-[calc(min(72dvh,560px)-5rem)] space-y-3 overflow-y-auto p-4 text-xs font-semibold leading-relaxed text-slate-200">
        <p className="rounded-lg bg-cyan-400/10 px-3 py-2 font-bold text-cyan-100 ring-1 ring-cyan-300/20">
          행정동에서 응급기관까지 실제 도로 이동시간을 반영했습니다.
        </p>

        <div className="grid grid-cols-2 gap-2">
          <MetricCard
            label="평균 이동시간"
            value={formatMinutes(location.p_median_weighted_eta_minutes)}
            detail={location.before_avg_eta_minutes !== undefined ? `기존 ${formatMinutes(location.before_avg_eta_minutes)}에서 비교` : null}
          />
          <MetricCard
            label="줄어든 시간"
            value={formatMinutes(location.accessibility_gain_minutes)}
            detail="보호가 필요한 인구를 더 크게 반영"
          />
          <MetricCard
            label="15분 안 도착"
            value={formatPercent(location.mclp_15min_coverage_ratio)}
            detail={location.mclp_15min_population !== undefined ? `${formatNumber(location.mclp_15min_population)}명` : null}
          />
          <MetricCard
            label="30분 안 도착"
            value={formatPercent(location.mclp_30min_coverage_ratio)}
            detail={location.mclp_30min_population !== undefined ? `${formatNumber(location.mclp_30min_population)}명` : null}
          />
        </div>

        <CombinationLines location={location} />

        {location.interpretation ? (
          <section className="rounded-xl bg-white/[0.06] p-3 text-slate-200 ring-1 ring-white/10">
            <p className="mb-1 font-black text-white">후보 해석</p>
            <p>{location.interpretation}</p>
          </section>
        ) : null}

        <section className="rounded-xl bg-amber-300/10 p-3 text-[11px] text-amber-100 ring-1 ring-amber-200/20">
          <p className="font-black">해석 주의</p>
          <p className="mt-1">
            이 위치는 새 병원 설치 확정안이 아닙니다. 부지, 예산, 인력, 병원별 역할을 확인하기 전에
            먼저 살펴볼 후보입니다.
          </p>
        </section>
      </div>
    </aside>
  );
}
