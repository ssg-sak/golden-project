import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import type { PanInfo } from 'framer-motion';

import {
  HOSPITAL_TIER_ORDER,
  HOSPITAL_TIER_VISUAL,
} from '../../shared/lib/hospital-tier-visual';
import type { HospitalRecord } from '../../shared/types/hospital';
import {
  hospitalAvailableBeds,
  hospitalTierBadge,
} from '../../shared/types/hospital';
import type { DistrictVulnerabilityRecord } from '../../shared/types/vulnerability';

import { AdminPolicyIcon, PanelSidebarHeader } from '../shared/PanelSidebarHeader';
import { AvailableBedsBadge } from '../map-dashboard/AvailableBedsBadge';
import { TierBadge } from '../map-dashboard/TierBadge';
import { TierIcon } from '../map-dashboard/TierIcon';
import { HospitalSidebarControls } from '../map-dashboard/HospitalSidebarControls';
import { DetailPanel } from '../map-dashboard/DetailPanel';

import { DashboardStatsBar } from '../map-dashboard/DashboardStatsBar';
import { MetricsGuide } from '../map-dashboard/MetricsGuide';
import { PolicyStatusBanner } from './PolicyStatusBanner';

interface AdminMobileBottomSheetProps {
  hospitals: HospitalRecord[];
  selectedHospital: HospitalRecord | null;
  onHospitalSelect: (hospital: HospitalRecord | null) => void;
  loading?: boolean;
  highlightedHospitalName?: string | null;
  currentMode?: 'all' | 'adult' | 'pediatric' | 'senior';
  onModeChange?: (val: 'all' | 'adult' | 'pediatric' | 'senior') => void;
  showAvailableOnly?: boolean;
  onShowAvailableOnlyChange?: (value: boolean) => void;
  
  // Detail Props
  isDetailOpen: boolean;
  selectedVulnerability: DistrictVulnerabilityRecord | null;
  vulnerabilitySummary?: {
    avgVulnerabilityIndex: number;
    avgDistanceKm: number;
    avgVulnerablePop: number;
    riskThreshold: number;
  };
  onDistrictSelect: (district: string | null) => void;

  // Stats Props
  districtCount: number;
  tier1Count?: number;
  tier2Count?: number;
  tier3Count?: number;
  highRiskDistrictCount?: number;
  highRiskThreshold?: number;
  statsLoading?: boolean;
  hospitalsUpdatedAt?: string | null;
  vulnerabilityUpdatedAt?: string | null;
  totalHospitalsDelta?: number | null;
  highRiskDelta?: number | null;
  populationBaseMonth?: string;
  adminAreaChangeText?: string;
  emergencyChangeText?: string;
  highRiskChangeText?: string;
  dataStale?: boolean;
  policyStatus?: React.ComponentProps<typeof PolicyStatusBanner> | null;
}

