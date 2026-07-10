import type { HospitalTier } from '../../shared/types/hospital';
import { HOSPITAL_TIER_VISUAL } from '../../shared/lib/hospital-tier-visual';

interface TierBadgeProps {
  tier: HospitalTier;
}

export function TierBadge({ tier }: TierBadgeProps) {
  const visual = HOSPITAL_TIER_VISUAL[tier];

  return (
    <span
      className={`inline-flex rounded-full bg-gradient-to-r px-3 py-1 text-xs font-bold text-white shadow-sm ${visual.gradientClass}`}
    >
      {visual.label}
    </span>
  );
}
