import { CustomOverlayMap } from 'react-kakao-maps-sdk';

import { bedReportMarkerTone, resolveBedStatus } from '../../shared/lib/bed-status';
import type { HospitalRecord } from '../../shared/types/hospital';
import { isMoonlightHospital } from '../../shared/types/hospital';

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
  const { status, count, congestion } = resolveBedStatus(hospital);
  const isMoonlight = isMoonlightHospital(hospital);
  const markerTone = bedReportMarkerTone(hospital);
  const statusLabel =
    status === 'reported-bed-zero'
      ? '일반응급실 가용병상 0 보고'
      : congestion === 'crowded'
        ? '혼잡'
        : congestion === 'moderate'
          ? '보통'
          : status === 'reported-bed-positive'
            ? `일반응급실 가용병상 ${count ?? 1}개 이상 보고`
            : '일반응급실 병상정보 미확인';
  const ariaLabel = isMoonlight
    ? `${hospital.name} 야간·휴일 소아진료 기관`
    : `${hospital.name} ${statusLabel}`;

  const ringClass =
    markerTone === 'moonlight'
      ? 'border-cyan-500 ring-cyan-200'
      : markerTone === 'zero'
        ? 'border-rose-500 ring-rose-200'
        : markerTone === 'low-or-medium'
          ? 'border-orange-500 ring-orange-200'
          : markerTone === 'positive'
            ? 'border-emerald-500 ring-emerald-200'
            : 'border-slate-400 ring-slate-200';

  const activeRingClass =
    markerTone === 'moonlight'
      ? 'ring-cyan-500'
      : markerTone === 'zero'
        ? 'ring-rose-500'
        : markerTone === 'low-or-medium'
          ? 'ring-orange-500'
          : markerTone === 'positive'
            ? 'ring-emerald-500'
            : 'ring-slate-500';

  const dotClass =
    markerTone === 'moonlight'
      ? 'bg-cyan-500'
      : markerTone === 'zero'
        ? 'bg-rose-500'
        : markerTone === 'low-or-medium'
          ? 'bg-orange-500'
          : markerTone === 'positive'
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
        className={`pointer-events-auto flex cursor-pointer items-center gap-1.5 rounded-sm border-2 bg-white px-3 py-1.5 shadow-md transition-colors duration-200 hover:bg-slate-50 ${
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
        aria-label={ariaLabel}
        aria-pressed={isSelected}
        title={hospital.name}
      >
        <span className={`h-3 w-3 shrink-0 rounded-sm border border-white ${dotClass}`} aria-hidden />
        <span className={`whitespace-nowrap text-sm font-bold tracking-tight ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
          {hospital.name}
        </span>
      </div>
    </CustomOverlayMap>
  );
}