export function AdminMobileBottomSheet({
  hospitals,
  selectedHospital,
  onHospitalSelect,
  loading = false,
  highlightedHospitalName = null,
  currentMode = 'all',
  onModeChange,
  showAvailableOnly = false,
  onShowAvailableOnlyChange,
  isDetailOpen,
  selectedVulnerability,
  vulnerabilitySummary,
  onDistrictSelect,
  districtCount,
  tier1Count: tier1CountProp,
  tier2Count: tier2CountProp,
  tier3Count: tier3CountProp,
  highRiskDistrictCount,
  highRiskThreshold,
  statsLoading,
  hospitalsUpdatedAt,
  vulnerabilityUpdatedAt,
  totalHospitalsDelta,
  highRiskDelta,
  populationBaseMonth,
  adminAreaChangeText,
  emergencyChangeText,
  highRiskChangeText,
  dataStale,
  policyStatus,
}: AdminMobileBottomSheetProps) {
  const rowRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const controls = useAnimation();
  const [sheetState, setSheetState] = useState<'expanded' | 'half' | 'collapsed'>('half');

  const sortedHospitals = useMemo(
    () =>
      [...hospitals].sort((a, b) => {
        const tierDiff = HOSPITAL_TIER_ORDER.indexOf(a.tier) - HOSPITAL_TIER_ORDER.indexOf(b.tier);
        if (tierDiff !== 0) return tierDiff;
        return a.name.localeCompare(b.name, 'ko');
      }),
    [hospitals],
  );

  const tier1Count = tier1CountProp ?? hospitals.filter((h) => h.tier === 1).length;
  const tier2Count = tier2CountProp ?? hospitals.filter((h) => h.tier === 2).length;
  const tier3Count = tier3CountProp ?? hospitals.filter((h) => h.tier === 3).length;

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

  // Detail 패널 열림 시 자동으로 시트를 올림
  useEffect(() => {
    if (isDetailOpen && sheetState === 'collapsed') {
      setSheetState('half');
    }
  }, [isDetailOpen, sheetState]);

  useEffect(() => {
    controls.start(sheetState);
  }, [sheetState, controls]);

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 50;
    const velocity = info.velocity.y;
    const offset = info.offset.y;

    if (velocity > 400 || offset > threshold) {
      // Swipe Down
      if (sheetState === 'expanded') setSheetState('half');
      else setSheetState('collapsed');
    } else if (velocity < -400 || offset < -threshold) {
      // Swipe Up
      if (sheetState === 'collapsed') setSheetState('half');
      else setSheetState('expanded');
    } else {
      controls.start(sheetState);
    }
  };

  const variants = {
    expanded: { y: 0 },
    half: { y: '40dvh' },
    collapsed: { y: 'calc(90dvh - 150px)' },
  };

  return (
    <motion.aside
      initial="half"
      animate={controls}
      variants={variants}
      transition={{ type: 'spring', damping: 30, stiffness: 400 }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      className="fixed bottom-0 left-0 right-0 z-[100] flex h-[90dvh] flex-col overflow-hidden rounded-t-3xl bg-[#f5f8fc]/95 backdrop-blur-md shadow-[0_-8px_30px_rgba(0,0,0,0.12)]"
    >
      {/* 드래그 핸들 */}
      <div 
        className="flex w-full cursor-grab active:cursor-grabbing items-center justify-center pb-2 pt-3 shrink-0"
        aria-label="시트 높이 조절"
      >
        <div className="h-1.5 w-12 rounded-full bg-slate-300" />
      </div>

      {isDetailOpen ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="px-4 pb-2 pt-1 shrink-0 bg-white">
            <button
              onClick={() => {
                onHospitalSelect(null);
                onDistrictSelect(null);
              }}
              className="flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-900"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              목록으로 돌아가기
            </button>
          </div>
          <div className="flex-1 overflow-y-auto pb-20 bg-white">
            <DetailPanel
              selectedHospital={selectedHospital}
              vulnerabilityRecord={selectedVulnerability}
              hospitals={hospitals}
              vulnerabilitySummary={vulnerabilitySummary}
              onDistrictSelect={onDistrictSelect}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden pointer-events-auto">
          <div className="bg-white">
            <PanelSidebarHeader
              variant="admin"
              icon={<AdminPolicyIcon />}
              title="응급의료기관 현황"
              subtitle="지도·행정동 분석과 연동"
            />
          </div>

          {onModeChange && (
            <HospitalSidebarControls
              isLocating={false}
              locationSource={null}
              locationErrorReason={null}
              showAvailableOnly={showAvailableOnly}
              onShowAvailableOnlyChange={onShowAvailableOnlyChange ?? (() => {})}
              careTarget={currentMode}
              onCareTargetChange={onModeChange}
            />
          )}

          <div className="shrink-0 grid grid-cols-3 gap-1.5 border-b border-slate-200 bg-[#f8fbff] p-2.5">
            {HOSPITAL_TIER_ORDER.map((tier) => (
              <div
                key={tier}
                className={`rounded-lg p-1.5 text-center ring-1 shadow-[0_1px_0_rgba(15,23,42,0.03)] ${HOSPITAL_TIER_VISUAL[tier].chipClass}`}
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

          <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-3 py-2">
            <p className="text-sm font-bold text-slate-700">병원 목록</p>
            <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-[#2b63d9] ring-1 ring-slate-300">
              {loading ? '…' : `${hospitals.length}곳`}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto bg-white pb-6">
            {policyStatus ? <PolicyStatusBanner {...policyStatus} /> : null}
            
            <div className="border-b border-slate-200/60 pb-2">
              <DashboardStatsBar
                districtCount={districtCount}
                tier1Count={tier1Count}
                tier2Count={tier2Count}
                tier3Count={tier3Count}
                highRiskDistrictCount={highRiskDistrictCount}
                highRiskThreshold={highRiskThreshold}
                loading={statsLoading}
                hospitalsUpdatedAt={hospitalsUpdatedAt}
                vulnerabilityUpdatedAt={vulnerabilityUpdatedAt}
                totalHospitalsDelta={totalHospitalsDelta}
                highRiskDelta={highRiskDelta}
                populationBaseMonth={populationBaseMonth}
                adminAreaChangeText={adminAreaChangeText}
                emergencyChangeText={emergencyChangeText}
                highRiskChangeText={highRiskChangeText}
                dataStale={dataStale}
              />
              <MetricsGuide />
            </div>

            <ul className="space-y-1 px-2 pt-2">
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
                        className={`flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left transition ${
                          isActive
                            ? 'bg-[#2b63d9] text-white shadow-md'
                            : isHighlighted
                              ? 'bg-blue-50 ring-2 ring-blue-300'
                              : 'bg-white ring-1 ring-slate-200 hover:ring-blue-300'
                        }`}
                      >
                        <TierIcon tier={hospital.tier} size="sm" className="mt-0.5" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{hospital.name}</span>
                          <span
                            className={`mt-0.5 flex flex-wrap items-center gap-1.5 text-xs ${
                              isActive ? 'text-indigo-100' : 'text-slate-500'
                            }`}
                          >
                            <span>{hospitalTierBadge(hospital.tier)}</span>
                            <AvailableBedsBadge
                              availableBeds={hospitalAvailableBeds(hospital)}
                              variant={isActive ? 'inverse' : 'default'}
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
        </div>
      )}
    </motion.aside>
  );
}
