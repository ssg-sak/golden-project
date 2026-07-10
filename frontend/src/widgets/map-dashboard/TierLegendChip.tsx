import type { HospitalTier } from '../../shared/types/hospital';
import { HOSPITAL_TIER_VISUAL } from '../../shared/lib/hospital-tier-visual';

import { TierIcon } from './TierIcon';

interface TierLegendChipProps {
  tier: HospitalTier;
}

export function TierLegendChip({ tier }: TierLegendChipProps) {
  const visual = HOSPITAL_TIER_VISUAL[tier];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${visual.chipClass} ${visual.chipTextClass}`}
    >
      <TierIcon tier={tier} size="xs" />
      {visual.label}
    </span>
  );
}
