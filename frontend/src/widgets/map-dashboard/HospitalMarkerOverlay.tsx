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
  const { status, congestion } = resolveBedStatus(hospital);
  const isCrowded = status === 'unavailable' || congestion === 'crowded';
  const isModerate = congestion === 'moderate';

  const ringClass =
    isCrowded
      ? 'border-rose-500 ring-rose-200'
      : isModerate
        ? 'border-amber-500 ring-amber-200'
        : status === 'available'
          ? 'border-emerald-500 ring-emerald-200'
        : 'border-slate-400 ring-slate-200';

  const activeRingClass =
    isCrowded
      ? 'ring-rose-500'
      : isModerate
        ? 'ring-amber-500'
        : status === 'available'
          ? 'ring-emerald-500'
        : 'ring-slate-500';

  const dotClass =
    isCrowded
      ? 'bg-rose-500'
      : isModerate
        ? 'bg-amber-500'
        : status === 'available'
          ? 'bg-emerald-500'
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
          status === 'unavailable' ? '일반응급실 여유 없음' : congestion === 'crowded' ? '혼잡' : congestion === 'moderate' ? '보통' : status === 'available' ? '원활' : '확인 중'
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
