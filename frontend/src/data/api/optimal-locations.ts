import { fetchWithTimeout } from '../../shared/lib/fetch-with-timeout';
import type { OptimalLocation } from '../../widgets/map-dashboard/lib/useOptimalLocationsStore';

const OPTIMAL_LOCATIONS_API_URL = 'http://localhost:8000/api/optimal-locations';
const OPTIMAL_LOCATIONS_FETCH_TIMEOUT_MS = 5000;

/**
 * 백엔드 서버에서 AI 분석 최적 거점 데이터를 가져옵니다.
 */
export async function fetchOptimalLocationsApi(signal?: AbortSignal): Promise<OptimalLocation[]> {
  try {
    const response = await fetchWithTimeout(
      OPTIMAL_LOCATIONS_API_URL,
      { signal },
      OPTIMAL_LOCATIONS_FETCH_TIMEOUT_MS
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch optimal locations: ${response.status}`);
    }
    
    const data: OptimalLocation[] = await response.json();
    return data;
  } catch (error: unknown) {
    console.error('[fetchOptimalLocationsApi] Error:', error);
    // 외부 API나 백엔드 연동 실패 시 빈 배열로 우아하게 성능 저하 (UI 크래시 방지)
    return [];
  }
}
