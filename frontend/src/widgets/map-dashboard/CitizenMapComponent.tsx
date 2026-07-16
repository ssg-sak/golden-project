import { useCallback, useEffect, useMemo, useRef } from 'react';

import { Map, MapMarker, Polyline, ZoomControl } from 'react-kakao-maps-sdk';

import type { UserLocation } from '../../shared/hooks/useUserLocation';
import type { HospitalRecord } from '../../shared/types/hospital';

import { HospitalMarkerOverlay } from './HospitalMarkerOverlay';
import { MapInteraction } from './MapInteraction';
import { MapRelayout } from './MapRelayout';
import { SelectedHospitalPin } from './SelectedHospitalPin';
import { enforceDaeguMapBounds } from './lib/daegu-map-bounds';
import { filterByCareTarget } from './lib/hospital-filter';
import { isHospitalAvailable } from '../../shared/lib/bed-status';
import type { SevereConditionId } from '../../shared/lib/severe-condition';
import type { KakaoLatLng } from './lib/geojson-to-kakao';
import { userLocationMarkerImage } from './lib/kakao-marker-images';

const DAEGU_CENTER: KakaoLatLng = { lat: 35.8714, lng: 128.6014 };
const DEFAULT_LEVEL = 7;
const SELECTED_LEVEL = 4;
const USER_LOCATION_LEVEL = 5;
const MIN_LEVEL = 1;
const MAX_LEVEL = 12;

function clampLevel(level: number): number {
  return Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, level));
}

interface CitizenMapComponentProps {
  hospitals: HospitalRecord[];
  selectedHospital: HospitalRecord | null;
  /** 상세 없이 지도에서만 강조·직선 경로 미리보기 (모바일 임베드) */
  previewHospital?: HospitalRecord | null;
  onHospitalSelect: (hospital: HospitalRecord) => void;
  userLocation: UserLocation | null;
  showAvailableOnly: boolean;
  careTarget: 'all' | 'adult' | 'pediatric' | 'senior';
  severeCondition: SevereConditionId;
  /** 모바일 목록+지도 임베드. 데스크톱 전체 지도는 default. */
  variant?: 'default' | 'mobileEmbed';
}

