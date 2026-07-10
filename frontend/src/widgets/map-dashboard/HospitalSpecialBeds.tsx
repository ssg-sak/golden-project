export function HospitalSpecialBeds({
  specialBeds,
}: {
  specialBeds?: Record<string, number> | null;
}) {
  if (!specialBeds || Object.keys(specialBeds).length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
      <p className="mb-3 text-xs font-bold text-slate-600 dark:text-slate-300">특수 병상 여유 현황</p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm text-slate-600 dark:text-slate-300">
        {Object.entries(specialBeds).map(([name, count]) => {
          const isAvailable = count > 0;
          return (
            <div
              key={name}
              className="flex items-center justify-between gap-3 border-b border-slate-100 pb-1.5"
            >
              <dt className="text-[11px] font-medium tracking-tight text-slate-500 dark:text-slate-400">{name}</dt>
              <dd
                className={`text-xs font-bold ${
                  isAvailable ? 'text-emerald-600' : 'text-slate-400'
                }`}
              >
                {count > 0 ? `${count}개` : '0개'}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
