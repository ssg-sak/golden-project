import { useMemo } from 'react';

import { useVulnerabilityStore } from '../../shared/store/vulnerabilityStore';

import { HeatmapToggle } from './HeatmapToggle';
import { HospitalFilterBar } from './HospitalFilterBar';
import type { HospitalFilter } from './lib/hospital-filter';
import { useOptimalLocationsStore } from './lib/useOptimalLocationsStore';
import { usePresetStore } from './lib/usePresetStore';
import { getVulnerabilityRange } from './lib/vulnerability-choropleth-colors';

interface MapToolbarProps {
  activeFilter: HospitalFilter;
  onFilterChange: (filter: HospitalFilter) => void;
  riskThreshold?: number;
  onRiskThresholdChange?: (value: number) => void;
  onPresetSelect?: (preset: 'highRiskTop10' | 'pediatricPriority' | 'generalPriority') => void;
  onExportCsv?: () => void;
  currentMode?: string;
}

const QUICK_LOOKUPS = [
  { preset: 'highRiskTop10' as const, label: 'VDI 고위험 10곳', filter: 'all' as HospitalFilter },
  { preset: 'pediatricPriority' as const, label: '소아 취약 우선', filter: 'tier3' as HospitalFilter },
  { preset: 'generalPriority' as const, label: '응급 취약 우선', filter: 'tier2' as HospitalFilter },
];

