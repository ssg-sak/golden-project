import { resolveBedStatus } from '../../shared/lib/bed-status';
import type { HospitalRecord } from '../../shared/types/hospital';

interface CitizenBedLabelProps {
  hospital: HospitalRecord;
  size?: 'list' | 'detail';
  inverted?: boolean;
}

export function CitizenBedLabel({ hospital, size = 'list', inverted = false }: CitizenBedLabelProps) {
  const { status, count } = resolveBedStatus(hospital);
  const isLarge = size === 'detail';

  if (status === 'available') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-bold ${
          isLarge ? 'text-lg' : 'text-sm'
        } ${inverted ? 'text-emerald-100' : 'text-emerald-700'}`}
      >
        <span aria-hidden>🟢</span>
        <span aria-hidden className="font-bold">
          ✓
        </span>
        진료 가능{count !== undefined ? ` (${count}개)` : ''}
      </span>
    );
  }

  if (status === 'unavailable') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-bold ${
          isLarge ? 'text-lg' : 'text-sm'
        } ${inverted ? 'text-rose-100' : 'text-rose-700'}`}
      >
        <span aria-hidden>🔴</span>
        <span aria-hidden className="font-bold">
          ⚠
        </span>
        수용 불가 (이동 금지)
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center font-medium ${
        isLarge ? 'text-base' : 'text-sm'
      } ${inverted ? 'text-slate-200' : 'text-slate-500'}`}
    >
      전화 문의 요망
    </span>
  );
}
