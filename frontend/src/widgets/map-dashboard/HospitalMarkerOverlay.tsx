import { CustomOverlayMap } from 'react-kakao-maps-sdk';

import { resolveBedStatus } from '../../shared/lib/bed-status';
import type { HospitalRecord } from '../../shared/types/hospital';

interface HospitalMarkerOverlayProps {
  hospital: HospitalRecord;
  position: { lat: number; lng: number };
  isSelected: boolean;
  onSelect: (hospital: HospitalRecord) => void;
}

export function HospitalMarkerOverlay({
  hospital,
  position,
  isSelected,
  onSelect,
}: HospitalMarkerOverlayProps) {
  const { status } = resolveBedStatus(hospital);

  const ringClass =
    status === 'available'
      ? 'border-green-500 ring-green-200'
      : status === 'unavailable'
        ? 'border-red-500 ring-red-200'
        : 'border-slate-400 ring-slate-200';

  const activeRingClass =
    status === 'available'
      ? 'ring-green-500'
      : status === 'unavailable'
        ? 'ring-red-500'
        : 'ring-slate-500';

  const dotClass =
    status === 'available'
      ? 'bg-green-500'
      : status === 'unavailable'
        ? 'bg-red-500'
        : 'bg-slate-400';

  return (
    <CustomOverlayMap
      position={position}
      clickable={true}
      xAnchor={0.5}
      yAnchor={0.5}
      zIndex={isSelected ? 6 : 4}
    >
      <div
        className={`pointer-events-auto flex cursor-pointer items-center gap-1.5 rounded-full border-2 bg-white px-3 py-1.5 shadow-lg transition-all duration-200 hover:scale-105 ${
          isSelected
            ? `ring-4 ${ringClass} ${activeRingClass} scale-105`
            : `ring-2 ${ringClass}`
        }`}
        onClick={(event) => {
          event.stopPropagation();
          onSelect(hospital);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelect(hospital);
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={`${hospital.name} — ${
          status === 'available' ? '진료 가능' : status === 'unavailable' ? '수용 불가' : '확인 중'
        }`}
        aria-pressed={isSelected}
        title={hospital.name}
      >
        <span className={`h-3 w-3 shrink-0 rounded-full ${dotClass}`} aria-hidden />
        <span className={`whitespace-nowrap text-sm font-bold tracking-tight ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
          {hospital.name}
        </span>
      </div>
    </CustomOverlayMap>
  );
}
