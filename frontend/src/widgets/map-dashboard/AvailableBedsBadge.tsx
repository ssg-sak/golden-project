interface AvailableBedsBadgeProps {
  availableBeds?: number;
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
  size = 'sm',
  variant = 'default',
  className = '',
}: AvailableBedsBadgeProps) {
  if (availableBeds === undefined) {
    return null;
  }

  const isEmpty = availableBeds <= 0;

  const toneClass =
    variant === 'inverse'
      ? isEmpty
        ? 'bg-white/15 text-rose-100 ring-white/20'
        : 'bg-white/15 text-emerald-100 ring-white/20'
      : isEmpty
        ? 'bg-rose-50 text-rose-700 ring-rose-200'
        : 'bg-emerald-50 text-emerald-700 ring-emerald-200';

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full font-bold ring-1 ${SIZE_CLASS[size]} ${toneClass} ${className}`}
      title="현재 응급실에 당장 수용 가능한 빈 베드 수입니다"
    >
      {isEmpty ? '빈자리 없음' : `빈자리: ${availableBeds}개`}
    </span>
  );
}
