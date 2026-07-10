import { useEffect, useRef } from 'react';
import { useMap } from 'react-kakao-maps-sdk';

interface MapInteractionProps {
  defaultLevel: number;
  minLevel: number;
  maxLevel: number;
}

/** SDK prop 동기화 이슈를 피하고 확대·축소·드래그를 명시적으로 활성화 */
export function MapInteraction({
  defaultLevel,
  minLevel,
  maxLevel,
}: MapInteractionProps) {
  const map = useMap();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!map || initializedRef.current) return;
    initializedRef.current = true;

    map.setDraggable(true);
    map.setZoomable(true);
    map.setMinLevel(minLevel);
    map.setMaxLevel(maxLevel);
    map.setLevel(defaultLevel);
  }, [map, defaultLevel, minLevel, maxLevel]);

  return null;
}
