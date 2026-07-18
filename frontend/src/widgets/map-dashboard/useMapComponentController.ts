import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { HospitalRecord } from '../../shared/types/hospital';
import type { GeoJsonFeature } from '../../shared/types/geojson';
import type { DistrictVulnerabilityRecord } from '../../shared/types/vulnerability';
import { buildVulnerabilityRecordMap, toAdmNmKey } from '../../shared/types/vulnerability';
import { useVulnerabilityStore } from '../../shared/store/vulnerabilityStore';
import { useDashboardActions } from './lib/useDashboardActions';
import { filterHospitals, filterByCareTarget, hospitalMatchesFilter, type HospitalFilter } from './lib/hospital-filter';
import { useOptimalLocationsStore } from './lib/useOptimalLocationsStore';
import { usePresetStore } from './lib/usePresetStore';
import { parseDistrictShapes } from './lib/geojson-to-kakao';
import { getVulnerabilityRange } from './lib/vulnerability-choropleth-colors';

interface MapComponentControllerProps {
  hospitals: HospitalRecord[];
  selectedHospital: HospitalRecord | null;
  onHospitalSelect: (hospital: HospitalRecord | null) => void;
  selectedDistrict: string | null;
  onDistrictSelect: (admNm: string | null) => void;
  currentMode?: string;
  vulnerabilityRecords: DistrictVulnerabilityRecord[];
  districtFeatures: GeoJsonFeature[];
}

export function useMapComponentController({
  hospitals,
  selectedHospital,
  onHospitalSelect,
  selectedDistrict,
  onDistrictSelect,
  currentMode = 'all',
  vulnerabilityRecords,
  districtFeatures,
}: MapComponentControllerProps) {
  const [activeFilter, setActiveFilter] = useState<HospitalFilter>('all');
  const [hoveredDistrict, setHoveredDistrict] = useState<string | null>(null);

  const filteredHospitals = useMemo(() => {
    const baseFiltered = filterHospitals(hospitals, activeFilter);
    if (activeFilter !== 'all') return baseFiltered;
    return filterByCareTarget(baseFiltered, currentMode as 'all' | 'adult' | 'pediatric' | 'senior');
  }, [hospitals, activeFilter, currentMode]);

  const showHeatmap = useVulnerabilityStore((state) => state.showHeatmap);
  const activePreset = usePresetStore((state) => state.activePreset);
  const presetData = usePresetStore((state) => state.presetData);

  const districtShapes = useMemo(() => parseDistrictShapes(districtFeatures), [districtFeatures]);

  const optimalError = useOptimalLocationsStore((state) => state.error);
  const optimalLoading = useOptimalLocationsStore((state) => state.isLoading);
  const showOptimalLocations = useOptimalLocationsStore((state) => state.showLocations);

  const skipMapClearRef = useRef(false);

  const { handlePresetSelect } = useDashboardActions({
    onDistrictSelect,
    setActiveFilter,
  });

  const handleFilterChange = useCallback(
    (newFilter: HospitalFilter) => {
      setActiveFilter(newFilter);
      if (selectedHospital && !hospitalMatchesFilter(selectedHospital, newFilter)) {
        onHospitalSelect(null);
      }
    },
    [selectedHospital, onHospitalSelect],
  );

  useEffect(() => {
    if (!showHeatmap) {
      setHoveredDistrict(null);
    }
  }, [showHeatmap]);

  const recordMap = useMemo(() => buildVulnerabilityRecordMap(vulnerabilityRecords), [vulnerabilityRecords]);

  const indexRange = useMemo(
    () => getVulnerabilityRange(vulnerabilityRecords.map((row) => row.vdi_log)),
    [vulnerabilityRecords],
  );

  const selectedRecord = useMemo(() => {
    if (!selectedDistrict) return null;
    return recordMap.get(toAdmNmKey(selectedDistrict)) ?? null;
  }, [recordMap, selectedDistrict]);

  const selectedKey = selectedDistrict ? toAdmNmKey(selectedDistrict) : null;

  const hoveredRecord = useMemo(() => {
    if (!hoveredDistrict) return null;
    return recordMap.get(toAdmNmKey(hoveredDistrict)) ?? null;
  }, [hoveredDistrict, recordMap]);

  const handleDistrictSelectInternal = useCallback(
    (admNm: string) => {
      skipMapClearRef.current = true;
      onHospitalSelect(null);
      const key = toAdmNmKey(admNm);
      onDistrictSelect(selectedKey === key ? null : admNm);
    },
    [onDistrictSelect, onHospitalSelect, selectedKey],
  );

  const handleDistrictHoverChange = useCallback((admNm: string | null) => {
    setHoveredDistrict(admNm);
  }, []);

  const handleMapClick = useCallback(() => {
    if (skipMapClearRef.current) {
      skipMapClearRef.current = false;
      return;
    }
    onHospitalSelect(null);
    onDistrictSelect(null);
  }, [onDistrictSelect, onHospitalSelect]);

  const handleHospitalSelectInternal = useCallback(
    (hospital: HospitalRecord) => {
      skipMapClearRef.current = true;
      onDistrictSelect(null);
      onHospitalSelect(selectedHospital?.name === hospital.name ? null : hospital);
    },
    [onDistrictSelect, onHospitalSelect, selectedHospital],
  );

  const heatmapViewModel = useMemo(() => {
    if (!showHeatmap) return [];

    return districtShapes
      .map((shape) => {
        const record = recordMap.get(toAdmNmKey(shape.admNm));
        const score = record?.vdi_log ?? indexRange.min;
        const shapeKey = toAdmNmKey(shape.admNm);
        const isIncludedInPreset =
          activePreset !== null && presetData.some((admNm) => toAdmNmKey(admNm) === shapeKey);
        const isVisible = activePreset === null || isIncludedInPreset;

        return {
          shape,
          score,
          isIncludedInPreset,
          isVisible,
          key: shape.id,
        };
      })
      .filter((item) => item.isVisible);
  }, [showHeatmap, districtShapes, recordMap, indexRange.min, activePreset, presetData]);

  return {
    activeFilter,
    handleFilterChange,
    filteredHospitals,
    showHeatmap,
    heatmapViewModel,
    districtShapes,
    recordMap,
    indexRange,
    selectedRecord,
    selectedKey,
    hoveredDistrict,
    hoveredRecord,
    activePreset,
    presetData,
    optimalError,
    optimalLoading,
    showOptimalLocations,
    handleDistrictSelectInternal,
    handleDistrictHoverChange,
    handleMapClick,
    handleHospitalSelectInternal,
    handlePresetSelect,
  };
}
