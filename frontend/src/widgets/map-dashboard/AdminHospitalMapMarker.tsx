import { MapMarker } from 'react-kakao-maps-sdk';

import type { HospitalRecord } from '../../shared/types/hospital';

import { markerImageForTier } from './lib/kakao-marker-images';

interface AdminHospitalMapMarkerProps {
  hospital: HospitalRecord;
  isSelected: boolean;
  isHighlighted?: boolean;
  onSelect: (hospital: HospitalRecord) => void;
}

/** 정책 분석 모드 — tier 색 마커, 실제 좌표에 배치 */
export function AdminHospitalMapMarker({
  hospital,
  isSelected,
  isHighlighted = false,
  onSelect,
}: AdminHospitalMapMarkerProps) {
  const image = markerImageForTier(hospital.tier);

  return (
    <MapMarker
      position={{ lat: hospital.lat, lng: hospital.lng }}
      image={image}
      zIndex={isSelected ? 9 : isHighlighted ? 7 : 5}
      onClick={() => onSelect(hospital)}
      title={isHighlighted ? `${hospital.name} (행정동 기준 추천)` : hospital.name}
    />
  );
}
