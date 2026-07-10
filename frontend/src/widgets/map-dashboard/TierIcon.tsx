import type { HospitalTier } from '../../shared/types/hospital';
import { HOSPITAL_TIER_VISUAL } from '../../shared/lib/hospital-tier-visual';

const SIZE_CLASS = {
  xs: 'h-5 w-5 text-[10px]',
  sm: 'h-6 w-6 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-11 w-11 text-lg',
} as const;

interface TierIconProps {
  tier: HospitalTier;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
}

export function TierIcon({ tier, size = 'sm', className = '' }: TierIconProps) {
  const visual = HOSPITAL_TIER_VISUAL[tier];

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold leading-none ${SIZE_CLASS[size]} ${visual.iconBgClass} ${visual.iconTextClass} ${className}`}
      aria-hidden
    >
      {visual.glyph}
    </span>
  );
}
