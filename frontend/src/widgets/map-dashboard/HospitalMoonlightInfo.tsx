import type { HospitalRecord } from '../../shared/types/hospital';

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
          <div><h3 className="text-sm font-bold">달빛어린이병원 운영 지표</h3><p className="mt-1 text-[10px] text-violet-200/70">야간·휴일 소아 외래 접근성 기준</p></div>
          <span className="rounded-full bg-violet-400/15 px-2 py-1 text-[9px] font-bold text-violet-200 ring-1 ring-violet-300/20">Tier 3</span>
        </div>
        <p className="mt-3 rounded-xl bg-white/5 px-3 py-2 text-[10px] leading-relaxed text-violet-100/80 ring-1 ring-white/10">일반 응급실 병상 수가 아니라 소아 진료 접근성, 운영시간, 의료진과 장비 현황을 보는 기관입니다.</p>
        <dl className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-white/5 px-3 py-2 ring-1 ring-white/10"><dt className="text-[9px] text-violet-200/60">소아 야간·휴일 지정</dt><dd className="mt-1 text-xs font-bold text-emerald-300">확인</dd></div>
          <div className="rounded-lg bg-white/5 px-3 py-2 ring-1 ring-white/10"><dt className="text-[9px] text-violet-200/60">등록 의료진</dt><dd className="mt-1 text-xs font-bold">{hospital.doctors_count !== undefined ? `${hospital.doctors_count}명` : '확인 중'}</dd></div>
          <div className="rounded-lg bg-white/5 px-3 py-2 ring-1 ring-white/10"><dt className="text-[9px] text-violet-200/60">등록 장비 항목</dt><dd className="mt-1 text-xs font-bold">{equipment.length > 0 ? `${equipment.length}종` : '확인 중'}</dd></div>
          <div className="rounded-lg bg-white/5 px-3 py-2 ring-1 ring-white/10"><dt className="text-[9px] text-violet-200/60">오늘 운영시간</dt><dd className="mt-1 text-xs font-bold">{hospital.operating_hours ?? 'API 확인 중'}</dd></div>
        </dl>
        <p className="mt-3 text-[9px] leading-relaxed text-violet-200/60">권역별 소아인구·이동시간·진료 공백과 함께 비교해 주세요.</p>
      </section>
    );
  }

  return (
    <section className="shrink-0 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
      <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-extrabold text-amber-950">달빛어린이병원</h3><span className="rounded-full bg-white px-2 py-1 text-[9px] font-bold text-amber-700 ring-1 ring-amber-200">소아 야간·휴일 진료</span></div>
      <p className="mt-3 text-xs leading-relaxed text-amber-900">응급실 병상을 운영하는 일반 응급의료기관과 달리, 야간·휴일에 소아 환자가 외래 진료를 받을 수 있도록 지정된 기관입니다.</p>
      <div className="mt-3 rounded-xl bg-white/70 px-3 py-2.5 ring-1 ring-amber-200/70">
        <p className="text-[10px] font-bold text-amber-800">이럴 때 확인하세요</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">밤이나 휴일에 아이의 진료가 필요하지만 중증 응급상황은 아닐 때 가까운 진료기관을 찾는 데 도움이 됩니다.</p>
      </div>
      <dl className="mt-3 space-y-2 text-xs">
        <div className="flex justify-between gap-3"><dt className="font-semibold text-slate-500">오늘 운영시간</dt><dd className="text-right font-bold text-slate-700">{hospital.operating_hours ?? '공공 API 확인 중'}</dd></div>
        <div className="flex justify-between gap-3"><dt className="font-semibold text-slate-500">등록 의료진</dt><dd className="font-bold text-slate-700">{hospital.doctors_count !== undefined ? `${hospital.doctors_count}명` : '확인 중'}</dd></div>
        <div className="flex justify-between gap-3"><dt className="font-semibold text-slate-500">연락처</dt><dd className="font-bold text-slate-700">{hospital.tel ?? '정보 확인 중'}</dd></div>
      </dl>
      {equipment.length > 0 ? <div className="mt-3"><p className="mb-2 text-[10px] font-bold text-slate-500">등록 장비 보유 현황</p><div className="flex flex-wrap gap-1.5">{equipment.filter(([, hasEquipment]) => hasEquipment).map(([name]) => <span key={name} className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200">{name}</span>)}</div></div> : null}
      <p className="mt-3 text-[10px] leading-relaxed text-amber-800">현재 진료 가능 여부는 운영시간과 접수 상황이 달라질 수 있으니 방문 전 전화로 확인해 주세요. 호흡곤란·의식저하 등 중증 증상은 119를 이용하세요.</p>
    </section>
  );
}
