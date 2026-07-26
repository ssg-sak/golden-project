import { HOSPITALS_FETCH_TIMEOUT_MS } from '../../shared/constants/circuit-breaker';
import { HOSPITALS_API_URL } from '../../shared/config/api';
import { fetchWithTimeout } from '../../shared/lib/fetch-with-timeout';
import type { HospitalRecord } from '../../shared/types/hospital';
import { normalizeHospitalLocations } from '../../shared/lib/canonical-hospitals';

function isHospitalRecord(value: unknown): value is HospitalRecord {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  const tierOk = row.tier === 1 || row.tier === 2 || row.tier === 3;
  // 필수 필드(name, lat, lng, tier)만 검증하고, 나머지는 관대하게 넘어갑니다.
  return (
    typeof row.name === 'string' &&
    typeof row.lat === 'number' &&
    typeof row.lng === 'number' &&
    tierOk
  );
}

function parseHospitalPayload(payload: unknown): HospitalRecord[] {
  if (!Array.isArray(payload)) {
    throw new Error('병원 정보가 예상과 달라 최근 확인된 정보를 먼저 보여드립니다');
  }

  const hospitals = payload.filter((item) => {
    const valid = isHospitalRecord(item);
    if (!valid && import.meta.env.DEV) console.warn('[isHospitalRecord failed]', item);
    return valid;
  });
  const dropped = payload.length - hospitals.length;

  if (import.meta.env.DEV && dropped > 0) {
    console.warn(`[fetchHospitals] 병원 응답 데이터 검증 실패: ${dropped}건`);
  }

  if (hospitals.length === 0) {
    throw new Error('표시할 병원 정보가 없어 기본 병원 목록을 보여드립니다');
  }

  return hospitals;
}

import { ENV } from '../../shared/config/env';

export interface HospitalFetchResult {
  hospitals: HospitalRecord[];
  cacheUpdatedAt: string | null;
  cacheStale: boolean;
}

/**
 * GET /api/hospitals — 3초 서킷 브레이커 적용.
 * @throws 네트워크·HTTP·JSON·스키마·빈 배열·타임아웃 오류
 */
export async function fetchHospitals(signal?: AbortSignal): Promise<HospitalFetchResult> {
  if (ENV.IS_SIMULATION_MODE) {
    throw new Error('네트워크 연결이 불안정해 최근 병원 정보를 먼저 보여드립니다');
  }

  let response: Response;

  try {
    response = await fetchWithTimeout(HOSPITALS_API_URL, { signal }, HOSPITALS_FETCH_TIMEOUT_MS);
  } catch (error) {
    if (error instanceof Error && error.name === 'FetchTimeoutError') {
      throw error;
    }
    throw new Error('네트워크 연결이 불안정해 최근 병원 정보를 먼저 보여드립니다');
  }

  if (!response.ok) {
    throw new Error('병원 정보 서버 응답이 원활하지 않아 최근 병원 정보를 먼저 보여드립니다');
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error('병원 정보 응답을 읽지 못해 최근 확인된 정보를 먼저 보여드립니다');
  }

  return {
    hospitals: normalizeHospitalLocations(parseHospitalPayload(payload)),
    cacheUpdatedAt: response.headers.get('X-Bed-Cache-Updated-At'),
    cacheStale: response.headers.get('X-Bed-Cache-Stale') === 'true',
  };
}
