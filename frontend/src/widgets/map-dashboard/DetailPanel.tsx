import type { HospitalRecord } from '../../shared/types/hospital';
import type { DistrictVulnerabilityRecord } from '../../shared/types/vulnerability';

import { HospitalEmptyPanel } from './HospitalEmptyPanel';
import { HospitalDetailView } from './HospitalDetailView';
import { VulnerabilityDistrictView } from './VulnerabilityDistrictView';
import { PresetDistrictListPanel } from './PresetDistrictListPanel';
import { usePresetStore } from './lib/usePresetStore';

interface DetailPanelProps {
  selectedHospital: HospitalRecord | null;
  vulnerabilityRecord: DistrictVulnerabilityRecord | null;
  hospitals: HospitalRecord[];
  vulnerabilitySummary?: {
    avgVulnerabilityIndex: number;
    avgDistanceKm: number;
    avgVulnerablePop: number;
    riskThreshold: number;
  };
  onDistrictSelect?: (admNm: string | null) => void;
}

export function DetailPanel({
  selectedHospital,
  vulnerabilityRecord,
  hospitals,
  vulnerabilitySummary,
  onDistrictSelect,
}: DetailPanelProps) {
  const activePreset = usePresetStore((state) => state.activePreset);

  if (activePreset) {
    return (
      <PresetDistrictListPanel
        onDistrictSelect={(admNm: string) => {
          if (onDistrictSelect) {
            onDistrictSelect(admNm);
          }
        }}
        selectedDistrict={vulnerabilityRecord?.adm_nm || null}
      />
    );
  }

  if (selectedHospital) {
    return <HospitalDetailView hospital={selectedHospital} />;
  }

  if (vulnerabilityRecord) {
    return (
      <VulnerabilityDistrictView
        record={vulnerabilityRecord}
        hospitals={hospitals}
        vulnerabilitySummary={vulnerabilitySummary}
      />
    );
  }

  return <HospitalEmptyPanel />;
}
