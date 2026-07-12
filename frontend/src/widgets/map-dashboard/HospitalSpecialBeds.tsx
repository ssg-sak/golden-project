export function HospitalSpecialBeds({
  specialBeds,
}: {
  specialBeds?: Record<
    string,
    { available: number | null; total: number | null; is_available?: boolean | null }
  > | null;
}) {
  if (!specialBeds || Object.keys(specialBeds).length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
      <p className="mb-3 text-xs font-bold text-slate-600 dark:text-slate-300">특수 병상 여유 현황</p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm text-slate-600 dark:text-slate-300">
        {Object.entries(specialBeds).map(([name, data]) => {
          const isAvailable = data.is_available ?? (data.available !== null && data.available > 0);
          return (
            <div
              key={name}
              className="flex items-center justify-between gap-3 border-b border-slate-100 pb-1.5"
            >
              <dt className="text-[11px] font-medium tracking-tight text-slate-500 dark:text-slate-400">{name}</dt>
              <dd
                className={`text-[11px] font-bold ${
                  isAvailable ? 'text-emerald-600' : 'text-slate-400'
                }`}
              >
                {data.available === null ? (data.is_available ? '가능' : '-') : `${data.available}`}
                <span className="text-[10px] font-normal text-slate-400">
                  {data.total !== null ? `/${data.total}` : ''}
                </span>
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
