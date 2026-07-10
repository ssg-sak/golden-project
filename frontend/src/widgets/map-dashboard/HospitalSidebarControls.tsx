import type { LocationSource } from '../../shared/hooks/useUserLocation';
import { LocationNotice } from '../landing/LocationNotice';

interface HospitalSidebarControlsProps {
  isLocating: boolean;
  locationSource: LocationSource | null;
  locationErrorReason: Parameters<typeof LocationNotice>[0]['errorReason'];
  onRetryLocation?: () => void;
  showAvailableOnly: boolean;
  onShowAvailableOnlyChange: (value: boolean) => void;
  careTarget: 'all' | 'adult' | 'pediatric' | 'senior';
  onCareTargetChange: (value: 'all' | 'adult' | 'pediatric' | 'senior') => void;
}

export function HospitalSidebarControls({
  isLocating,
  locationSource,
  locationErrorReason,
  onRetryLocation,
  showAvailableOnly,
  onShowAvailableOnlyChange,
  careTarget,
  onCareTargetChange,
}: HospitalSidebarControlsProps) {
  return (
    <>
      <div className="shrink-0 border-b border-slate-100 px-3 py-2">
        <LocationNotice
          compact
          isLocating={isLocating}
          source={locationSource}
          errorReason={locationErrorReason}
          onRetry={onRetryLocation}
          locatingMessage="시민님의 현재 위치를 파악하고 있습니다 📍"
        />
      </div>

      <div className="shrink-0 border-b border-slate-100 px-3 py-2">
        <p className="mb-2 text-xs font-semibold text-slate-500">진료 대상</p>
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { key: 'all', label: '전체' },
            { key: 'adult', label: '성인' },
            { key: 'pediatric', label: '소아' },
            { key: 'senior', label: '어르신' },
          ].map((option) => {
            const active = careTarget === option.key;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => onCareTargetChange(option.key as 'all' | 'adult' | 'pediatric' | 'senior')}
                className={`rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          {careTarget === 'adult'
            ? '성인 모드: 일반 응급 및 준종합 병원 전체를 표시합니다 (달빛어린이 제외).'
            : careTarget === 'pediatric'
              ? '소아 모드: 달빛어린이병원만 집중적으로 보여줍니다.'
              : careTarget === 'senior'
                ? '어르신 모드: 중증(심뇌혈관) 골든타임 거점(Tier 1) 및 보훈/적십자 등 노인 공공 거점만 선별합니다.'
                : '전체 모드: 모든 등급의 병원과 기관을 함께 표시합니다.'}
        </p>
      </div>

      <div className="shrink-0 border-b border-slate-100 px-3 py-2">
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <span className="min-w-0 flex-1 text-sm font-semibold leading-snug text-slate-700">
            🟢 진료 가능한 병원만 보기
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={showAvailableOnly}
            aria-label="진료 가능한 병원만 보기"
            onClick={() => onShowAvailableOnlyChange(!showAvailableOnly)}
            className={`inline-flex h-6 w-11 shrink-0 items-center overflow-hidden rounded-full p-0.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-1 ${
              showAvailableOnly
                ? 'justify-end bg-emerald-600'
                : 'justify-start bg-slate-200'
            }`}
          >
            <span className="h-5 w-5 shrink-0 rounded-full bg-white shadow-sm" aria-hidden />
          </button>
        </label>
      </div>
    </>
  );
}
