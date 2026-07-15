import type { HospitalRecord } from '../../shared/types/hospital';
import { hospitalAvailableBeds, hospitalTierBadge, isMoonlightHospital } from '../../shared/types/hospital';

import { AvailableBedsBadge } from './AvailableBedsBadge';
import { HospitalActionButtons } from './HospitalActionButtons';

interface HospitalPopupCardProps {
  hospital: HospitalRecord;
  onClose: () => void;
}

function badgeClassName(tier: HospitalRecord['tier']): string {
  if (tier === 1) return 'bg-red-100 text-red-800';
  if (tier === 2) return 'bg-blue-100 text-blue-800';
  return 'bg-amber-100 text-amber-800';
}

export function HospitalPopupCard({ hospital, onClose }: HospitalPopupCardProps) {
  const badge = hospitalTierBadge(hospital.tier);
  const availableBeds = hospitalAvailableBeds(hospital);
  const isMoonlight = isMoonlightHospital(hospital);

  return (
    <div className="min-w-[240px] rounded-xl border border-gray-100 bg-white p-3.5 shadow-lg">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold leading-snug text-gray-900">{hospital.name}</h3>
            <span
              className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide ${badgeClassName(hospital.tier)}`}
            >
              [{badge}]
            </span>
            {isMoonlight ? null : (
              <AvailableBedsBadge availableBeds={availableBeds} totalBeds={hospital.total_hvec} />
            )}
            {isMoonlight ? (
              <span className="inline-flex shrink-0 rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] font-extrabold text-cyan-800 ring-1 ring-cyan-200">
                야간·휴일 소아진료
              </span>
            ) : null}
          </div>
          {hospital.address && (
            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">{hospital.address}</p>
          )}
        </div>
        <button
          type="button"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
          aria-label="병원 정보 닫기"
        >
          ×
        </button>
      </div>
      <HospitalActionButtons
        hospitalName={hospital.name}
        lat={hospital.lat}
        lng={hospital.lng}
      />
    </div>
  );
}
