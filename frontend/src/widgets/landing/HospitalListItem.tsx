import { formatDistanceKm, type HospitalWithDistance } from '../../shared/lib/distance';
import { hospitalTierLabel } from '../../shared/lib/hospital-tier-visual';
import { hospitalDisplayAddress } from '../../shared/types/hospital';
import { TierIcon } from '../map-dashboard/TierIcon';

import { BedStatusBadge } from './BedStatusBadge';
import { KakaoNavButton } from './KakaoNavButton';

interface HospitalListItemProps {
  hospital: HospitalWithDistance;
  rank: number;
}

export function HospitalListItem({ hospital, rank }: HospitalListItemProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:bg-slate-50 sm:p-5">
      <div className="flex items-start gap-3">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700"
          aria-label={`${rank}번째로 가까운 병원`}
        >
          {rank}
        </span>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-base font-bold leading-snug text-slate-900 sm:text-lg">
                {hospital.name}
              </h2>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 sm:text-sm">
                <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                  <TierIcon tier={hospital.tier} size="xs" />
                  {hospitalTierLabel(hospital.tier)}
                </span>
                <span aria-hidden>·</span>
                <span className="font-semibold text-indigo-700">
                  약 {formatDistanceKm(hospital.distanceKm)}
                </span>
              </p>
            </div>
            <BedStatusBadge hospital={hospital} />
          </div>

          <p className="text-sm leading-relaxed text-slate-600">{hospitalDisplayAddress(hospital)}</p>

          <div className="pt-2">
            <KakaoNavButton hospitalName={hospital.name} lat={hospital.lat} lng={hospital.lng} />
          </div>
        </div>
      </div>
    </article>
  );
}
