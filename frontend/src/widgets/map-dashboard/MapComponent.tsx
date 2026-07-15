import { useCallback, useEffect, useRef } from 'react';
import { Map, MapMarker, ZoomControl } from 'react-kakao-maps-sdk';

import type { HospitalRecord } from '../../shared/types/hospital';
import { toAdmNmKey } from '../../shared/types/vulnerability';

import { DistrictHoverTooltip } from './DistrictHoverTooltip';
import { DistrictPolygon } from './DistrictPolygon';
import { HospitalMarkersLayer } from './HospitalMarkersLayer';
import { MapHud } from './MapHud';
import { MapToolbar } from './MapToolbar';
import { MapInteraction } from './MapInteraction';
import { MapRelayout } from './MapRelayout';
import { OptimalLocationMarkers } from './OptimalLocationMarkers';
import { PolicyOptimizationSummary } from './PolicyOptimizationSummary';
import { useMapController, MIN_LEVEL, MAX_LEVEL } from './lib/useMapController';
import { enforceDaeguMapBounds } from './lib/daegu-map-bounds';
import { type KakaoLatLng } from './lib/geojson-to-kakao';
import { userLocationMarkerImage } from './lib/kakao-marker-images';
import {
  vulnerabilityIndexToFillColor,
  vulnerabilityIndexToFillOpacity,
  vulnerabilityIndexToStrokeColor,
} from './lib/vulnerability-choropleth-colors';

const DAEGU_CENTER: KakaoLatLng = { lat: 35.8714, lng: 128.6014 };
const DEFAULT_LEVEL = 7;
const SELECTED_LEVEL = 5;

interface MapComponentProps {
  hospitals: HospitalRecord[];
  selectedHospital: HospitalRecord | null;
  onHospitalSelect: (hospital: HospitalRecord | null) => void;
  selectedDistrict: string | null;
  onDistrictSelect: (admNm: string | null) => void;
  riskThreshold: number;
  onRiskThresholdChange: (value: number) => void;
  highlightedHospitalName?: string | null;
  currentMode?: string;
}

import { useMapComponentController } from './useMapComponentController';

export function MapComponent(props: MapComponentProps) {
  const {
    riskThreshold,
    onRiskThresholdChange,
  } = props;

  const mapState = useMapComponentController(props);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<kakao.maps.Map | null>(null);
  const { userLocation, locating, panMapTo, handleLocateMe } = useMapController(mapRef);

  useEffect(() => {
    if (mapState.selectedRecord?.adm_nm) {
      panMapTo(mapState.selectedRecord.center_lat, mapState.selectedRecord.center_lng, SELECTED_LEVEL, true, true);
    }
  }, [mapState.selectedRecord?.adm_nm, mapState.selectedRecord?.center_lat, mapState.selectedRecord?.center_lng, panMapTo]);

  const handleMapDragEnd = useCallback((map: kakao.maps.Map) => {
    enforceDaeguMapBounds(map);
  }, []);

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <MapToolbar
        activeFilter={mapState.activeFilter}
        onFilterChange={mapState.handleFilterChange}
        riskThreshold={riskThreshold}
        onRiskThresholdChange={onRiskThresholdChange}
        onPresetSelect={mapState.handlePresetSelect}
        currentMode={props.currentMode}
      />
      {mapState.optimalError && mapState.showOptimalLocations && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10 rounded-md bg-rose-50 px-4 py-2 text-sm text-rose-600 shadow-md ring-1 ring-rose-200">
          {mapState.optimalError}
        </div>
      )}
      {mapState.optimalLoading && mapState.showOptimalLocations && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10 rounded-md bg-white px-4 py-2 text-sm text-slate-600 shadow-md ring-1 ring-slate-200">
          AI 분석 데이터를 불러오는 중...
        </div>
      )}
      <div
        ref={containerRef}
        className="relative min-h-0 w-full flex-1"
      >
        <Map
          center={DAEGU_CENTER}
          draggable
          zoomable
          scrollwheel
          keyboardShortcuts
          style={{ width: '100%', height: '100%', borderRadius: '0.75rem' }}
          onCreate={(map) => {
            mapRef.current = map;
          }}
          onClick={mapState.handleMapClick}
          onDragEnd={handleMapDragEnd}
        >
          <MapInteraction
            defaultLevel={DEFAULT_LEVEL}
            minLevel={MIN_LEVEL}
            maxLevel={MAX_LEVEL}
          />
          <MapRelayout containerRef={containerRef} />
          <ZoomControl position="RIGHT" />

          {mapState.heatmapViewModel.map((item) => (
            <DistrictPolygon
              key={item.key}
              shape={item.shape}
              strokeColor={
                item.isIncludedInPreset
                  ? '#ef4444'
                  : vulnerabilityIndexToStrokeColor(
                      item.score,
                      mapState.indexRange.min,
                      mapState.indexRange.max,
                    )
              }
              fillColor={
                item.isIncludedInPreset
                  ? '#ef4444'
                  : vulnerabilityIndexToFillColor(
                      item.score,
                      mapState.indexRange.min,
                      mapState.indexRange.max,
                    )
              }
              fillOpacity={
                item.isIncludedInPreset
                  ? 0.7
                  : vulnerabilityIndexToFillOpacity(
                      item.score,
                      mapState.indexRange.min,
                      mapState.indexRange.max,
                    )
              }
              isSelected={mapState.selectedKey === toAdmNmKey(item.shape.admNm)}
              onSelect={mapState.handleDistrictSelectInternal}
              onHoverChange={mapState.handleDistrictHoverChange}
            />
          ))}

          {mapState.showHeatmap && mapState.hoveredRecord && mapState.hoveredDistrict && (
            <DistrictHoverTooltip
              admNm={mapState.hoveredDistrict}
              centerLat={mapState.hoveredRecord.center_lat}
              centerLng={mapState.hoveredRecord.center_lng}
              vulnerabilityIndex={mapState.hoveredRecord.vdi_log}
            />
          )}

          <HospitalMarkersLayer
            hospitals={mapState.filteredHospitals}
            selectedHospital={props.selectedHospital}
            highlightedHospitalName={props.highlightedHospitalName}
            onMarkerSelect={mapState.handleHospitalSelectInternal}
            panMapTo={panMapTo}
          />

          {userLocation && (
            <MapMarker
              position={userLocation}
              image={userLocationMarkerImage()}
              zIndex={5}
            />
          )}

          <OptimalLocationMarkers />
        </Map>

        <MapHud onLocate={handleLocateMe} locating={locating} />
        <PolicyOptimizationSummary />
      </div>
    </div>
  );
}
