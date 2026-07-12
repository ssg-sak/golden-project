import type { HospitalRecord } from '../../shared/types/hospital';
import { resolveHospitalTel } from '../../shared/lib/hospital-tel';

interface HospitalMoonlightInfoProps {
  hospital: HospitalRecord;
  variant: 'citizen' | 'admin';
}

export function HospitalMoonlightInfo({ hospital, variant }: HospitalMoonlightInfoProps) {
  const equipment = Object.entries(hospital.equipment_status ?? {});

  if (variant === 'admin') {
    return (
      <section className="shrink-0 rounded-2xl bg-violet-950 p-4 text-white ring-1 ring-violet-400/30">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold">달빛어린이병원 안내</h3>
            <p className="mt-1 text-[10px] text-violet-200/70">
              일반 응급실과 다른 야간·휴일 소아 진료기관입니다.
            </p>
          </div>
          <span className="rounded-full bg-violet-400/15 px-2 py-1 text-[9px] font-bold text-violet-200 ring-1 ring-violet-300/20">
            Tier 3
          </span>
        </div>
        <p className="mt-3 rounded-xl bg-white/5 px-3 py-2 text-[10px] leading-relaxed text-violet-100/80 ring-1 ring-white/10">
          달빛어린이병원은 일반 응급실처럼 병상 수만 보는 곳이 아닙니다. 운영 시간, 소아 진료 가능 여부, 의료진,
          장비, 이동 시간을 함께 봐야 합니다.
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-white/5 px-3 py-2 ring-1 ring-white/10">
            <dt className="text-[9px] text-violet-200/60">달빛어린이병원 여부</dt>
            <dd className="mt-1 text-xs font-bold text-emerald-300">확인</dd>
          </div>
          <div className="rounded-lg bg-white/5 px-3 py-2 ring-1 ring-white/10">
            <dt className="text-[9px] text-violet-200/60">등록 의사 수</dt>
            <dd className="mt-1 text-xs font-bold">
              {hospital.doctors_count !== undefined ? `${hospital.doctors_count}명` : '확인 중'}
            </dd>
          </div>
          <div className="rounded-lg bg-white/5 px-3 py-2 ring-1 ring-white/10">
            <dt className="text-[9px] text-violet-200/60">등록 장비 수</dt>
            <dd className="mt-1 text-xs font-bold">{equipment.length > 0 ? `${equipment.length}종` : '확인 중'}</dd>
          </div>
          <div className="rounded-lg bg-white/5 px-3 py-2 ring-1 ring-white/10">
            <dt className="text-[9px] text-violet-200/60">오늘 운영 시간</dt>
            <dd className="mt-1 text-xs font-bold">{hospital.operating_hours ?? '전화 확인 필요'}</dd>
          </div>
        </dl>
        <p className="mt-3 text-[9px] leading-relaxed text-violet-200/60">
          달빛어린이병원은 일반 응급실과 다른 지표를 쓰는 것이 맞습니다. 병상 비교보다 소아 외래 접근성과 운영
          시간을 함께 확인해 주세요.
        </p>
      </section>
    );
  }

  return (
    <section className="shrink-0 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-extrabold text-amber-950">달빛어린이병원</h3>
        <span className="rounded-full bg-white px-2 py-1 text-[9px] font-bold text-amber-700 ring-1 ring-amber-200">
          일반 응급실과 다름
        </span>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-amber-900">
        달빛어린이병원은 일반 응급실이 아니라 야간·휴일 소아 진료기관입니다. 병상 수보다 운영 시간과 소아 진료
        가능 여부를 먼저 확인해 주세요.
      </p>
      <div className="mt-3 rounded-xl bg-white/70 px-3 py-2.5 ring-1 ring-amber-200/70">
        <p className="text-[10px] font-bold text-amber-800">이럴 때 확인하세요</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">
          밤이나 휴일에 소아 진료가 필요한 경우, 이 병원이 지금 운영 중인지와 실제 방문이 가능한지를 먼저
          확인하는 것이 좋습니다.
        </p>
      </div>
      <dl className="mt-3 space-y-2 text-xs">
        <div className="flex justify-between gap-3">
          <dt className="font-semibold text-slate-500">오늘 운영 시간</dt>
          <dd className="text-right font-bold text-slate-700">{hospital.operating_hours ?? '전화 확인 필요'}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="font-semibold text-slate-500">등록 의사 수</dt>
          <dd className="font-bold text-slate-700">
            {hospital.doctors_count !== undefined ? `${hospital.doctors_count}명` : '확인 중'}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="font-semibold text-slate-500">연락처</dt>
          <dd className="font-bold text-slate-700">{resolveHospitalTel(hospital) ?? '정보 확인 중'}</dd>
        </div>
      </dl>
      {equipment.length > 0 ? (
        <div className="mt-3">
          <p className="mb-2 text-[10px] font-bold text-slate-500">등록 장비</p>
          <div className="flex flex-wrap gap-1.5">
            {equipment
              .filter(([, hasEquipment]) => hasEquipment)
              .map(([name]) => (
                <span
                  key={name}
                  className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200"
                >
                  {name}
                </span>
              ))}
          </div>
        </div>
      ) : null}
      <p className="mt-3 text-[10px] leading-relaxed text-amber-800">
        현재 화면은 참고용입니다. 실제 이용 전에는 병원에 전화로 운영 여부를 다시 확인해 주세요. 증상에 따라서는
        119를 우선 이용하는 것이 안전합니다.
      </p>
    </section>
  );
}
