import { resolveBedStatus } from '../../shared/lib/bed-status';
import type { HospitalRecord } from '../../shared/types/hospital';

interface CitizenBedLabelProps {
  hospital: HospitalRecord;
  size?: 'list' | 'detail';
  inverted?: boolean;
}

export function CitizenBedLabel({ hospital, size = 'list', inverted = false }: CitizenBedLabelProps) {
  const { status, count, congestion } = resolveBedStatus(hospital);
  const isLarge = size === 'detail';
  const sizeClass = isLarge ? 'text-lg' : 'text-sm';

  if (status === 'available') {
    const visual = congestion === 'crowded'
      ? { dot: 'bg-rose-500', text: inverted ? 'text-rose-100' : 'text-rose-700', label: '혼잡' }
      : congestion === 'moderate'
        ? { dot: 'bg-amber-500', text: inverted ? 'text-amber-100' : 'text-amber-700', label: '지연' }
        : { dot: 'bg-emerald-500', text: inverted ? 'text-emerald-100' : 'text-emerald-700', label: '원활' };
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-bold ${sizeClass} ${visual.text}`}
        title={`국립중앙의료원 실시간 응급실일반 기준 · ${visual.label}`}
      >
        <span className={`h-3 w-3 rounded-full ${visual.dot}`} aria-hidden />
        일반응급실 {visual.label}{count !== undefined ? ` (${count}개)` : ''}
      </span>
    );
  }

  if (status === 'unavailable') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-bold ${sizeClass} ${
          inverted ? 'text-rose-100' : 'text-rose-700'
        }`}
        title="국립중앙의료원 실시간 응급실일반 가용 병상 기준"
      >
        <span className="h-3 w-3 rounded-full bg-rose-500" aria-hidden />
        일반응급실 여유 없음
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium ${sizeClass} ${
        inverted ? 'text-slate-200' : 'text-slate-500'
      }`}
    >
      <span className="h-3 w-3 rounded-full bg-slate-400" aria-hidden />
      일반응급실 현황 확인 중
    </span>
  );
}
