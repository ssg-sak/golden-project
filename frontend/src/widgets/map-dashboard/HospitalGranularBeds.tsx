import type { HospitalRecord } from '../../shared/types/hospital';
import { hospitalTotalBedsIsInvalid } from '../../shared/types/hospital';

interface BedValue {
  title: string;
  available?: number | null;
  total?: number | null;
  isAvailable?: boolean | null;
}

function getCongestion({ available, total, isAvailable }: BedValue) {
  if (typeof isAvailable === 'boolean') {
    return {
      label: isAvailable ? '가능' : '불가',
      textColor: isAvailable ? 'text-emerald-700' : 'text-rose-700',
      ringColor: isAvailable ? 'ring-emerald-200' : 'ring-rose-200',
      bg: isAvailable ? 'bg-emerald-50' : 'bg-rose-50',
      ratio: total != null ? `가능/${total}` : isAvailable ? '가능' : '-',
    };
  }

  if (available == null || available < 0) {
    return { label: '미제공', textColor: 'text-slate-400', ringColor: 'ring-slate-200', bg: 'bg-slate-50', ratio: '-' };
  }
  if (total == null || total <= 0) {
    const hasRoom = available > 0;
    return {
      label: hasRoom ? '가능' : '여유 없음',
      textColor: hasRoom ? 'text-emerald-700' : 'text-rose-700',
      ringColor: hasRoom ? 'ring-emerald-200' : 'ring-rose-200',
      bg: hasRoom ? 'bg-emerald-50' : 'bg-rose-50',
      ratio: `${available}`,
    };
  }

  const ratioValue = available / total;
  if (ratioValue < 0.5) {
    return { label: '혼잡', textColor: 'text-rose-700', ringColor: 'ring-rose-200', bg: 'bg-rose-50', ratio: `${available}/${total}` };
  }
  if (ratioValue < 0.8) {
    return { label: '지연', textColor: 'text-amber-700', ringColor: 'ring-amber-200', bg: 'bg-amber-50', ratio: `${available}/${total}` };
  }
  return { label: '원활', textColor: 'text-emerald-700', ringColor: 'ring-emerald-200', bg: 'bg-emerald-50', ratio: `${available}/${total}` };
}

function BedItem(props: BedValue) {
  const { label, textColor, ringColor, bg, ratio } = getCongestion(props);
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-100 bg-white px-1 py-3 shadow-sm">
      <span className="text-[10px] font-bold tracking-tight text-slate-500">{props.title}</span>
      <div className={`flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${ringColor} ${bg} ${textColor}`}>
        {label}
      </div>
      <span className="mt-0.5 text-[11px] font-extrabold text-slate-700">{ratio}</span>
    </div>
  );
}

export function HospitalGranularBeds({ hospital }: { hospital: HospitalRecord }) {
  const special = hospital.special_beds;
  const items: BedValue[] = [
    { title: '응급실일반', available: hospital.hvec, total: hospital.total_hvec },
    { title: '응급실소아', available: hospital.hvoc, total: hospital.total_hvoc },
    { title: '분만실', available: special?.['분만실']?.available, total: special?.['분만실']?.total, isAvailable: special?.['분만실']?.is_available },
    { title: '음압격리', available: special?.['음압격리']?.available, total: special?.['음압격리']?.total },
    { title: '일반격리', available: special?.['일반격리']?.available, total: special?.['일반격리']?.total },
    { title: '코호트격리', available: special?.['코호트격리']?.available, total: special?.['코호트격리']?.total },
  ];

  return (
    <section className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-slate-700 dark:text-slate-200">실시간 응급 병상 현황</p>
          <p className="mt-1 text-[10px] text-slate-500">국립중앙의료원 공개 현황 · 이동 전 병원에 확인해 주세요.</p>
        </div>
        {hospitalTotalBedsIsInvalid(hospital) ? <span className="text-[10px] font-bold text-amber-600">데이터 불일치 주의</span> : null}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {items.map((item) => <BedItem key={item.title} {...item} />)}
      </div>
      {hospital.realtime_source === 'mock' ? <p className="mt-3 text-[10px] text-slate-400">데모 데이터</p> : null}
    </section>
  );
}
