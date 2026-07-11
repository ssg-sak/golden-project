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

      // 패널 개폐 등으로 인한 지도 컨테이너 사이즈 변경 동기화
      map.relayout();

      const clamped = clampToDaeguBounds(lat, lng);
      const targetLatLng = new kakao.maps.LatLng(clamped.lat, clamped.lng);
      
      if (window.innerWidth < 1024) {
        // 모바일 바텀 시트를 피하기 위해 지도의 중심을 마커보다 남쪽으로 이동
        // 줌 레벨에 따른 대략적인 위도 오프셋 (레벨 3에서 픽셀당 약 0.00001도)
        const levelScale = Math.pow(2, clampLevel(level) - 3);
        const latOffsetPerPixel = 0.00001 * levelScale;
        const pixelOffset = window.innerHeight * 0.25; // 화면의 25%
        
        const offsetLat = targetLatLng.getLat() - (pixelOffset * latOffsetPerPixel);
        const offsetLatLng = new kakao.maps.LatLng(offsetLat, targetLatLng.getLng());
        
        map.panTo(offsetLatLng);
      } else {
        map.panTo(targetLatLng);
      }
      
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
