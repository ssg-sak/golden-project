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

  if (hospital.tier === 3) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-bold ${sizeClass} ${
          inverted ? 'text-cyan-100' : 'text-cyan-700'
        }`}
        title="달빛어린이병원은 일반응급실 병상 필터와 별개인 야간·휴일 소아진료 기관입니다. 방문 전 전화로 확인하세요."
      >
        <span className="h-3 w-3 rounded-full bg-cyan-500 ring-2 ring-cyan-100" aria-hidden />
        야간·휴일 소아진료
      </span>
    );
  }

  if (status === 'reported-bed-positive') {
    const visual = congestion === 'crowded'
      ? { dot: 'bg-rose-500', text: inverted ? 'text-rose-100' : 'text-rose-700' }
      : congestion === 'moderate'
        ? { dot: 'bg-amber-500', text: inverted ? 'text-amber-100' : 'text-amber-700' }
        : { dot: 'bg-emerald-500', text: inverted ? 'text-emerald-100' : 'text-emerald-700' };
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-bold ${sizeClass} ${visual.text}`}
        title="조회된 일반응급실 가용 병상 보고값입니다. 특정 환자의 진료·수용 가능을 보장하지 않습니다."
      >
        <span className={`h-3 w-3 rounded-full ${visual.dot}`} aria-hidden />
        일반응급실 가용병상 {count !== undefined ? `${count}개 보고` : '보고 있음'}
      </span>
    );
  }

  if (status === 'reported-bed-zero') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-bold ${sizeClass} ${
          inverted ? 'text-rose-100' : 'text-rose-700'
        }`}
        title="조회된 일반응급실 가용 병상 보고값이 0입니다. 병원 전체의 실제 수용 상태를 뜻하지 않습니다."
      >
        <span className="h-3 w-3 rounded-full bg-rose-500" aria-hidden />
        일반응급실 가용병상 0 보고
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
      일반응급실 병상정보 미확인
    </span>
  );
}
