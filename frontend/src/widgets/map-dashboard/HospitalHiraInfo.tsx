import { useId, useState } from 'react';
import type { HospitalRecord } from '../../shared/types/hospital';

export function HospitalHiraInfo({ hospital }: { hospital: HospitalRecord }) {
  const [isNoticesOpen, setIsNoticesOpen] = useState(false);
  const noticesId = useId();
  const equipment = Object.entries(hospital.equipment_status ?? {});
  const hasData = hospital.doctors_count !== undefined || equipment.length > 0 || Boolean(hospital.operating_hours || hospital.hira_notices?.length);
  if (!hasData) {
    return (
      <section className="shrink-0 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
        <h3 className="text-sm font-bold text-slate-700">의료기관 현황</h3>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          현재 심평원 의료진·장비 정보를 불러오지 못했습니다. 병상 현황과 병원 연락처를 먼저 확인해 주세요.
        </p>
        <span className="mt-3 inline-flex rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-slate-500 ring-1 ring-slate-200">정보 조회 중</span>
      </section>
    );
  }

  return (
    <section className="shrink-0 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2"><span aria-hidden="true" className="h-4 w-1.5 rounded-full bg-blue-500" /><h3 className="text-sm font-extrabold text-slate-800">의료기관 현황</h3></div>
        {hospital.hira_source === 'api' ? <span className="text-[9px] font-semibold text-slate-400">심평원 제공</span> : null}
      </div>
      <div className="space-y-3">
        {hospital.doctors_count !== undefined ? <div className="flex items-end justify-between border-b border-slate-100 pb-3"><span className="text-xs font-bold text-slate-500">등록 의료진 수</span><strong className="text-2xl leading-none text-blue-700">{hospital.doctors_count}<span className="ml-1 text-[10px] font-semibold text-slate-400">명</span></strong></div> : null}
        {hospital.operating_hours ? <div><p className="text-[10px] font-bold text-slate-400">운영 시간</p><p className="mt-1 text-xs font-semibold text-slate-700">{hospital.operating_hours}</p></div> : null}
        {equipment.length > 0 ? <div><p className="text-[10px] font-bold text-slate-500">의료장비 보유 현황</p><p className="mb-2 mt-1 text-[10px] leading-relaxed text-slate-400">필요한 검사·치료 장비가 등록된 병원인지 확인할 수 있어요.</p><ul className="flex flex-wrap gap-1.5">{equipment.map(([name, available]) => <li key={name} className={`flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-bold ring-1 ${available ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-slate-50 text-slate-400 ring-slate-200'}`}><span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${available ? 'bg-emerald-500' : 'bg-slate-300'}`} />{name} · {available ? '보유' : '미보유'}</li>)}</ul><p className="mt-2 text-[10px] leading-relaxed text-amber-700">현재 사용 가능 여부는 방문 전 병원에 확인해 주세요.</p></div> : <p className="text-[10px] text-slate-400">등록된 의료장비 정보를 확인하고 있습니다.</p>}
        {hospital.hira_notices?.length ? <div className="overflow-hidden rounded-xl bg-slate-50 ring-1 ring-slate-200"><button type="button" aria-expanded={isNoticesOpen} aria-controls={noticesId} onClick={() => setIsNoticesOpen((open) => !open)} className="flex w-full items-center justify-between px-3 py-2.5 text-left"><span className="text-[10px] font-bold text-slate-500">심평원 안내사항 {hospital.hira_notices.length}건</span><span aria-hidden="true" className="text-[10px] font-bold text-slate-400">{isNoticesOpen ? '접기 ▲' : '펼쳐보기 ▼'}</span></button>{isNoticesOpen ? <ul id={noticesId} className="space-y-1 border-t border-slate-200 px-3 py-2.5">{hospital.hira_notices.map((notice, index) => <li key={`${notice}-${index}`} className="text-xs text-slate-600">• {notice}</li>)}</ul> : null}</div> : null}
      </div>
    </section>
  );
}
