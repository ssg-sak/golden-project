import type { LocationSource } from '../../shared/hooks/useUserLocation';
import {
  SEVERE_CONDITION_OPTIONS,
  severeConditionOption,
  type SevereConditionId,
} from '../../shared/lib/severe-condition';
import { LocationNotice } from '../landing/LocationNotice';

interface HospitalSidebarControlsProps {
  heading?: string;
  isLocating: boolean;
  locationSource: LocationSource | null;
  locationErrorReason: Parameters<typeof LocationNotice>[0]['errorReason'];
  onRetryLocation?: () => void;
  showAvailableOnly: boolean;
  onShowAvailableOnlyChange: (value: boolean) => void;
  careTarget: 'all' | 'adult' | 'pediatric' | 'senior';
  onCareTargetChange: (value: 'all' | 'adult' | 'pediatric' | 'senior') => void;
  severeCondition?: SevereConditionId;
  onSevereConditionChange?: (value: SevereConditionId) => void;
}

const CARE_TARGET_OPTIONS = [
  { key: 'all', label: '전체' },
  { key: 'adult', label: '성인' },
  { key: 'pediatric', label: '소아' },
  { key: 'senior', label: '고령층' },
] as const;

export function HospitalSidebarControls({
  heading = '누가 진료받나요?',
  isLocating,
  locationSource,
  locationErrorReason,
  onRetryLocation,
  showAvailableOnly,
  onShowAvailableOnlyChange,
  careTarget,
  onCareTargetChange,
  severeCondition = 'all',
  onSevereConditionChange,
}: HospitalSidebarControlsProps) {
  const selectedCondition = severeConditionOption(severeCondition);

  return (
    <div className="shrink-0 border-b border-slate-100 bg-white px-3 py-2">
      <LocationNotice
        compact
        isLocating={isLocating}
        source={locationSource}
        errorReason={locationErrorReason}
        onRetry={onRetryLocation}
        locatingMessage="위치 확인 중"
      />

      <div className="mt-2">
        <p className="text-xs font-bold text-slate-700">{heading}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onShowAvailableOnlyChange(!showAvailableOnly)}
            className={`min-h-9 rounded-full border px-3 text-xs font-semibold transition-colors ${
              showAvailableOnly
                ? 'border-teal-700 bg-teal-50 text-teal-800'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            응급병상 보유만
          </button>

          {CARE_TARGET_OPTIONS.map((option) => {
            const active = careTarget === option.key;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => onCareTargetChange(option.key)}
                className={`min-h-9 rounded-full border px-3 text-xs font-semibold transition-colors ${
                  active
                    ? 'border-teal-800 bg-teal-800 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-extrabold text-slate-800">중증·응급 상황 필터</p>
          <span className="text-[11px] font-bold text-teal-800">{selectedCondition.shortLabel}</span>
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
          {selectedCondition.description}
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {SEVERE_CONDITION_OPTIONS.map((option) => {
            const active = severeCondition === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  onSevereConditionChange?.(option.id);
                  if (option.id === 'pediatric_night_holiday') {
                    onCareTargetChange('pediatric');
                    onShowAvailableOnlyChange(false);
                  }
                }}
                className={`min-h-9 rounded-full border px-2 text-xs font-semibold transition-colors ${
                  active
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                {option.shortLabel}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
