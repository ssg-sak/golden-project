import type { HospitalTier } from '../../shared/types/hospital';
import { HOSPITAL_TIER_VISUAL } from '../../shared/lib/hospital-tier-visual';

interface TierBadgeProps {
  tier: HospitalTier;
}

export function TierBadge({ tier }: TierBadgeProps) {
  const visual = HOSPITAL_TIER_VISUAL[tier];

  return (
    <span
      className={`inline-flex rounded-sm px-3 py-1 text-xs font-bold text-white shadow-sm ${visual.iconBgClass}`}
    >
      {visual.label}
    </span>
  );
}
