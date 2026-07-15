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
  currentMode?: string;
}

const QUICK_LOOKUPS = [
  { preset: 'highRiskTop10' as const, label: '위험 높은 10곳', filter: 'all' as HospitalFilter },
  { preset: 'pediatricPriority' as const, label: '소아 야간 취약', filter: 'tier3' as HospitalFilter },
  { preset: 'generalPriority' as const, label: '응급 접근 취약', filter: 'tier2' as HospitalFilter },
];

export function MapToolbar({
  activeFilter,
  onFilterChange,
  riskThreshold,
  onRiskThresholdChange,
  onPresetSelect,
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

  const canShowCandidateLocations = currentMode === 'pediatric' || currentMode === 'senior';
  const candidateButtonLabel =
    showOptimalLocations && canShowCandidateLocations
      ? '후보 숨기기'
      : canShowCandidateLocations
        ? '후보 보기'
        : '소아 후보 보기';

  function handleCandidateToggle() {
    if (!canShowCandidateLocations) {
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
    <div className="relative z-[900] shrink-0 border-b border-slate-300/70 bg-[#eef3f9] px-2.5 py-2 pointer-events-auto">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <HospitalFilterBar activeFilter={activeFilter} onFilterChange={onFilterChange} />

        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="hidden text-[11px] font-bold text-slate-600 xl:inline">빠른 조회</span>
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
                className={`min-h-8 rounded-md px-2.5 py-1 text-xs font-semibold ring-1 transition-colors ${
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
            className="min-h-8 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-300 transition-colors hover:bg-slate-200"
          >
            초기화
          </button>
        </div>

        {hasRange && typeof riskThreshold === 'number' ? (
          <label className="flex min-h-8 items-center gap-2 whitespace-nowrap rounded-md bg-white px-2.5 py-1 shadow-sm ring-1 ring-slate-300">
            <span className="text-[10px] font-semibold text-slate-600">위험 기준</span>
            <input
              type="range"
              min={1500}
              max={10000}
              step={100}
              value={Math.min(10000, Math.max(1500, riskThreshold))}
              onChange={(event) => onRiskThresholdChange?.(Number(event.target.value))}
              className="w-24 accent-rose-600 xl:w-32"
              aria-label="위험 점수 기준"
            />
            <span className="w-12 text-right text-[10px] font-bold tabular-nums text-rose-700">
              {Math.round(riskThreshold).toLocaleString('ko-KR')}
            </span>
          </label>
        ) : null}

        <HeatmapToggle />

        <button
          type="button"
          onClick={handleCandidateToggle}
          title={
            canShowCandidateLocations
              ? '후보지를 지도에 표시하거나 숨깁니다.'
              : '소아 야간·휴일 진료 후보지 보기로 전환합니다.'
          }
          className={`min-h-8 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-semibold ring-1 transition-colors ${
            showOptimalLocations && canShowCandidateLocations
              ? 'bg-indigo-700 text-white ring-indigo-700'
              : 'bg-white text-indigo-700 ring-indigo-200 hover:bg-indigo-50'
          }`}
        >
          {candidateButtonLabel}
        </button>

        {showHeatmap ? (
          <div
            className="hidden min-h-8 items-center gap-1.5 whitespace-nowrap rounded-md bg-white px-2.5 py-1 shadow-sm ring-1 ring-slate-300 2xl:flex"
            aria-label="위험 점수 색상 기준"
          >
            <span className="text-[10px] font-medium text-slate-500">색상 기준</span>
            <div
              className="h-1.5 w-16 rounded-full"
              style={{
                background:
                  'linear-gradient(to right, rgba(254,249,195,0.95) 0%, #f59e0b 35%, #ef4444 70%, #7f1d1d 100%)',
              }}
            />
            <span className="text-[10px] font-semibold text-amber-700">1,500+</span>
            <span className="text-[10px] font-semibold text-orange-700">5,000+</span>
            <span className="text-[10px] font-semibold text-red-800">10,000+</span>
          </div>
        ) : null}

        {vulnerabilityLoading ? (
          <span className="whitespace-nowrap text-[10px] font-medium text-slate-400">분석 불러오는 중</span>
        ) : null}
      </div>
    </div>
  );
}