export function CitizenMapComponent({
  hospitals,
  selectedHospital,
  previewHospital = null,
  onHospitalSelect,
  userLocation,
  showAvailableOnly,
  careTarget,
  severeCondition,
  variant = 'default',
}: CitizenMapComponentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<kakao.maps.Map | null>(null);
  const lastPannedUserRef = useRef<string | null>(null);
  const lastPannedHospitalRef = useRef<string | null>(null);
  const lastPannedPreviewRef = useRef<string | null>(null);
  const isMobileEmbed = variant === 'mobileEmbed';

  const focusHospital = selectedHospital ?? previewHospital;
  const routeHospital = selectedHospital ?? previewHospital;
  const routePreviewPath = useMemo(() => {
    if (!isMobileEmbed || !userLocation || !routeHospital) return null;
    return [
      { lat: userLocation.lat, lng: userLocation.lng },
      { lat: routeHospital.lat, lng: routeHospital.lng },
    ];
  }, [isMobileEmbed, userLocation, routeHospital]);

  // 진료대상 및 병상 여부에 따른 마커 필터링
  const visibleHospitals = useMemo(() => {
    let filtered = hospitals;

    // 1) 병상(available) 필터
    if (showAvailableOnly) {
      filtered = filtered.filter((h) => isHospitalAvailable(h));
    }

    // 2) 진료대상(careTarget) 공통 필터 적용
    return filterByCareTarget(filtered, careTarget, severeCondition);
  }, [hospitals, showAvailableOnly, careTarget, severeCondition]);

  const panMapTo = useCallback((lat: number, lng: number, level: number, applyOffset: boolean = false) => {
    const map = mapRef.current;
    if (!map) return;
    
    // 우측 패널(DetailPanel) 열림/닫힘으로 인해 flex-1 지도 컨테이너 크기가 변경되었을 때, 
    // 카카오맵 내부 캔버스 사이즈를 동기화하여 중앙 좌표가 우측 패널 뒤로 숨는(밀리는) 현상을 방지함.
    map.relayout();
    // Projection 보정은 목표 줌을 적용한 뒤 계산해야 선택 핀이 화면 밖으로 밀리지 않는다.
    map.setLevel(clampLevel(level), { animate: false });
    
    const targetLatLng = new kakao.maps.LatLng(lat, lng);
    
    if (applyOffset && window.innerWidth < 1024) {
      const proj = map.getProjection();
      if (proj) {
        // 모바일 임베드는 하단 목록이 있어 오프셋을 줄인다. 상세 전환 직전 튐도 완화.
        const ratio = isMobileEmbed ? 0.1 : 0.18;
        const pixelOffset = Math.min(
          isMobileEmbed ? 96 : 160,
          Math.max(isMobileEmbed ? 48 : 72, window.innerHeight * ratio),
        );
        const point = proj.pointFromCoords(targetLatLng);
        const offsetLatLng = proj.coordsFromPoint(new kakao.maps.Point(point.x, point.y + pixelOffset));
        map.panTo(offsetLatLng);
      } else {
        map.panTo(targetLatLng);
      }
    } else {
      map.panTo(targetLatLng);
    }

    
  }, [isMobileEmbed]);

  useEffect(() => {
    if (!userLocation) return;
    const key = `${userLocation.lat},${userLocation.lng}`;
    if (lastPannedUserRef.current === key) return;
    lastPannedUserRef.current = key;
    // 내 위치는 바텀시트가 열리지 않으므로 offset 적용 안 함 (false)
    panMapTo(userLocation.lat, userLocation.lng, USER_LOCATION_LEVEL, false);
  }, [userLocation, panMapTo]);


  useEffect(() => {
    if (!selectedHospital) {
      lastPannedHospitalRef.current = null;
      return;
    }
    if (lastPannedHospitalRef.current === selectedHospital.name) return;
    lastPannedHospitalRef.current = selectedHospital.name;
    lastPannedPreviewRef.current = selectedHospital.name;
    // 병원 선택 시 모바일 바텀시트가 열리므로 offset 적용 (true)
    panMapTo(selectedHospital.lat, selectedHospital.lng, SELECTED_LEVEL, true);
  }, [selectedHospital, panMapTo]);

  useEffect(() => {
    if (selectedHospital || !previewHospital) {
      if (!previewHospital) lastPannedPreviewRef.current = null;
      return;
    }
    if (lastPannedPreviewRef.current === previewHospital.name) return;
    lastPannedPreviewRef.current = previewHospital.name;
    panMapTo(previewHospital.lat, previewHospital.lng, SELECTED_LEVEL, false);
  }, [previewHospital, selectedHospital, panMapTo]);

  const handleHospitalSelect = useCallback(
    (hospital: HospitalRecord) => {
      onHospitalSelect(hospital);
    },
    [onHospitalSelect],
  );

  const handleMapDragEnd = useCallback((map: kakao.maps.Map) => {
    enforceDaeguMapBounds(map);
  }, []);

  return (
    <div className={`relative w-full ${isMobileEmbed ? 'h-full min-h-0' : 'h-full min-h-0 flex-1'}`}>
      <div
        ref={containerRef}
        className={
          isMobileEmbed
            ? 'absolute inset-0'
            : 'relative h-full min-h-[50vh] w-full lg:min-h-0'
        }
      >
        <Map
          center={DAEGU_CENTER}
          isPanto
          draggable
          zoomable
          scrollwheel
          keyboardShortcuts={!isMobileEmbed}
          style={{ width: '100%', height: '100%', borderRadius: isMobileEmbed ? '0' : '2px' }}
          onCreate={(map) => {
            mapRef.current = map;
            // 임베드 컨테이너 높이가 잡힌 뒤 타일·컨트롤을 다시 맞춘다.
            window.requestAnimationFrame(() => {
              map.relayout();
              window.setTimeout(() => map.relayout(), 120);
            });
          }}
          onDragEnd={handleMapDragEnd}
        >
          <MapInteraction defaultLevel={DEFAULT_LEVEL} minLevel={MIN_LEVEL} maxLevel={MAX_LEVEL} />
          <MapRelayout containerRef={containerRef} />
          <ZoomControl position="RIGHT" />

          {routePreviewPath ? (
            <Polyline
              path={routePreviewPath}
              strokeWeight={4}
              strokeColor="#0f766e"
              strokeOpacity={0.9}
              strokeStyle="shortdash"
            />
          ) : null}

          {visibleHospitals.map((hospital) => (
            <HospitalMarkerOverlay
              key={hospital.name}
              hospital={hospital}
              position={{ lat: hospital.lat, lng: hospital.lng }}
              isSelected={focusHospital?.name === hospital.name}
              onSelect={handleHospitalSelect}
            />
          ))}

          {focusHospital ? (
            <SelectedHospitalPin
              lat={focusHospital.lat}
              lng={focusHospital.lng}
              label={focusHospital.name}
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

      <div
        className={`pointer-events-none absolute z-[800] flex gap-2 border border-slate-300 bg-white font-semibold shadow-sm ${
          isMobileEmbed
            ? 'bottom-2 left-2 px-2 py-1 text-[9px]'
            : 'bottom-3 left-3 gap-3 px-3 py-2 text-[10px]'
        }`}
      >
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
