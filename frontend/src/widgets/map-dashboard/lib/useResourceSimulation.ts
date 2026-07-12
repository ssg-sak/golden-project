import { useEffect, useState } from 'react';

export interface ResourceRecommendation {
  pipeline: 'pediatric' | 'senior';
  cluster_id: number;
  location: { lat: number; lng: number };
  demand: number;
  nearby_hospitals: string[];
  nearby_count: number;
  resource_gap: {
    doctors_needed: number;
    mri_needed: boolean;
    ct_needed: boolean;
    avg_doctors_nearby: number;
    mri_coverage_ratio: number;
    priority_level: 'HIGH' | 'MEDIUM' | 'LOW';
  };
  recommendation: string;
  regionName?: string; // 역지오코딩으로 추가될 속성
}

export function useResourceSimulation() {
  const [recommendations, setRecommendations] = useState<ResourceRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}data/resource_recommendations.json`);
        if (!res.ok) throw new Error('데이터를 불러오지 못했습니다.');
        
        const rawData: ResourceRecommendation[] = await res.json();

        // 카카오 지오코더를 활용한 지역명 추출 (Kakao API 로드 확인)
        if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
          const geocoder = new window.kakao.maps.services.Geocoder();
          
          const geocodePromises = rawData.map((rec) => {
            return new Promise<ResourceRecommendation>((resolve) => {
              geocoder.coord2RegionCode(rec.location.lng, rec.location.lat, (result, status) => {
                if (status === window.kakao.maps.services.Status.OK) {
                  // 행정동(H) 우선 탐색, 없으면 법정동(B)
                  const adminRegion = result.find(r => r.region_type === 'H') || result[0];
                  resolve({ ...rec, regionName: adminRegion ? adminRegion.address_name : '대구광역시 (상세 지역 미상)' });
                } else {
                  resolve({ ...rec, regionName: '위치 확인 불가' });
                }
              });
            });
          });

          const dataWithRegion = await Promise.all(geocodePromises);
          if (isMounted) setRecommendations(dataWithRegion);
        } else {
          // 카카오 API 로드 전이거나 실패 시 기본값
          if (isMounted) setRecommendations(rawData);
        }
      } catch (e) {
        if (isMounted) setError(e instanceof Error ? e.message : '알 수 없는 오류');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  return { recommendations, loading, error };
}
