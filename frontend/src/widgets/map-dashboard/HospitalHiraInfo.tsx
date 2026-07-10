import type { HospitalRecord } from '../../shared/types/hospital';

interface HospitalHiraInfoProps {
  hospital: HospitalRecord;
}

export function HospitalHiraInfo({ hospital }: HospitalHiraInfoProps) {
  const hasHiraData =
    hospital.operating_hours ||
    hospital.doctors_count !== undefined ||
    hospital.equipment_status ||
    (hospital.hira_notices && hospital.hira_notices.length > 0);

  if (!hasHiraData) {
    return null;
  }

  // 달빛어린이병원 (Tier 3)일 경우 색상을 다르게 구성 (노랑/오렌지 톤)
  const isTier3 = hospital.tier === 3;
  const sectionBgClass = isTier3 ? 'bg-orange-50 ring-orange-200/60' : 'bg-slate-50 ring-slate-200/60';
  const titleClass = isTier3 ? 'text-orange-700' : 'text-slate-600';
  const itemLabelClass = isTier3 ? 'text-orange-600/70' : 'text-slate-500';
  const itemValueClass = isTier3 ? 'text-orange-900' : 'text-slate-700';

  return (
    <section className={`rounded-2xl p-4 ring-1 ${sectionBgClass}`}>
      <div className="mb-3 flex items-center justify-between">
        <p className={`text-xs font-bold ${titleClass}`}>의료 서비스 상세</p>
        {isTier3 && (
          <span className="rounded-md bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-600">
            소아 야간/휴일 특화
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2.5 text-xs">
        {hospital.operating_hours && (
          <div>
            <span className={`block text-[10px] font-bold uppercase tracking-wider ${itemLabelClass}`}>
              운영 시간
            </span>
            <span className={`mt-0.5 block font-medium leading-relaxed ${itemValueClass}`}>
              {hospital.operating_hours}
            </span>
          </div>
        )}

        {hospital.doctors_count !== undefined && (
          <div>
            <span className={`block text-[10px] font-bold uppercase tracking-wider ${itemLabelClass}`}>
              의료진 수
            </span>
            <span className={`mt-0.5 block font-medium ${itemValueClass}`}>
              {hospital.doctors_count}명
            </span>
          </div>
        )}

        {hospital.equipment_status && Object.keys(hospital.equipment_status).length > 0 && (
          <div>
            <span className={`block text-[10px] font-bold uppercase tracking-wider ${itemLabelClass}`}>
              주요 장비 보유
            </span>
            <div className="mt-1 flex flex-wrap gap-1">
              {Object.entries(hospital.equipment_status).map(([eq, hasEq]) => (
                <span
                  key={eq}
                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                    hasEq
                      ? isTier3
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-slate-200 text-slate-700'
                      : isTier3
                        ? 'bg-white/50 text-orange-400 line-through'
                        : 'bg-white/50 text-slate-400 line-through'
                  }`}
                >
                  {eq}
                </span>
              ))}
            </div>
          </div>
        )}

        {hospital.hira_notices && hospital.hira_notices.length > 0 && (
          <div className="mt-1">
            <span className={`block text-[10px] font-bold uppercase tracking-wider ${itemLabelClass}`}>
              심평원 안내 사항
            </span>
            <ul className={`mt-0.5 list-inside list-disc font-medium ${itemValueClass}`}>
              {hospital.hira_notices.map((notice, i) => (
                <li key={i}>{notice}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
