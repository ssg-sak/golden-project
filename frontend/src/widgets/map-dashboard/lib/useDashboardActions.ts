import { useCallback } from 'react';
import { useVulnerabilityStore } from '../../../shared/store/vulnerabilityStore';

import type { HospitalFilter } from './hospital-filter';
import { usePresetStore } from './usePresetStore';

interface UseDashboardActionsProps {
  onDistrictSelect: (admNm: string) => void;
  setActiveFilter: (filter: HospitalFilter) => void;
}

function simplifyDistrictName(admNm: string): string {
  return admNm.replace(/^대구광역시\s*/, '').trim();
}

export function useDashboardActions({
  onDistrictSelect,
  setActiveFilter,
}: UseDashboardActionsProps) {
  const setActivePreset = usePresetStore((state) => state.setActivePreset);
  const records = useVulnerabilityStore((state) => state.records);
  const handlePresetSelect = useCallback(
    (preset: 'highRiskTop10' | 'pediatricPriority' | 'generalPriority') => {
      const sorted = [...records].sort((a, b) => b.vdi_log - a.vdi_log);

      if (preset === 'highRiskTop10') {
        setActiveFilter('all');
        const top10 = sorted.slice(0, 10).map((record) => simplifyDistrictName(record.adm_nm));
        if (top10.length > 0) {
          setActivePreset('highRiskTop10', top10);
          onDistrictSelect(top10[0]);
        }
        return;
      }

      if (preset === 'pediatricPriority') {
        setActiveFilter('tier3');
        const pediatric = sorted
          .filter((record) => record.nearest_hospital_tier === 3)
          .slice(0, 10)
          .map((record) => simplifyDistrictName(record.adm_nm));
        if (pediatric.length > 0) {
          setActivePreset('pediatricPriority', pediatric);
          onDistrictSelect(pediatric[0]);
        }
        return;
      }

      setActiveFilter('tier2');
      const general = sorted
        .filter((record) => record.nearest_hospital_tier === 1 || record.nearest_hospital_tier === 2)
        .slice(0, 10)
        .map((record) => simplifyDistrictName(record.adm_nm));
      if (general.length > 0) {
        setActivePreset('generalPriority', general);
        onDistrictSelect(general[0]);
      }
    },
    [onDistrictSelect, records, setActiveFilter, setActivePreset],
  );

  return {
    handlePresetSelect,
  };
}
