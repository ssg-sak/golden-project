interface AvailableBedsBadgeProps {
  availableBeds?: number;
  totalBeds?: number | null;
  size?: 'sm' | 'md';
  variant?: 'default' | 'inverse';
  className?: string;
}

const SIZE_CLASS = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-1 text-xs',
} as const;

export function AvailableBedsBadge({
  availableBeds,
  totalBeds,
  size = 'sm',
  variant = 'default',
  className = '',
}: AvailableBedsBadgeProps) {
  if (availableBeds === undefined) {
    return null;
  }

  const isEmpty = availableBeds <= 0;
  const ratio = typeof totalBeds === 'number' && totalBeds > 0 ? availableBeds / totalBeds : null;
  const congestion = isEmpty ? 'empty' : ratio === null ? 'unknown' : ratio >= 0.8 ? 'smooth' : ratio >= 0.5 ? 'moderate' : 'crowded';
  const label = congestion === 'empty'
    ? '빈자리 없음'
    : congestion === 'smooth'
      ? `원활 · ${availableBeds}개`
      : congestion === 'moderate'
        ? `보통 · ${availableBeds}개`
        : congestion === 'crowded'
          ? `혼잡 · ${availableBeds}개`
          : `빈자리: ${availableBeds}개`;

  const toneClass =
    variant === 'inverse'
      ? congestion === 'empty' || congestion === 'crowded'
        ? 'bg-rose-500/20 text-rose-100 ring-rose-200/40'
        : congestion === 'moderate'
          ? 'bg-amber-400/20 text-amber-100 ring-amber-200/40'
          : congestion === 'unknown'
            ? 'bg-white/15 text-slate-100 ring-white/20'
            : 'bg-emerald-400/20 text-emerald-100 ring-emerald-200/40'
      : congestion === 'empty' || congestion === 'crowded'
        ? 'bg-rose-50 text-rose-700 ring-rose-200'
        : congestion === 'moderate'
          ? 'bg-amber-50 text-amber-800 ring-amber-200'
          : congestion === 'unknown'
            ? 'bg-slate-50 text-slate-600 ring-slate-200'
            : 'bg-emerald-50 text-emerald-700 ring-emerald-200';

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full font-bold ring-1 ${SIZE_CLASS[size]} ${toneClass} ${className}`}
      title={ratio === null ? '일반응급실 가용 병상 수' : `일반응급실 가용률 ${Math.round(ratio * 100)}%`}
    >
      {label}
    </span>
  );
}
