import type { HospitalRecord } from '../../shared/types/hospital';
import type { DistrictVulnerabilityRecord } from '../../shared/types/vulnerability';

import { HospitalEmptyPanel } from './HospitalEmptyPanel';
import { HospitalDetailView } from './HospitalDetailView';
import { PolicyHospitalContextView } from './PolicyHospitalContextView';
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
  viewMode?: 'citizen' | 'admin';
  vulnerabilityRecords?: DistrictVulnerabilityRecord[];
  riskThreshold?: number;
}

export function DetailPanel({
  selectedHospital,
  vulnerabilityRecord,
  hospitals,
  vulnerabilitySummary,
  onDistrictSelect,
  viewMode = 'citizen',
  vulnerabilityRecords = [],
  riskThreshold,
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
    return viewMode === 'admin' ? (
      <PolicyHospitalContextView
        hospital={selectedHospital}
        vulnerabilityRecords={vulnerabilityRecords}
        riskThreshold={riskThreshold}
      />
    ) : (
      <HospitalDetailView hospital={selectedHospital} />
    );
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
