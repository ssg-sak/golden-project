import { useEffect, useState } from 'react';

export interface ResourceRecommendation {
  pipeline: 'pediatric' | 'senior';
  cluster_id: number;
  location: { lat: number; lng: number };
  demand: number;
  scenario_coverage_ratio?: number;
  candidate_group?: 'main_daegu' | 'separate_region' | 'hold';
  candidate_type?: 'stable_main' | 'hold_review' | 'separate_region';
  nearby_hospitals: string[];
  nearby_count: number;
  resource_gap: {
    doctors_needed: number;
    mri_needed: boolean;
    ct_needed: boolean;
    avg_doctors_nearby: number;
    mri_coverage_ratio: number;
    ct_coverage_ratio?: number;
    priority_level: 'HIGH' | 'MEDIUM' | 'LOW' | 'REVIEW';
  };
  recommendation: string;
  disclaimer?: string;
  regionName?: string;
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
        const response = await fetch(`${import.meta.env.BASE_URL}data/resource_recommendations.json`);
        if (!response.ok) {
          throw new Error('자원 확충 시뮬레이션 데이터를 불러오지 못했습니다.');
        }

        const rawData = (await response.json()) as ResourceRecommendation[];

        if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
          const geocoder = new window.kakao.maps.services.Geocoder();
          const geocodePromises = rawData.map(
            (rec) =>
              new Promise<ResourceRecommendation>((resolve) => {
                geocoder.coord2RegionCode(rec.location.lng, rec.location.lat, (result, status) => {
                  if (status === window.kakao.maps.services.Status.OK) {
                    const adminRegion = result.find((row) => row.region_type === 'H') || result[0];
                    resolve({ ...rec, regionName: adminRegion ? adminRegion.address_name : '대구광역시 세부 지역 미상' });
                    return;
                  }
                  resolve({ ...rec, regionName: '위치 확인 불가' });
                });
              }),
          );

          const dataWithRegion = await Promise.all(geocodePromises);
          if (isMounted) setRecommendations(dataWithRegion);
        } else if (isMounted) {
          setRecommendations(rawData);
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
