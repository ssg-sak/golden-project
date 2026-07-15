import { API_BASE_URL } from '../config/api';

export interface TravelTimeResult {
  etaSeconds: number | null;
  distanceMeters: number | null;
  error: string | null;
}

interface RoutingEtaResponse {
  name: string;
  eta_seconds: number | null;
  distance_meters: number | null;
  error: string | null;
}

export async function fetchTravelTimeToHospital({
  originLat,
  originLng,
  hospitalName,
  hospitalLat,
  hospitalLng,
  signal,
}: {
  originLat: number;
  originLng: number;
  hospitalName: string;
  hospitalLat: number;
  hospitalLng: number;
  signal?: AbortSignal;
}): Promise<TravelTimeResult> {
  const response = await fetch(`${API_BASE_URL}/api/routing/eta`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    signal,
    body: JSON.stringify({
      origin_lat: originLat,
      origin_lng: originLng,
      destinations: [
        {
          name: hospitalName,
          lat: hospitalLat,
          lng: hospitalLng,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`ETA request failed: ${response.status}`);
  }

  const data = (await response.json()) as RoutingEtaResponse[];
  const first = data[0];

  if (!first) {
    return { etaSeconds: null, distanceMeters: null, error: '응답 없음' };
  }

  return {
    etaSeconds: first.eta_seconds,
    distanceMeters: first.distance_meters,
    error: first.error,
  };
}

export function formatEta(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `약 ${minutes.toLocaleString('ko-KR')}분`;
}

export function formatRoadDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters).toLocaleString('ko-KR')}m`;
  }

  return `${(meters / 1000).toLocaleString('ko-KR', {
    maximumFractionDigits: 1,
  })}km`;
}
