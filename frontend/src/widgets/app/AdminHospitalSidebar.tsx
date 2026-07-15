import { useEffect, useMemo, useRef } from 'react';

import { DESKTOP_SIDEBAR_PANEL_CLASS } from '../../shared/constants/dashboard-layout';
import {
  HOSPITAL_TIER_ORDER,
  HOSPITAL_TIER_VISUAL,
} from '../../shared/lib/hospital-tier-visual';
import type { HospitalRecord } from '../../shared/types/hospital';
import {
  hospitalAvailableBeds,
  hospitalTierBadge,
} from '../../shared/types/hospital';
import type { SevereConditionId } from '../../shared/lib/severe-condition';
import { AdminPolicyIcon, PanelSidebarHeader } from '../shared/PanelSidebarHeader';
import { AvailableBedsBadge } from '../map-dashboard/AvailableBedsBadge';
import { TierBadge } from '../map-dashboard/TierBadge';
import { TierIcon } from '../map-dashboard/TierIcon';
import { HospitalSidebarControls } from '../map-dashboard/HospitalSidebarControls';

interface AdminHospitalSidebarProps {
  hospitals: HospitalRecord[];
  selectedHospital: HospitalRecord | null;
  onHospitalSelect: (hospital: HospitalRecord | null) => void;
  loading?: boolean;
  highlightedHospitalName?: string | null;
  currentMode?: 'all' | 'adult' | 'pediatric' | 'senior';
  onModeChange?: (val: 'all' | 'adult' | 'pediatric' | 'senior') => void;
  showAvailableOnly?: boolean;
  onShowAvailableOnlyChange?: (value: boolean) => void;
  severeCondition?: SevereConditionId;
  onSevereConditionChange?: (value: SevereConditionId) => void;
}

export function AdminHospitalSidebar({
  hospitals,
  selectedHospital,
  onHospitalSelect,
  loading = false,
  highlightedHospitalName = null,
  currentMode = 'all',
  onModeChange,
  showAvailableOnly = false,
  onShowAvailableOnlyChange,
  severeCondition = 'all',
  onSevereConditionChange,
}: AdminHospitalSidebarProps) {
  const rowRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const sortedHospitals = useMemo(
    () =>
      [...hospitals].sort((a, b) => {
        const tierDiff = HOSPITAL_TIER_ORDER.indexOf(a.tier) - HOSPITAL_TIER_ORDER.indexOf(b.tier);
        if (tierDiff !== 0) return tierDiff;
        return a.name.localeCompare(b.name, 'ko');
      }),
    [hospitals],
  );

  const tier1Count = hospitals.filter((h) => h.tier === 1).length;
  const tier2Count = hospitals.filter((h) => h.tier === 2).length;
  const tier3Count = hospitals.filter((h) => h.tier === 3).length;

  function handleItemClick(hospital: HospitalRecord) {
    onHospitalSelect(selectedHospital?.name === hospital.name ? null : hospital);
  }

  useEffect(() => {
    if (!highlightedHospitalName || selectedHospital) return;
    const node = rowRefs.current[highlightedHospitalName];
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [highlightedHospitalName, selectedHospital]);

  return (
    <aside className={DESKTOP_SIDEBAR_PANEL_CLASS}>
      <PanelSidebarHeader
        variant="admin"
        icon={<AdminPolicyIcon />}
        title="응급의료기관 현황"
        subtitle="지도·행정동 분석과 연동"
      />

      {onModeChange && (
        <HospitalSidebarControls
          heading="분석 대상 인구"
          isLocating={false}
          locationSource={null}
          locationErrorReason={null}
          showAvailableOnly={showAvailableOnly}
          onShowAvailableOnlyChange={onShowAvailableOnlyChange ?? (() => {})}
          careTarget={currentMode}
          onCareTargetChange={onModeChange}
          severeCondition={severeCondition}
          onSevereConditionChange={onSevereConditionChange}
        />
      )}

      <div className="shrink-0 grid grid-cols-3 divide-x divide-slate-300 border-b border-slate-300 bg-slate-50">
        {HOSPITAL_TIER_ORDER.map((tier) => (
          <div
            key={tier}
            className="p-2 text-center"
          >
            <p className="text-[10px] font-semibold text-slate-500">
              {HOSPITAL_TIER_VISUAL[tier].label}
            </p>
            <p className="text-base font-extrabold text-slate-900">
              {loading ? '—' : tier === 1 ? tier1Count : tier === 2 ? tier2Count : tier3Count}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:min-h-0 lg:flex-1">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-3 py-2">
          <p className="text-sm font-bold text-slate-700">병원 목록</p>
          <span className="border border-slate-300 bg-white px-2 py-0.5 text-xs font-bold text-teal-800">
            {loading ? '…' : `${hospitals.length}곳`}
          </span>
        </div>

        <ul className="divide-y divide-slate-200 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
          {loading ? (
            <li className="px-2 py-6 text-center text-sm text-slate-400">불러오는 중…</li>
          ) : null}
          {!loading &&
            sortedHospitals.map((hospital) => {
              const isActive = selectedHospital?.name === hospital.name;
              const isHighlighted =
                !isActive && highlightedHospitalName === hospital.name;

              return (
                <li key={hospital.name}>
                  <button
                    ref={(element) => {
                      rowRefs.current[hospital.name] = element;
                    }}
                    type="button"
                    onClick={() => handleItemClick(hospital)}
                    className={`flex w-full items-start gap-2.5 border-l-4 px-3 py-3 text-left transition ${
                      isActive
                        ? 'border-teal-800 bg-teal-50 text-slate-900'
                        : isHighlighted
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-transparent bg-white hover:bg-slate-50'
                    }`}
                  >
                    <TierIcon tier={hospital.tier} size="sm" className="mt-0.5" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{hospital.name}</span>
                      <span
                        className={`mt-0.5 flex flex-wrap items-center gap-1.5 text-xs ${
                          'text-slate-500'
                        }`}
                      >
                        <span>{hospitalTierBadge(hospital.tier)}</span>
                        <AvailableBedsBadge
                          availableBeds={hospitalAvailableBeds(hospital)}
                          totalBeds={hospital.total_hvec}
                          variant="default"
                        />
                      </span>
                    </span>
                    {isActive ? <TierBadge tier={hospital.tier} /> : null}
                    {isHighlighted ? (
                      <span className="rounded-full bg-blue-500 px-2 py-0.5 text-[10px] font-bold text-white">
                        추천
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
        </ul>
      </div>
    </aside>
  );
}
