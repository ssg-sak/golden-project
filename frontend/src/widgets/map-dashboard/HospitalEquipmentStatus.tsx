export function HospitalEquipmentStatus({
  equipmentStatus,
}: {
  equipmentStatus?: Record<string, boolean> | null;
}) {
  if (!equipmentStatus || Object.keys(equipmentStatus).length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
      <p className="mb-3 text-xs font-bold text-slate-600 dark:text-slate-300">주요 의료 장비 현황</p>
      <div className="flex flex-wrap gap-2">
        {Object.entries(equipmentStatus).map(([name, isAvailable]) => (
          <span
            key={name}
            className={`inline-flex items-center rounded-md px-2 py-1 text-[11px] font-semibold ring-1 ring-inset ${
              isAvailable
                ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                : 'bg-rose-50 text-rose-700 ring-rose-600/20'
            }`}
          >
            <span className="mr-1">{name}</span>
            <span className={isAvailable ? 'text-emerald-600' : 'text-rose-600'}>
              {isAvailable ? '가용' : '불가/미지원'}
            </span>
          </span>
        ))}
      </div>
    </section>
  );
}