export function MapToolbar({
  activeFilter,
  onFilterChange,
  riskThreshold,
  onRiskThresholdChange,
  onPresetSelect,
  onExportCsv,
  currentMode = 'all',
}: MapToolbarProps) {
  const showHeatmap = useVulnerabilityStore((state) => state.showHeatmap);
  const vulnerabilityRecords = useVulnerabilityStore((state) => state.records);
  const vulnerabilityLoading = useVulnerabilityStore((state) => state.isLoading);
  const activePreset = usePresetStore((state) => state.activePreset);
  const clearPreset = usePresetStore((state) => state.clearPreset);
  const showOptimalLocations = useOptimalLocationsStore((state) => state.showLocations);
  const toggleOptimalLocations = useOptimalLocationsStore((state) => state.toggleLocations);
  const setOptimalMode = useOptimalLocationsStore((state) => state.setMode);

  const canShowOptimalLocations = currentMode === 'pediatric' || currentMode === 'senior';
  const optimalButtonLabel =
    showOptimalLocations && canShowOptimalLocations
      ? '최적입지 숨기기'
      : canShowOptimalLocations
        ? '최적입지 보기'
        : '소아 최적입지 보기';

  function handleOptimalLocationToggle() {
    if (!canShowOptimalLocations) {
      setOptimalMode('pediatric');
      if (!showOptimalLocations) {
        toggleOptimalLocations();
      }
      return;
    }
    toggleOptimalLocations();
  }

  const { min: vulnerabilityMin, max: vulnerabilityMax } = useMemo(() => {
    return getVulnerabilityRange(vulnerabilityRecords.map((record) => record.vdi_log));
  }, [vulnerabilityRecords]);

  const hasRange =
    Number.isFinite(vulnerabilityMin) &&
    Number.isFinite(vulnerabilityMax) &&
    vulnerabilityMax >= vulnerabilityMin;

  return (
    <div className="shrink-0 border-b border-slate-300/70 bg-[#eef3f9] px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex items-center">
          <HospitalFilterBar activeFilter={activeFilter} onFilterChange={onFilterChange} />
        </div>

        <div className="hidden h-6 w-px bg-slate-300 xl:block" />

        <div className="flex items-center gap-2">
          <span className="hidden text-[11px] font-bold text-slate-700 sm:inline-block">
            빠른 지역 조회
          </span>
          {QUICK_LOOKUPS.map((item) => {
            const selected = activePreset === item.preset;
            return (
              <button
                key={item.preset}
                type="button"
                onClick={() => {
                  onFilterChange(item.filter);
                  onPresetSelect?.(item.preset);
                }}
                className={`rounded-md px-2.5 py-1.5 text-xs font-semibold ring-1 transition-colors ${
                  selected
                    ? 'bg-rose-600 text-white ring-rose-600'
                    : 'bg-white text-slate-700 ring-slate-300 hover:bg-rose-50 hover:text-rose-700 hover:ring-rose-200'
                }`}
              >
                {item.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => {
              clearPreset();
              onFilterChange('all');
            }}
            className="rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-300 transition-colors hover:bg-slate-200"
          >
            초기화
          </button>
        </div>

        <div className="hidden h-6 w-px bg-slate-300 xl:block" />

        <div className="flex flex-wrap items-center gap-3">
          {hasRange && typeof riskThreshold === 'number' ? (
            <label className="flex items-center gap-2 rounded-md bg-white px-2.5 py-1.5 shadow-sm ring-1 ring-slate-300">
              <span className="text-[10px] font-semibold text-slate-600">고위험 기준</span>
              <input
                type="range"
                min={1500}
                max={10000}
                step={100}
                value={Math.min(10000, Math.max(1500, riskThreshold))}
                onChange={(event) => onRiskThresholdChange?.(Number(event.target.value))}
                className="w-24 accent-rose-600 sm:w-32"
                aria-label="VDI Log 고위험 기준"
              />
              <span className="w-14 text-right text-[10px] font-bold tabular-nums text-rose-700">
                {Math.round(riskThreshold).toLocaleString('ko-KR')}
              </span>
            </label>
          ) : null}

          {showHeatmap ? (
            <div
              className="hidden items-center gap-2 rounded-md bg-white px-2.5 py-1.5 shadow-sm ring-1 ring-slate-300 lg:flex"
              aria-label="VDI Log 위험 기준"
            >
              <span className="text-[10px] font-medium text-slate-500">VDI Log</span>
              <div
                className="h-1.5 w-20 rounded-full"
                style={{
                  background:
                    'linear-gradient(to right, rgba(254,249,195,0.95) 0%, #f59e0b 35%, #ef4444 70%, #7f1d1d 100%)',
                }}
              />
              <span className="text-[10px] font-semibold text-amber-700">1,500+</span>
              <span className="text-[10px] font-semibold text-orange-700">5,000+</span>
              <span className="text-[10px] font-semibold text-red-800">10,000+</span>
              <span className="text-[10px] font-medium text-slate-400">
                범위 {Math.round(vulnerabilityMin).toLocaleString('ko-KR')}~{Math.round(vulnerabilityMax).toLocaleString('ko-KR')}
              </span>
            </div>
          ) : null}

          <HeatmapToggle />

          <div className="flex items-center gap-2 rounded-md bg-white px-2 py-1.5 shadow-sm ring-1 ring-indigo-100">
            <button
              type="button"
              onClick={handleOptimalLocationToggle}
              title={
                canShowOptimalLocations
                  ? '소아 또는 어르신 최적입지 후보를 지도에 표시합니다.'
                  : '소아 모드로 전환하고 최적입지 후보를 표시합니다.'
              }
              className={`rounded-md px-2.5 py-1.5 text-xs font-semibold ring-1 transition-colors ${
                showOptimalLocations && canShowOptimalLocations
                  ? 'bg-indigo-700 text-white ring-indigo-700'
                  : canShowOptimalLocations
                    ? 'bg-white text-indigo-700 ring-indigo-200 hover:bg-indigo-50'
                    : 'bg-white text-indigo-700 ring-indigo-200 hover:bg-indigo-50'
              }`}
            >
              {optimalButtonLabel}
            </button>
            <span className="hidden max-w-[13rem] text-[10px] font-medium leading-snug text-slate-500 md:inline">
              병원이 아닌 분석상 우선 후보 표시. 원거리 저수요 후보는 별도 검토
            </span>
          </div>

          {vulnerabilityLoading ? (
            <span className="text-[10px] font-medium text-slate-400">분석 불러오는 중</span>
          ) : null}
        </div>

        <div className="ml-auto flex items-center gap-2 xl:pl-4">
          <button
            type="button"
            onClick={onExportCsv}
            className="rounded-md bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm ring-1 ring-slate-300 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            CSV 내보내기
          </button>
        </div>
      </div>
    </div>
  );
}
