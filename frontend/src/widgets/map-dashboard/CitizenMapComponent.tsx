import { useCallback, useEffect, useMemo, useRef } from 'react';

import { Map, MapMarker, ZoomControl } from 'react-kakao-maps-sdk';

import type { UserLocation } from '../../shared/hooks/useUserLocation';
import type { HospitalRecord } from '../../shared/types/hospital';

import { HospitalMarkerOverlay } from './HospitalMarkerOverlay';
import { MapInteraction } from './MapInteraction';
import { MapRelayout } from './MapRelayout';
import { SelectedHospitalPin } from './SelectedHospitalPin';
import { enforceDaeguMapBounds } from './lib/daegu-map-bounds';
import { filterByCareTarget } from './lib/hospital-filter';
import type { KakaoLatLng } from './lib/geojson-to-kakao';
import { userLocationMarkerImage } from './lib/kakao-marker-images';

const DAEGU_CENTER: KakaoLatLng = { lat: 35.8714, lng: 128.6014 };
const DEFAULT_LEVEL = 7;
const SELECTED_LEVEL = 4;
const USER_LOCATION_LEVEL = 5;
const MIN_LEVEL = 2;
const MAX_LEVEL = 12;

function clampLevel(level: number): number {
  return Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, level));
}

interface CitizenMapComponentProps {
  hospitals: HospitalRecord[];
  selectedHospital: HospitalRecord | null;
  onHospitalSelect: (hospital: HospitalRecord) => void;
  userLocation: UserLocation | null;
  showAvailableOnly: boolean;
  careTarget: 'all' | 'adult' | 'pediatric' | 'senior';
}

export function CitizenMapComponent({
  hospitals,
  selectedHospital,
  onHospitalSelect,
  userLocation,
  showAvailableOnly,
  careTarget,
}: CitizenMapComponentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<kakao.maps.Map | null>(null);
  const lastPannedUserRef = useRef<string | null>(null);
  const lastPannedHospitalRef = useRef<string | null>(null);

  // 진료대상 및 병상 여부에 따른 마커 필터링
  const visibleHospitals = useMemo(() => {
    let filtered = hospitals;

    // 1) 병상(available) 필터
    if (showAvailableOnly) {
      filtered = filtered.filter((h) => (h.available_beds ?? 0) > 0);
    }

    // 2) 진료대상(careTarget) 공통 필터 적용
    return filterByCareTarget(filtered, careTarget);
  }, [hospitals, showAvailableOnly, careTarget]);

  const panMapTo = useCallback((lat: number, lng: number, level: number) => {
    const map = mapRef.current;
    if (!map) return;
    map.panTo(new kakao.maps.LatLng(lat, lng));
    map.setLevel(clampLevel(level), { animate: true });
  }, []);

  useEffect(() => {
    if (!userLocation) return;
    const key = `${userLocation.lat},${userLocation.lng}`;
    if (lastPannedUserRef.current === key) return;
    lastPannedUserRef.current = key;
    panMapTo(userLocation.lat, userLocation.lng, USER_LOCATION_LEVEL);
  }, [userLocation, panMapTo]);

  useEffect(() => {
    if (!selectedHospital) {
      lastPannedHospitalRef.current = null;
      return;
    }
    if (lastPannedHospitalRef.current === selectedHospital.name) return;
    lastPannedHospitalRef.current = selectedHospital.name;
    panMapTo(selectedHospital.lat, selectedHospital.lng, SELECTED_LEVEL);
  }, [selectedHospital, panMapTo]);

  const handleHospitalSelect = useCallback(
    (hospital: HospitalRecord) => {
      onHospitalSelect(hospital);
    },
    [onHospitalSelect],
  );

  const handleMapDragEnd = useCallback((map: kakao.maps.Map) => {
    enforceDaeguMapBounds(map);
  }, []);

  const mapCenter = userLocation
    ? { lat: userLocation.lat, lng: userLocation.lng }
    : DAEGU_CENTER;

  return (
    <div className="relative h-full min-h-0 w-full flex-1">
      <div
        ref={containerRef}
        className="relative h-full min-h-[50vh] lg:min-h-0 w-full touch-pan-y lg:touch-auto"
      >
        <Map
          center={mapCenter}
          isPanto
          draggable
          zoomable
          scrollwheel
          keyboardShortcuts
          style={{ width: '100%', height: '100%', borderRadius: '0.75rem' }}
          onCreate={(map) => {
            mapRef.current = map;
          }}
          onDragEnd={handleMapDragEnd}
        >
          <MapInteraction defaultLevel={DEFAULT_LEVEL} minLevel={MIN_LEVEL} maxLevel={MAX_LEVEL} />
          <MapRelayout containerRef={containerRef} />
          <ZoomControl position="RIGHT" />

          {visibleHospitals.map((hospital) => (
            <HospitalMarkerOverlay
              key={hospital.name}
              hospital={hospital}
              position={{ lat: hospital.lat, lng: hospital.lng }}
              isSelected={selectedHospital?.name === hospital.name}
              onSelect={handleHospitalSelect}
            />
          ))}

          {selectedHospital ? (
            <SelectedHospitalPin
              lat={selectedHospital.lat}
              lng={selectedHospital.lng}
              label={selectedHospital.name}
            />
          ) : null}

          {userLocation ? (
            <MapMarker
              position={{ lat: userLocation.lat, lng: userLocation.lng }}
              image={userLocationMarkerImage()}
              zIndex={10}
            />
          ) : null}
        </Map>
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 z-[800] flex gap-2 rounded-lg bg-white/95 px-2.5 py-1.5 text-[10px] font-semibold shadow-md ring-1 ring-slate-200">
        <span className="flex items-center gap-1 text-green-700">
          <span className="h-2 w-2 rounded-full bg-green-500" aria-hidden />
          진료 가능
        </span>
        <span className="flex items-center gap-1 text-red-700">
          <span className="h-2 w-2 rounded-full bg-red-500" aria-hidden />
          수용 불가
        </span>
        <span className="flex items-center gap-1 text-blue-700">
          <span className="h-2 w-2 rounded-full bg-blue-500" aria-hidden />
          내 위치
        </span>
      </div>
    </div>
  );
}
