import { useState, useEffect } from 'react';

/**
 * 위도/경도를 받아 카카오 로컬 API를 통해 지번/도로명 주소로 변환하는 Hook
 */
export function useReverseGeocode(lat: number | undefined, lng: number | undefined) {
  const [address, setAddress] = useState<string>('주소 확인 중...');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!lat || !lng) {
      setAddress('위치 정보 없음');
      setLoading(false);
      return;
    }

    if (!window.kakao || !window.kakao.maps || !window.kakao.maps.services) {
      setAddress('카카오 지도 API 로드 실패');
      setLoading(false);
      return;
    }

    setLoading(true);
    const geocoder = new kakao.maps.services.Geocoder();
    
    geocoder.coord2Address(lng, lat, (result, status) => {
      if (status === kakao.maps.services.Status.OK && result[0]) {
        // 도로명 주소가 있으면 우선 사용, 없으면 지번 주소 사용
        const addressText = 
          result[0].road_address?.address_name || 
          result[0].address?.address_name || 
          '상세 주소 확인 불가';
          
        setAddress(addressText);
      } else {
        setAddress('주소 변환 실패');
        setError(new Error(`Geocoder status: ${status}`));
      }
      setLoading(false);
    });
  }, [lat, lng]);

  return { address, loading, error };
}
