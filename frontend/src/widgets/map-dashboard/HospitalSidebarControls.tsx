import type { LocationSource } from '../../shared/hooks/useUserLocation';
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
}

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
}: HospitalSidebarControlsProps) {
  return (
    <div className="shrink-0 flex flex-col gap-2 border-b border-slate-100 bg-white px-3 py-2">
      {/* 1. 현재 위치 알림바 */}
      <LocationNotice
        compact
        isLocating={isLocating}
        source={locationSource}
        errorReason={locationErrorReason}
        onRetry={onRetryLocation}
        locatingMessage="위치 파악 중 📍"
      />

      <p className="text-xs font-bold text-slate-700">{heading}</p>
      {/* 2. 가로 스크롤 필터 목록 */}
      <div 
        className="flex w-full items-center gap-2 overflow-x-auto pb-1 scrollbar-hide"
        onPointerDownCapture={(e) => e.stopPropagation()}
      >
        {/* 병상 보유 필터 칩 */}
        <button
          type="button"
          onClick={() => onShowAvailableOnlyChange(!showAvailableOnly)}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors border ${
            showAvailableOnly
              ? 'border-teal-700 bg-teal-50 text-teal-800'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          {showAvailableOnly ? '🛏️ 응급병상 보유만' : '응급병상 보유만'}
        </button>

        <div className="h-4 w-px shrink-0 bg-slate-200" /> {/* 구분선 */}

        {/* 진료 대상 필터 칩들 */}
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
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors border ${
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
  );
}
