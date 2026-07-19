import {
  HOSPITAL_FILTER_OPTIONS,
  filterActiveStyle,
  type HospitalFilter,
} from './lib/hospital-filter';

import { TierIcon } from './TierIcon';

interface HospitalFilterBarProps {
  activeFilter: HospitalFilter;
  onFilterChange: (filter: HospitalFilter) => void;
}

const INACTIVE_STYLE =
  'bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900';

export function HospitalFilterBar({
  activeFilter,
  onFilterChange,
}: HospitalFilterBarProps) {
  return (
    <div role="toolbar" aria-label="병원 분류 필터" className="shrink-0">
      <div className="flex items-center overflow-hidden rounded-sm shadow-sm ring-1 ring-slate-300">
        {HOSPITAL_FILTER_OPTIONS.map((option, index) => {
          const isActive = activeFilter === option.id;
          const isLast = index === HOSPITAL_FILTER_OPTIONS.length - 1;

          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => onFilterChange(option.id)}
              className={`z-10 inline-flex min-h-8 items-center gap-1 whitespace-nowrap px-2.5 py-1 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 ${
                isActive ? filterActiveStyle(option.id) : INACTIVE_STYLE
              } ${isLast ? '' : 'border-r border-slate-200'}`}
            >
              {option.tier ? <TierIcon tier={option.tier} size="xs" /> : null}
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
