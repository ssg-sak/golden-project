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

    // 드래그 및 줌(마우스 휠 포함) 무조건 강제 활성화 (이중 방어)
    map.setDraggable(true);
    map.setZoomable(true);
    
    // 카카오맵 내부적으로 휠 이벤트를 온전히 받도록 속성 덮어쓰기
    if (typeof map.setKeyboardShortcuts === 'function') {
      map.setKeyboardShortcuts(true);
    }
    
    map.setMinLevel(minLevel);
    map.setMaxLevel(maxLevel);
    map.setLevel(defaultLevel);
  }, [map, defaultLevel, minLevel, maxLevel]);

  return null;
}
