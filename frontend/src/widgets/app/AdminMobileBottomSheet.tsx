import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useAnimation, useDragControls } from 'framer-motion';
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
import type { SevereConditionId } from '../../shared/lib/severe-condition';

import { AdminPolicyIcon, PanelSidebarHeader } from '../shared/PanelSidebarHeader';
import { AvailableBedsBadge } from '../map-dashboard/AvailableBedsBadge';
import { TierBadge } from '../map-dashboard/TierBadge';
import { TierIcon } from '../map-dashboard/TierIcon';
import { HospitalSidebarControls } from '../map-dashboard/HospitalSidebarControls';
import { DetailPanel } from '../map-dashboard/DetailPanel';

import { DashboardStatsBar } from '../map-dashboard/DashboardStatsBar';
import { MetricsGuide } from '../map-dashboard/MetricsGuide';
import { PolicyDataPipeline } from '../map-dashboard/PolicyDataPipeline';
import { PolicyStatusBanner } from './PolicyStatusBanner';

interface AdminMobileBottomSheetProps {
  staticMode?: boolean;
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
  populationBaseMonth?: string;
  dataStale?: boolean;
  policyStatus?: React.ComponentProps<typeof PolicyStatusBanner> | null;
}

export function AdminMobileBottomSheet({
  staticMode = false,
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
  populationBaseMonth,
  dataStale,
  policyStatus,
}: AdminMobileBottomSheetProps) {
  const rowRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const controls = useAnimation();
  const dragControls = useDragControls();
  const didDragRef = useRef(false);
  const [sheetState, setSheetState] = useState<'expanded' | 'half' | 'collapsed'>(
    staticMode ? 'expanded' : 'half',
  );

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

    window.requestAnimationFrame(() => {
      didDragRef.current = false;
    });
  };

  const variants = {
    expanded: { y: 0 },
    half: { y: '40dvh' },
    collapsed: { y: 'calc(90dvh - 150px)' },
  };

  return (
    <motion.aside
      initial={staticMode ? 'expanded' : 'half'}
      animate={controls}
      variants={variants}
      transition={{ type: 'spring', damping: 30, stiffness: 400 }}
      drag={staticMode ? false : 'y'}
      dragControls={dragControls}
      dragListener={false}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.2}
      onDragStart={() => {
        didDragRef.current = true;
      }}
      onDragEnd={handleDragEnd}
      className={
        staticMode
          ? 'relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#f5f8fc]'
          : 'fixed bottom-0 left-0 right-0 z-[100] flex h-[90dvh] flex-col overflow-hidden rounded-t-3xl bg-[#f5f8fc]/95 backdrop-blur-md shadow-[0_-8px_30px_rgba(0,0,0,0.12)]'
      }
    >
      {/* 드래그 핸들 */}
      <button
        type="button"
        className={`${staticMode ? 'hidden' : 'flex'} min-h-11 w-full shrink-0 touch-none cursor-grab items-center justify-center pb-2 pt-3 active:cursor-grabbing`}
        aria-label="정책 분석 시트 높이 조절"
        aria-expanded={sheetState === 'expanded'}
        onPointerDown={(event) => dragControls.start(event)}
        onClick={() => {
          if (didDragRef.current) return;
          setSheetState((current) =>
            current === 'collapsed' ? 'half' : current === 'half' ? 'expanded' : 'half',
          );
        }}
      >
        <div className="h-1.5 w-12 rounded-full bg-slate-300" />
      </button>

      {isDetailOpen ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          <button
            type="button"
            onClick={() => {
              onHospitalSelect(null);
              onDistrictSelect(null);
            }}
            className="fixed left-3 top-[calc(var(--mobile-nav-height,0px)+0.75rem)] z-[200] inline-flex min-h-11 max-w-[calc(100vw-1.5rem)] items-center gap-2 rounded-full border border-slate-800 bg-white/95 px-3 py-2 text-sm font-extrabold text-slate-950 shadow-lg backdrop-blur transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 lg:hidden"
            aria-label="정책 상세를 닫고 정책 목록으로 돌아가기"
          >
            <span
              aria-hidden
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-lg font-bold text-white"
            >
              ←
            </span>
            <span className="truncate">정책 목록으로</span>
          </button>
          <div className="min-h-0 flex-1 overflow-y-auto bg-white pb-[env(safe-area-inset-bottom)]">
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
              severeCondition={severeCondition}
              onSevereConditionChange={onSevereConditionChange}
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

          <div className="flex-1 overscroll-contain overflow-y-auto bg-white pb-[max(1.5rem,env(safe-area-inset-bottom))]">
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
                populationBaseMonth={populationBaseMonth}
                dataStale={dataStale}
              />
              <MetricsGuide />
              <PolicyDataPipeline
                districtCount={districtCount}
                hospitalCount={hospitals.length}
                highRiskDistrictCount={highRiskDistrictCount}
                highRiskThreshold={highRiskThreshold}
                populationBaseMonth={populationBaseMonth}
              />
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
                              totalBeds={hospital.total_hvec}
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
