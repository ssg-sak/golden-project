import { memo, useState } from 'react';
import { Polygon } from 'react-kakao-maps-sdk';

import type { DistrictPolygonShape } from './lib/geojson-to-kakao';

const SELECTED_STROKE = '#1d4ed8';

interface DistrictPolygonProps {
  shape: DistrictPolygonShape;
  strokeColor: string;
  fillColor: string;
  fillOpacity: number;
  isSelected: boolean;
  onSelect: (admNm: string) => void;
  onHoverChange: (admNm: string | null) => void;
}

export const DistrictPolygon = memo(function DistrictPolygon({
  shape,
  strokeColor,
  fillColor,
  fillOpacity,
  isSelected,
  onSelect,
  onHoverChange,
}: DistrictPolygonProps) {
  const [hovered, setHovered] = useState(false);

  const strokeWeight = isSelected ? 4 : hovered ? 3.5 : 1.5;

  return (
    <Polygon
      path={shape.path}
      strokeWeight={strokeWeight}
      strokeColor={isSelected ? SELECTED_STROKE : strokeColor}
      strokeOpacity={hovered || isSelected ? 1 : 0.85}
      strokeStyle="solid"
      fillColor={fillColor}
      fillOpacity={isSelected ? 0.82 : hovered ? fillOpacity + 0.08 : fillOpacity}
      onClick={() => onSelect(shape.admNm)}
      onMouseover={() => {
        setHovered(true);
        onHoverChange(shape.admNm);
      }}
      onMouseout={() => {
        setHovered(false);
        onHoverChange(null);
      }}
    />
  );
});
