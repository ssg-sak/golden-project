import { HOSPITALS_FETCH_TIMEOUT_MS } from '../../shared/constants/circuit-breaker';
import { HOSPITALS_API_URL } from '../../shared/config/api';
import { fetchWithTimeout } from '../../shared/lib/fetch-with-timeout';
import type { HospitalRecord } from '../../shared/types/hospital';
import { normalizeHospitalLocations } from '../../shared/lib/canonical-hospitals';

function isHospitalRecord(value: unknown): value is HospitalRecord {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  const tierOk = row.tier === 1 || row.tier === 2 || row.tier === 3;
  const bedsOk =
    row.available_beds === undefined ||
    row.available_beds === null ||
    (typeof row.available_beds === 'number' && Number.isFinite(row.available_beds));
  const hvecOk =
    row.hvec === undefined ||
    row.hvec === null ||
    (typeof row.hvec === 'number' && Number.isFinite(row.hvec));
  const hvocOk =
    row.hvoc === undefined ||
    row.hvoc === null ||
    (typeof row.hvoc === 'number' && Number.isFinite(row.hvoc));
  const telOk =
    row.tel === undefined ||
    row.tel === null ||
    (typeof row.tel === 'string' && row.tel.trim().length > 0);

  return (
    typeof row.name === 'string' &&
    typeof row.lat === 'number' &&
    typeof row.lng === 'number' &&
    tierOk &&
    bedsOk &&
    hvecOk &&
    hvocOk &&
    telOk
  );
}

function parseHospitalPayload(payload: unknown): HospitalRecord[] {
  if (!Array.isArray(payload)) {
    throw new Error('병원 정보가 예상과 달라 최근 확인된 정보를 먼저 보여드립니다');
  }

  const hospitals = payload.filter(isHospitalRecord);
  const dropped = payload.length - hospitals.length;

  if (import.meta.env.DEV && dropped > 0) {
    console.warn(`[fetchHospitals] 병원 응답 데이터 검증 실패: ${dropped}건`);
  }

  if (dropped > 0) {
    throw new Error('일부 병원 정보가 예상과 달라 최근 확인된 정보를 먼저 보여드립니다');
  }

  if (hospitals.length === 0) {
    throw new Error('표시할 병원 정보가 없어 기본 병원 목록을 보여드립니다');
  }

  return hospitals;
}

import { ENV } from '../../shared/config/env';

/**
 * GET /api/hospitals — 3초 서킷 브레이커 적용.
 * @throws 네트워크·HTTP·JSON·스키마·빈 배열·타임아웃 오류
 */
export async function fetchHospitals(signal?: AbortSignal): Promise<HospitalRecord[]> {
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

  return normalizeHospitalLocations(parseHospitalPayload(payload));
}
