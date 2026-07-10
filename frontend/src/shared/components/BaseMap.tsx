import { useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import { Map, ZoomControl } from 'react-kakao-maps-sdk';

import { enforceDaeguMapBounds } from '../../widgets/map-dashboard/lib/daegu-map-bounds';
import { MapInteraction } from '../../widgets/map-dashboard/MapInteraction';
import { MapRelayout } from '../../widgets/map-dashboard/MapRelayout';
import type { KakaoLatLng } from '../../widgets/map-dashboard/lib/geojson-to-kakao';

import { MAP_DAEGU_CENTER, MAP_MIN_LEVEL, MAP_MAX_LEVEL, MAP_DEFAULT_LEVEL } from '../constants/map';

export interface BaseMapProps {
  children?: ReactNode;
  hud?: ReactNode;
  center?: KakaoLatLng;
  onMapCreate?: (map: kakao.maps.Map) => void;
  onClick?: () => void;
  onDragEnd?: (map: kakao.maps.Map) => void;
}

export function BaseMap({
  children,
  hud,
  center = MAP_DAEGU_CENTER,
  onMapCreate,
  onClick,
  onDragEnd,
}: BaseMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMapDragEnd = useCallback((map: kakao.maps.Map) => {
    enforceDaeguMapBounds(map);
    onDragEnd?.(map);
  }, [onDragEnd]);

  return (
    <div
      ref={containerRef}
      className="relative h-full min-h-0 flex-1 w-full touch-pan-y lg:touch-auto"
      onWheelCapture={(event) => {
        if (window.matchMedia('(min-width: 1024px)').matches) {
          event.stopPropagation();
        }
      }}
    >
      <Map
        center={center}
        draggable
        zoomable
        scrollwheel
        keyboardShortcuts
        isPanto
        style={{ width: '100%', height: '100%', borderRadius: '0.75rem' }}
        onCreate={onMapCreate}
        onClick={onClick}
        onDragEnd={handleMapDragEnd}
      >
        <MapInteraction
          defaultLevel={MAP_DEFAULT_LEVEL}
          minLevel={MAP_MIN_LEVEL}
          maxLevel={MAP_MAX_LEVEL}
        />
        <MapRelayout containerRef={containerRef} />
        <ZoomControl position="RIGHT" />
        {children}
      </Map>
      {hud}
    </div>
  );
}
