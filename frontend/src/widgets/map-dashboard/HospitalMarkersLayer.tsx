import { useEffect } from 'react';
import type { HospitalRecord } from '../../shared/types/hospital';
import { AdminHospitalMapMarker } from './AdminHospitalMapMarker';
import { SelectedHospitalPin } from './SelectedHospitalPin';

const HOSPITAL_SELECTED_LEVEL = 3;

interface HospitalMarkersLayerProps {
  hospitals: HospitalRecord[];
  selectedHospital: HospitalRecord | null;
  highlightedHospitalName?: string | null;
  onMarkerSelect: (hospital: HospitalRecord) => void;
  panMapTo: (lat: number, lng: number, level: number, applyOffset?: boolean, animateLevel?: boolean) => void;
}

export function HospitalMarkersLayer({
  hospitals,
  selectedHospital,
  highlightedHospitalName = null,
  onMarkerSelect,
  panMapTo,
}: HospitalMarkersLayerProps) {
  useEffect(() => {
    if (selectedHospital) {
      panMapTo(selectedHospital.lat, selectedHospital.lng, HOSPITAL_SELECTED_LEVEL, true, true);
    }
  }, [selectedHospital?.name, selectedHospital?.lat, selectedHospital?.lng, panMapTo]);

  return (
    <>
      {hospitals.map((hospital) => (
        <AdminHospitalMapMarker
          key={hospital.name}
          hospital={hospital}
          isSelected={selectedHospital?.name === hospital.name}
          isHighlighted={highlightedHospitalName === hospital.name}
          onSelect={onMarkerSelect}
        />
      ))}

      {selectedHospital ? (
        <SelectedHospitalPin
          lat={selectedHospital.lat}
          lng={selectedHospital.lng}
          label={selectedHospital.name}
        />
      ) : null}
    </>
  );
}
