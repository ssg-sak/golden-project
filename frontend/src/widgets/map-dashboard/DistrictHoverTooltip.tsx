import { CustomOverlayMap } from 'react-kakao-maps-sdk';

import { toAdmNmKey } from '../../shared/types/vulnerability';

interface DistrictHoverTooltipProps {
  admNm: string;
  centerLat: number;
  centerLng: number;
  vulnerabilityIndex: number;
}

export function DistrictHoverTooltip({
  admNm,
  centerLat,
  centerLng,
  vulnerabilityIndex,
}: DistrictHoverTooltipProps) {
  return (
    <CustomOverlayMap
      position={{ lat: centerLat, lng: centerLng }}
      clickable={false}
      xAnchor={0.5}
      yAnchor={1.2}
      zIndex={6}
    >
      <div className="pointer-events-none whitespace-nowrap rounded-lg bg-slate-900/92 px-3 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur-sm">
        <span className="font-semibold">{toAdmNmKey(admNm)}</span>
        <span className="mx-1.5 text-slate-400">·</span>
        <span>사각지대 지수 {vulnerabilityIndex.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}</span>
      </div>
    </CustomOverlayMap>
  );
}
