import { useMemo } from 'react';
import { useVulnerabilityStore } from '../../shared/store/vulnerabilityStore';
import { usePresetStore } from './lib/usePresetStore';

import { HeatmapToggle } from './HeatmapToggle';
import { HospitalFilterBar } from './HospitalFilterBar';
import type { HospitalFilter } from './lib/hospital-filter';
import { getVulnerabilityRange } from './lib/vulnerability-choropleth-colors';

interface MapToolbarProps {
  activeFilter: HospitalFilter;
  onFilterChange: (filter: HospitalFilter) => void;
  riskThreshold?: number;
  onRiskThresholdChange?: (value: number) => void;
  onPresetSelect?: (preset: 'highRiskTop10' | 'pediatricPriority' | 'generalPriority') => void;
  onExportCsv?: () => void;
  onCaptureReport?: () => void;
}

export function MapToolbar({
  activeFilter,
  onFilterChange,
  riskThreshold,
  onRiskThresholdChange,
  onPresetSelect,
  onExportCsv,
  onCaptureReport,
}: MapToolbarProps) {
  const showHeatmap = useVulnerabilityStore((state) => state.showHeatmap);
  const vulnerabilityRecords = useVulnerabilityStore((state) => state.records);
  const vulnerabilityLoading = useVulnerabilityStore((state) => state.isLoading);


  const { min: vulnerabilityMin, max: vulnerabilityMax } = useMemo(() => {
    return getVulnerabilityRange(vulnerabilityRecords.map(r => r.vulnerability_index));
  }, [vulnerabilityRecords]);
  
  const hasRange =
    typeof vulnerabilityMin === 'number' &&
    typeof vulnerabilityMax === 'number' &&
    vulnerabilityMax >= vulnerabilityMin;
  const span = hasRange ? vulnerabilityMax - vulnerabilityMin : 0;
  const q1 = hasRange ? vulnerabilityMin + span * 0.25 : 0;
  const q2 = hasRange ? vulnerabilityMin + span * 0.5 : 0;
  const q3 = hasRange ? vulnerabilityMin + span * 0.75 : 0;

  return (
    <div className="shrink-0 border-b border-slate-300/70 bg-[#eef3f9] px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-y-3 gap-x-4">
        
        {/* Zone 1: 기본 필터 */}
        <div className="flex items-center">
          <HospitalFilterBar activeFilter={activeFilter} onFilterChange={onFilterChange} />
        </div>

        <div className="hidden h-6 w-px bg-slate-300 xl:block" />

        {/* Zone 2: 프리셋 */}
        <div className="flex items-center gap-2">
          <span className="hidden text-[11px] font-bold text-slate-700 sm:inline-block mr-1">빠른 지역 조회</span>
          <button
            type="button"
            onClick={() => onPresetSelect?.('highRiskTop10')}
            className="rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 transition-colors"
          >
            고위험 지역 10곳
          </button>
          <button
            type="button"
            onClick={() => onPresetSelect?.('pediatricPriority')}
            className="rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 transition-colors"
          >
            소아 의료 취약지역
          </button>
          <button
            type="button"
            onClick={() => onPresetSelect?.('generalPriority')}
            className="rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 transition-colors"
          >
            응급의료 취약지역
          </button>
          <button
            type="button"
            onClick={() => {
              usePresetStore.getState().clearPreset();
            }}
            className="rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-300 hover:bg-slate-200 transition-colors ml-1"
          >
            초기화
          </button>
        </div>

        <div className="hidden h-6 w-px bg-slate-300 xl:block" />

        {/* Zone 3: 지도 조작 & AI */}
        <div className="flex flex-wrap items-center gap-3">
          {hasRange && typeof riskThreshold === 'number' ? (
            <label className="flex items-center gap-2 rounded-md bg-white px-2.5 py-1.5 ring-1 ring-slate-300 shadow-sm">
              <span className="text-[10px] font-semibold text-slate-600">고위험 기준</span>
              <input
                type="range"
                min={Math.floor(vulnerabilityMin ?? 0)}
                max={Math.ceil(vulnerabilityMax ?? 0)}
                value={riskThreshold}
                onChange={(event) => onRiskThresholdChange?.(Number(event.target.value))}
                className="w-20 sm:w-24 accent-rose-600"
              />
              <span className="text-[10px] font-bold text-rose-700 w-4">{Math.round(riskThreshold)}</span>
            </label>
          ) : null}

          {showHeatmap ? (
            <div
              className="hidden items-center gap-2 rounded-md bg-white px-2.5 py-1.5 ring-1 ring-slate-300 shadow-sm lg:flex"
              aria-hidden
            >
              {hasRange ? (
                <>
                  <span className="text-[10px] font-medium text-slate-500">
                    낮음 {Math.round(vulnerabilityMin)}
                  </span>
                  <div
                    className="h-1.5 w-16 rounded-full"
                    style={{
                      background:
                        'linear-gradient(to right, rgba(254,249,195,0.9) 0%, #fca5a5 55%, #7f1d1d 100%)',
                    }}
                  />
                  <span className="text-[10px] font-medium text-slate-500">
                    {Math.round(q1)}
                  </span>
                  <span className="text-[10px] font-medium text-slate-500">
                    {Math.round(q2)}
                  </span>
                  <span className="text-[10px] font-medium text-slate-500">
                    {Math.round(q3)}
                  </span>
                  <span className="text-[10px] font-semibold text-rose-900">
                    높음 {Math.round(vulnerabilityMax)}
                  </span>
                </>
              ) : (
                <span className="text-[10px] font-medium text-slate-500">
                  분석 범위 계산 중…
                </span>
              )}
            </div>
          ) : null}

          <HeatmapToggle />


          
          {vulnerabilityLoading ? (
            <span className="text-[10px] font-medium text-slate-400">분석 중…</span>
          ) : null}
        </div>

        {/* Zone 4: 유틸리티 */}
        <div className="ml-auto flex items-center gap-2 xl:pl-4">
          <button
            type="button"
            onClick={onExportCsv}
            className="rounded-md bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-slate-300 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
          >
            CSV 내보내기
          </button>
          <button
            type="button"
            onClick={onCaptureReport}
            className="rounded-md bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-slate-300 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
          >
            사회과학 보고서 보기
          </button>
        </div>
        
      </div>
    </div>
  );
}
