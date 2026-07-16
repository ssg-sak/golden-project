import { useState } from 'react';

import {
  candidateDistrictLabel,
  type CandidateMode,
} from './lib/candidate-location-labels';
import { useOptimalLocationsStore } from './lib/useOptimalLocationsStore';

type ObjectiveResult = {
  candidate_ids: number[];
  weighted_average_eta_minutes: number;
  covered_15min_ratio: number;
  covered_30min_ratio: number;
};

function CandidateChips({ mode, ids }: { mode: CandidateMode; ids: number[] }) {
  return (
    <span className="flex flex-wrap gap-1">
      {ids.map((id) => (
        <span
          key={id}
          className="inline-flex min-h-6 items-center justify-center rounded-full bg-slate-950 px-2 text-[10px] font-black text-white"
        >
          {candidateDistrictLabel(mode, id)}
        </span>
      ))}
    </span>
  );
}

function ResultRow({
  label,
  result,
  value,
  mode,
}: {
  label: string;
  result: ObjectiveResult;
  value: string;
  mode: CandidateMode;
}) {
  return (
    <div className="grid grid-cols-[7rem_1fr] items-center gap-2 border-t border-slate-100 py-2 first:border-t-0">
      <span className="text-[11px] font-bold text-slate-600">{label}</span>
      <div className="flex items-center justify-between gap-2">
        <CandidateChips mode={mode} ids={result.candidate_ids} />
        <span className="text-right text-[10px] font-semibold text-slate-500">{value}</span>
      </div>
    </div>
  );
}

export function PolicyOptimizationSummary() {
  const showLocations = useOptimalLocationsStore((state) => state.showLocations);
  const currentMode = useOptimalLocationsStore((state) => state.currentMode);
  const setOptimalMode = useOptimalLocationsStore((state) => state.setMode);
  const optimization = useOptimalLocationsStore((state) => state.optimization);
  const [facilityCount, setFacilityCount] = useState(2);

  if (!showLocations || (currentMode !== 'pediatric' && currentMode !== 'senior')) return null;

  const activeMode = currentMode as CandidateMode;
  const modeResults = optimization?.results[activeMode] ?? [];
  const selected = modeResults.find((row) => row.facility_count === facilityCount) ?? modeResults[0];
  if (!selected) return null;

  function handleModeChange(mode: CandidateMode) {
    setOptimalMode(mode);
  }

  return (
    <section className="pointer-events-auto absolute left-3 top-3 z-30 w-[min(22rem,calc(100%-1.5rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-[0_18px_48px_rgba(15,23,42,0.18)] backdrop-blur-md sm:left-4 sm:top-4">
      <div className="bg-[linear-gradient(125deg,#0f172a,#173b4f)] px-4 py-3 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-cyan-200">
              새 거점을 어디부터 볼까
            </p>
            <p className="mt-1 text-sm font-extrabold">
              {activeMode === 'pediatric' ? '소아 야간·휴일 접근성' : '고령층 응급 접근성'}
            </p>
          </div>
          <span className="rounded-full bg-white/10 px-2 py-1 text-[9px] font-bold text-cyan-100 ring-1 ring-white/15">
            실제 도로 4,901건 반영
          </span>
        </div>
      </div>

      <div className="px-4 py-3">
        <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
          {[
            { mode: 'pediatric' as const, label: '소아 야간·휴일' },
            { mode: 'senior' as const, label: '고령층 응급' },
          ].map((option) => {
            const active = activeMode === option.mode;
            return (
              <button
                key={option.mode}
                type="button"
                onClick={() => handleModeChange(option.mode)}
                className={`rounded-lg px-2 py-1.5 text-[11px] font-black transition ${
                  active
                    ? 'bg-white text-slate-950 shadow-sm ring-1 ring-slate-200'
                    : 'text-slate-500 hover:bg-white/60 hover:text-slate-800'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-bold text-slate-600">새로 둘 거점 수</p>
          <div className="flex rounded-lg bg-slate-100 p-1">
            {[1, 2, 3].map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => setFacilityCount(count)}
                className={`rounded-md px-3 py-1 text-[11px] font-black transition ${
                  facilityCount === count ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'
                }`}
              >
                {count}곳
              </button>
            ))}
          </div>
        </div>

        <div className="mt-2">
          <ResultRow
            label="평균 이동 부담"
            result={selected.p_median_optimum}
            value={`${selected.p_median_optimum.weighted_average_eta_minutes.toFixed(1)}분`}
            mode={activeMode}
          />
          <ResultRow
            label="15분 안 도착"
            result={selected.mclp_15min_optimum}
            value={`${(selected.mclp_15min_optimum.covered_15min_ratio * 100).toFixed(1)}%`}
            mode={activeMode}
          />
          <ResultRow
            label="30분 안 도착"
            result={selected.mclp_30min_optimum}
            value={`${(selected.mclp_30min_optimum.covered_30min_ratio * 100).toFixed(1)}%`}
            mode={activeMode}
          />
        </div>

        <p className="mt-2 rounded-lg bg-cyan-50 px-2.5 py-2 text-[10px] leading-relaxed text-cyan-950 ring-1 ring-cyan-100">
          행정구역 칩은 지도에 표시된 검토 후보 위치입니다. 평균 이동 부담은 전체 평균 시간을 줄이는 지역 조합,
          15분·30분 안 도착은 해당 시간 안에 접근 가능한 인구를 늘리는 지역 조합입니다.
        </p>

        <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-2 text-[10px] leading-relaxed text-amber-900 ring-1 ring-amber-100">
          이 지역명은 확정안이 아니라 먼저 현장 확인할 후보 권역입니다. 지도 마커와 함께 보세요.
        </p>
      </div>
    </section>
  );
}
