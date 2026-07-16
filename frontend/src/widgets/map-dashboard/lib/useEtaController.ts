import { create } from 'zustand';
import { API_BASE_URL } from '../../../shared/config/api';
import type { HospitalRecord } from '../../../shared/types/hospital';
import { ENV } from '../../../shared/config/env';

export interface EtaData {
  name: string;
  eta_seconds: number | null;
  distance_meters: number | null;
  error: string | null;
  source?: 'realtime' | 'cache' | 'stored' | string | null;
}

interface EtaState {
  etas: Record<string, EtaData>;
  isLoading: boolean;
  hasFallback: boolean;
  fetchEtas: (originLat: number, originLng: number, hospitals: HospitalRecord[]) => Promise<void>;
  clearEtas: () => void;
}

const MAX_ETA_HOSPITALS = 5;
const QUOTA_CLIENT_BLOCK_MS = 60 * 60 * 1000;

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let pendingRequestKey: string | null = null;
let activeRequestKey: string | null = null;
let quotaBlockedUntil = 0;

function getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const radiusKm = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return radiusKm * c;
}

function estimatedEta(originLat: number, originLng: number, hospital: HospitalRecord, error: string): EtaData {
  const directKm = getHaversineDistance(originLat, originLng, hospital.lat, hospital.lng);
  const roadKm = Math.max(directKm * 1.35, directKm);
  const etaSeconds = Math.max(60, Math.round((roadKm / 38) * 3600 + 180));
  return {
    name: hospital.name,
    eta_seconds: etaSeconds,
    distance_meters: Math.round(roadKm * 1000),
    error,
    source: 'stored',
  };
}

function selectRealtimeCandidates(originLat: number, originLng: number, hospitals: HospitalRecord[]): HospitalRecord[] {
  return hospitals
    .filter((hospital) => Number.isFinite(hospital.lat) && Number.isFinite(hospital.lng) && hospital.lat > 0 && hospital.lng > 0)
    .map((hospital) => ({
      hospital,
      distanceKm: getHaversineDistance(originLat, originLng, hospital.lat, hospital.lng),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, MAX_ETA_HOSPITALS)
    .map((item) => item.hospital);
}

function requestKey(originLat: number, originLng: number, hospitals: HospitalRecord[]): string {
  const origin = `${originLat.toFixed(4)},${originLng.toFixed(4)}`;
  const destinations = hospitals
    .map((hospital) => `${hospital.name}:${hospital.lat.toFixed(4)},${hospital.lng.toFixed(4)}`)
    .join('|');
  return `${origin}->${destinations}`;
}

function quotaBlocked(): boolean {
  return Date.now() < quotaBlockedUntil;
}

function markQuotaBlocked(): void {
  quotaBlockedUntil = Date.now() + QUOTA_CLIENT_BLOCK_MS;
}

export const useEtaController = create<EtaState>((set, get) => ({
  etas: {},
  isLoading: false,
  hasFallback: false,

  clearEtas: () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    pendingRequestKey = null;
    activeRequestKey = null;
    set({ etas: {}, isLoading: false, hasFallback: false });
  },

  fetchEtas: async (originLat: number, originLng: number, hospitals: HospitalRecord[]) => {
    const targetHospitals = selectRealtimeCandidates(originLat, originLng, hospitals);
    if (targetHospitals.length === 0) return;

    const key = requestKey(originLat, originLng, targetHospitals);
    const currentEtas = get().etas;
    const hasEveryEta = targetHospitals.every((hospital) => currentEtas[hospital.name]);
    if (pendingRequestKey === key || activeRequestKey === key || hasEveryEta) return;

    if (quotaBlocked()) {
      const fallbackEtas = Object.fromEntries(
        targetHospitals.map((hospital) => [
          hospital.name,
          estimatedEta(originLat, originLng, hospital, 'quota_blocked'),
        ]),
      );
      set({ etas: { ...currentEtas, ...fallbackEtas }, isLoading: false, hasFallback: true });
      return;
    }

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    pendingRequestKey = key;
    set({ isLoading: true, hasFallback: false });

    debounceTimer = setTimeout(async () => {
      activeRequestKey = key;
      pendingRequestKey = null;

      try {
        if (ENV.IS_SIMULATION_MODE) {
          const fallbackEtas = Object.fromEntries(
            targetHospitals.map((hospital) => [
              hospital.name,
              estimatedEta(originLat, originLng, hospital, 'simulation_fallback'),
            ]),
          );
          set({ etas: { ...get().etas, ...fallbackEtas }, isLoading: false, hasFallback: true });
          return;
        }

        const response = await fetch(`${API_BASE_URL}/api/routing/eta`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            origin_lat: originLat,
            origin_lng: originLng,
            destinations: targetHospitals.map((hospital) => ({
              name: hospital.name,
              lat: hospital.lat,
              lng: hospital.lng,
            })),
          }),
        });

        if (!response.ok) {
          const fallbackEtas = Object.fromEntries(
            targetHospitals.map((hospital) => [
              hospital.name,
              estimatedEta(originLat, originLng, hospital, `http_${response.status}`),
            ]),
          );
          set({ etas: { ...get().etas, ...fallbackEtas }, isLoading: false, hasFallback: true });
          return;
        }

        const data: EtaData[] = await response.json();
        if (data.some((item) => item.error === 'quota_exceeded' || item.error === 'quota_blocked')) {
          markQuotaBlocked();
        }

        const responseEtas = Object.fromEntries(data.map((item) => [item.name, item]));
        const fallbackForMissing = Object.fromEntries(
          targetHospitals
            .filter((hospital) => !responseEtas[hospital.name])
            .map((hospital) => [
              hospital.name,
              estimatedEta(originLat, originLng, hospital, 'missing_response'),
            ]),
        );
        const mergedEtas = { ...get().etas, ...responseEtas, ...fallbackForMissing };
        const fallbackOccurred = data.some((item) => item.error !== null) || Object.keys(fallbackForMissing).length > 0;

        set({ etas: mergedEtas, isLoading: false, hasFallback: fallbackOccurred });
      } catch (error) {
        console.warn('[useEtaController] ETA request failed:', error);
        const fallbackEtas = Object.fromEntries(
          targetHospitals.map((hospital) => [
            hospital.name,
            estimatedEta(originLat, originLng, hospital, 'request_failed'),
          ]),
        );
        set({ etas: { ...get().etas, ...fallbackEtas }, isLoading: false, hasFallback: true });
      } finally {
        if (activeRequestKey === key) {
          activeRequestKey = null;
        }
      }
    }, 500);
  },
}));
