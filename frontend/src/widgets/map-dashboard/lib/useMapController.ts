import { useCallback, useState } from 'react';
import type { KakaoLatLng } from './geojson-to-kakao';
import { clampToDaeguBounds, isInsideDaeguBounds } from './daegu-map-bounds';

export const USER_LOCATION_LEVEL = 4;
export const MIN_LEVEL = 2;
export const MAX_LEVEL = 12;

function clampLevel(level: number): number {
  return Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, level));
}

export function useMapController(mapRef: React.MutableRefObject<kakao.maps.Map | null>) {
  const [userLocation, setUserLocation] = useState<KakaoLatLng | null>(null);
  const [locating, setLocating] = useState(false);

  const panMapTo = useCallback(
    (lat: number, lng: number, level: number, animateLevel = true) => {
      const map = mapRef.current;
      if (!map) return;

      const clamped = clampToDaeguBounds(lat, lng);
      map.panTo(new kakao.maps.LatLng(clamped.lat, clamped.lng));
      map.setLevel(clampLevel(level), { animate: animateLevel });
    },
    [mapRef],
  );

  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      alert('이 브라우저에서는 위치 찾기를 지원하지 않습니다.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const raw = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        if (!isInsideDaeguBounds(raw.lat, raw.lng)) {
          setLocating(false);
          alert(
            '현재 위치가 대구광역시 밖입니다. 본 서비스는 대구 행정동 응급 접근성 분석용입니다.',
          );
          return;
        }

        setUserLocation(raw);
        panMapTo(raw.lat, raw.lng, USER_LOCATION_LEVEL);
        setLocating(false);
      },
      () => {
        setLocating(false);
        alert('위치를 가져올 수 없습니다. 브라우저 위치 권한을 확인해 주세요.');
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  }, [panMapTo]);

  return {
    userLocation,
    locating,
    panMapTo,
    handleLocateMe,
  };
}
