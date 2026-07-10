import { create } from 'zustand';
import { API_BASE_URL } from '../../../shared/config/api';
import type { HospitalRecord } from '../../../shared/types/hospital';

export interface EtaData {
  name: string;
  eta_seconds: number | null;
  distance_meters: number | null;
  error: string | null;
}

interface EtaState {
  etas: Record<string, EtaData>;
  isLoading: boolean;
  hasFallback: boolean; // API 키가 없거나 쿼터 초과 등
  fetchEtas: (originLat: number, originLng: number, hospitals: HospitalRecord[]) => Promise<void>;
  clearEtas: () => void;
}

// 상위 몇 개까지만 ETA를 요청할 것인가? (API 쿼터 방어)
const MAX_ETA_HOSPITALS = 10;
// 디바운스용 타이머 ID
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

// Haversine 거리 계산 함수
function getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const useEtaController = create<EtaState>((set) => ({
  etas: {},
  isLoading: false,
  hasFallback: false,

  clearEtas: () => set({ etas: {}, isLoading: false, hasFallback: false }),

  fetchEtas: async (originLat: number, originLng: number, hospitals: HospitalRecord[]) => {
    // 디바운스 2초 적용
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // 1. 직선거리 기반으로 상위 10개 병원만 추려내기 (단, 유효한 좌표를 가진 병원만)
    const validHospitals = hospitals.filter(h => h.lat && h.lng && h.lat > 0 && h.lng > 0);
    
    const sortedHospitals = [...validHospitals].sort((a, b) => {
      const distA = getHaversineDistance(originLat, originLng, a.lat, a.lng);
      const distB = getHaversineDistance(originLat, originLng, b.lat, b.lng);
      return distA - distB;
    });

    const targetHospitals = sortedHospitals.slice(0, MAX_ETA_HOSPITALS).map(h => ({
      name: h.name,
      lat: h.lat,
      lng: h.lng,
    }));

    if (targetHospitals.length === 0) return;

    set({ isLoading: true, hasFallback: false });

    debounceTimer = setTimeout(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/routing/eta`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            origin_lat: originLat,
            origin_lng: originLng,
            destinations: targetHospitals,
          }),
        });

        if (!response.ok) {
          throw new Error('ETA Fetch failed');
        }

        const data: EtaData[] = await response.json();
        
        const newEtas: Record<string, EtaData> = {};
        let successCount = 0;

        data.forEach(item => {
          newEtas[item.name] = item;
          // 에러가 없고 eta_seconds가 정상이면 성공 카운트 증가
          if (!item.error && item.eta_seconds !== null) {
            successCount++;
          }
        });

        // 하나라도 성공한 병원이 있다면 fallback(주황 배너)을 띄우지 않습니다.
        const fallbackOccurred = (successCount === 0);

        set({ etas: newEtas, isLoading: false, hasFallback: fallbackOccurred });
        
      } catch (error) {
        console.warn('[useEtaController] ETA Request Failed:', error);
        set({ isLoading: false, hasFallback: true });
      }
    }, 2000); // 2초 대기
  },
}));
