import { useCallback } from 'react';
import type React from 'react';
import type { HospitalFilter } from './hospital-filter';
import { usePresetStore } from './usePresetStore';

interface UseDashboardActionsProps {
  onDistrictSelect: (admNm: string) => void;
  setActiveFilter: (filter: HospitalFilter) => void;
}

export function useDashboardActions({
  onDistrictSelect,
  setActiveFilter,
}: UseDashboardActionsProps) {
  const setActivePreset = usePresetStore((state) => state.setActivePreset);

  const handlePresetSelect = useCallback(
    async (preset: 'highRiskTop10' | 'pediatricPriority' | 'generalPriority') => {
      try {
        const response = await fetch('/data/priority_targets.json');
        if (!response.ok) throw new Error('Failed to fetch priority targets');
        const data = await response.json();

        if (preset === 'highRiskTop10') {
          setActiveFilter('all');
          if (data.highRiskTop10 && data.highRiskTop10.length > 0) {
            setActivePreset('highRiskTop10', data.highRiskTop10);
            onDistrictSelect(data.highRiskTop10[0]);
          }
          return;
        }
        if (preset === 'pediatricPriority') {
          setActiveFilter('tier3');
          if (data.pediatricPriority) {
            setActivePreset('pediatricPriority', [data.pediatricPriority]);
            onDistrictSelect(data.pediatricPriority);
          }
          return;
        }
        if (preset === 'generalPriority') {
          setActiveFilter('tier2');
          if (data.generalPriority) {
            setActivePreset('generalPriority', [data.generalPriority]);
            onDistrictSelect(data.generalPriority);
          }
        }
      } catch (error) {
        console.error('Priority preset selection failed:', error);
        alert('우선순위 데이터를 불러오는 데 실패했습니다.');
      }
    },
    [onDistrictSelect, setActiveFilter, setActivePreset],
  );

  const handleExportCsv = useCallback(() => {
    const link = document.createElement('a');
    link.href = '/data/policy_monitoring_report.csv';
    link.download = `policy-monitoring-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
  }, []);

  const handleCaptureReport = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }
    // TODO: public/data/ 폴더에 '사회과학_분석_보고서.pdf'를 배치해야 합니다.
    // 파일이 없으면 Vite 개발 서버가 index.html을 반환하여 새로고침처럼 보이게 됩니다.
    window.open('/data/사회과학_분석_보고서.pdf', '_blank', 'noopener,noreferrer');
  }, []);

  return {
    handlePresetSelect,
    handleExportCsv,
    handleCaptureReport,
  };
}
