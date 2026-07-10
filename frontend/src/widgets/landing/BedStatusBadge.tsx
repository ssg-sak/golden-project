import { resolveBedStatus } from '../../shared/lib/bed-status';
import { hospitalTotalBeds, hospitalTotalBedsIsInvalid } from '../../shared/types/hospital';
import type { HospitalRecord } from '../../shared/types/hospital';

interface BedStatusBadgeProps {
  hospital: HospitalRecord;
}

export function BedStatusBadge({ hospital }: BedStatusBadgeProps) {
  const { status, count } = resolveBedStatus(hospital);
  const totalBeds = hospitalTotalBeds(hospital);
  const totalBedsInvalid = hospitalTotalBedsIsInvalid(hospital);

  if (status === 'available' && count !== undefined) {
    return (
      <div className="flex flex-col items-end" title="현재 응급구역에 당장 수용 가능한 빈 베드 수입니다. (전체 입원실 아님)">
        <span className="text-[10px] font-bold text-emerald-600 sm:text-xs">응급실 빈자리</span>
        <span className="inline-flex items-baseline gap-1 text-emerald-700">
          <span className="text-2xl font-black leading-none sm:text-3xl">{count}</span>
          <span className="text-sm font-bold">개 가용</span>
        </span>
        {totalBeds !== undefined && (
          <span className="text-[10px] text-slate-400">전체 {totalBeds}개 중</span>
        )}
        {totalBedsInvalid && (
          <span className="text-[10px] text-amber-600">※ 총 병상 불일치</span>
        )}
      </div>
    );
  }

  if (status === 'unavailable') {
    return (
      <div className="flex flex-col items-end" title="현재 응급구역에 수용 가능한 베드가 없습니다.">
        <span className="text-[10px] font-bold text-rose-600 sm:text-xs">응급실 빈자리</span>
        <span className="inline-flex items-baseline gap-1 text-rose-700">
          <span className="text-2xl font-black leading-none sm:text-3xl">0</span>
          <span className="text-sm font-bold">개</span>
        </span>
        <span className="mt-0.5 text-[10px] font-bold text-rose-500">수용 불가</span>
        {totalBeds !== undefined && (
          <span className="text-[10px] text-slate-400">전체 {totalBeds}개 중</span>
        )}
        {totalBedsInvalid && (
          <span className="text-[10px] text-amber-600">※ 총 병상 불일치</span>
        )}
      </div>
    );
  }

  // 데이터 제공을 하지 않거나(tier 3 소아과), API 수집 지연(tier 1,2)인 경우 (unknown status)
  if (hospital.tier === 3) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700 ring-1 ring-slate-300" title="소아/야간 진료 기관입니다. 응급실 운영 현황은 전화로 문의해 주세요.">
        현황 미제공 (전화 문의)
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-900 ring-1 ring-amber-300" title="공공데이터포털 또는 병원 측 서버 응답 지연입니다.">
      현황 수집 지연 (전화 문의)
    </span>
  );
}
