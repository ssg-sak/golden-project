import { useState, useMemo } from 'react';
import { isHospitalAvailable } from '../../shared/lib/bed-status';
import type { SevereConditionId } from '../../shared/lib/severe-condition';
import { filterByCareTarget } from '../map-dashboard/lib/hospital-filter';

import {
  DASHBOARD_DETAIL_COL_CLASS,
  DASHBOARD_DETAIL_INNER_CLASS,
  DASHBOARD_MAIN_CLASS,
  DASHBOARD_MAP_COL_CLASS,
  DESKTOP_SIDEBAR_WRAPPER_CLASS,
  DASHBOARD_VIEW_ROOT_CLASS,
} from '../../shared/constants/dashboard-layout';

import { DashboardStatsBar } from '../map-dashboard/DashboardStatsBar';
import { DetailPanel } from '../map-dashboard/DetailPanel';
import { MapComponent } from '../map-dashboard/MapComponent';
import { MetricsGuide } from '../map-dashboard/MetricsGuide';
import { PolicyWelcomePanel } from '../map-dashboard/PolicyWelcomePanel';
import { ResourceRecommendationModal } from '../map-dashboard/ResourceRecommendationModal';

import { AdminHospitalSidebar } from './AdminHospitalSidebar';


interface KakaoState {
  configured: boolean;
  loading: boolean;
  error: ErrorEvent | null;
}

interface AdminViewProps {
  kakao: KakaoState;
  onRetryHospitals: () => void;
}

import { PolicyStatusBanner } from './PolicyStatusBanner';

function HospitalsLoadingState() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-4 border border-slate-300 bg-white px-6 text-center">
      <span className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
      <p className="text-base font-semibold text-slate-800">분석 데이터를 불러오고 있습니다</p>
    </div>
  );
}

function HospitalsErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-rose-100 bg-rose-50 px-6 py-8 text-center">
      <p className="text-base font-semibold text-rose-900">병원 데이터를 불러올 수 없습니다</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-full bg-rose-600 px-5 py-2 text-sm font-semibold text-white"
      >
        다시 시도
      </button>
    </div>
  );
}

import { AdminMobileBottomSheet } from './AdminMobileBottomSheet';
import { useAdminController } from './useAdminController';

type CareTarget = 'all' | 'adult' | 'pediatric' | 'senior';

export function AdminView({ kakao, onRetryHospitals }: AdminViewProps) {
  const adminState = useAdminController(kakao, onRetryHospitals);
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [severeCondition, setSevereCondition] = useState<SevereConditionId>('all');
  const [isSimulationModalOpen, setIsSimulationModalOpen] = useState(false);

  const filteredHospitals = useMemo(() => {
    let filtered = filterByCareTarget(
      adminState.hospitals,
      adminState.currentMode as CareTarget,
      severeCondition,
    );
    if (showAvailableOnly) {
      filtered = filtered.filter(isHospitalAvailable);
    }
    return filtered;
  }, [adminState.hospitals, adminState.currentMode, severeCondition, showAvailableOnly]);

  function handleCareTargetChange(value: CareTarget) {
    adminState.setOptimalMode(value);
    adminState.handleHospitalSelect(null);

    if (value === 'pediatric') {
      setShowAvailableOnly(false);
      if (severeCondition !== 'all' && severeCondition !== 'pediatric_night_holiday') {
        setSevereCondition('pediatric_night_holiday');
      }
      return;
    }

    if (severeCondition === 'pediatric_night_holiday') {
      setSevereCondition('all');
    }
  }

  function handleSevereConditionChange(value: SevereConditionId) {
    setSevereCondition(value);
    adminState.handleHospitalSelect(null);

    if (value === 'pediatric_night_holiday') {
      adminState.setOptimalMode('pediatric');
      setShowAvailableOnly(false);
      return;
    }

    if (value !== 'all' && adminState.currentMode === 'pediatric') {
      adminState.setOptimalMode('all');
      setShowAvailableOnly(false);
    }
  }

  return (
    <div className={`${DASHBOARD_VIEW_ROOT_CLASS} bg-[#eef2f3]`}>
      <div className="hidden lg:block shrink-0">
        <DashboardStatsBar
          districtCount={adminState.districtCount}
          tier1Count={adminState.tier1Count}
          tier2Count={adminState.tier2Count}
          tier3Count={adminState.tier3Count}
          highRiskDistrictCount={adminState.highRiskDistrictCount}
          highRiskThreshold={adminState.riskThreshold}
          loading={adminState.statsLoading}
          hospitalsUpdatedAt={adminState.hospitalsUpdatedAt}
          vulnerabilityUpdatedAt={adminState.vulnerabilityUpdatedAt}
          populationBaseMonth={adminState.populationBaseMonth}
          dataStale={adminState.dataStale}
        />

        <MetricsGuide />

        <div className="flex flex-col items-center border-b border-slate-200/50 bg-[#eef2f3] pb-3 pt-1">
          {adminState.policyStatus ? <PolicyStatusBanner {...adminState.policyStatus} /> : null}
          <button
            onClick={() => setIsSimulationModalOpen(true)}
            className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-4 py-1.5 text-xs font-bold text-white shadow-md ring-1 ring-slate-700 transition-all hover:bg-slate-700 hover:shadow-lg dark:bg-indigo-600 dark:hover:bg-indigo-500"
          >
            <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            AI 인프라 시뮬레이션 결과 분석
          </button>
        </div>
        
        <ResourceRecommendationModal 
          isOpen={isSimulationModalOpen} 
          onClose={() => setIsSimulationModalOpen(false)} 
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:hidden">
        <AdminMobileBottomSheet
          staticMode
          hospitals={filteredHospitals}
          selectedHospital={adminState.selectedHospital}
          onHospitalSelect={adminState.handleHospitalSelect}
          loading={adminState.hospitalsLoading}
          highlightedHospitalName={adminState.highlightedHospitalName}
          currentMode={adminState.currentMode as CareTarget}
          onModeChange={handleCareTargetChange}
          showAvailableOnly={showAvailableOnly}
          onShowAvailableOnlyChange={setShowAvailableOnly}
          severeCondition={severeCondition}
          onSevereConditionChange={handleSevereConditionChange}
          isDetailOpen={adminState.isDetailOpen}
          selectedVulnerability={adminState.selectedVulnerability}
          vulnerabilitySummary={adminState.vulnerabilitySummary ?? undefined}
          onDistrictSelect={adminState.handleDistrictSelect}
          districtCount={adminState.districtCount}
          tier1Count={adminState.tier1Count}
          tier2Count={adminState.tier2Count}
          tier3Count={adminState.tier3Count}
          highRiskDistrictCount={adminState.highRiskDistrictCount}
          highRiskThreshold={adminState.riskThreshold}
          statsLoading={adminState.statsLoading}
          hospitalsUpdatedAt={adminState.hospitalsUpdatedAt}
          vulnerabilityUpdatedAt={adminState.vulnerabilityUpdatedAt}
          populationBaseMonth={adminState.populationBaseMonth}
          dataStale={adminState.dataStale}
          policyStatus={adminState.policyStatus}
        />
      </div>

      <main className={`${DASHBOARD_MAIN_CLASS} max-lg:hidden`}>
        <div className={`hidden lg:flex ${DESKTOP_SIDEBAR_WRAPPER_CLASS}`}>
          <AdminHospitalSidebar
            hospitals={filteredHospitals}
            selectedHospital={adminState.selectedHospital}
            onHospitalSelect={adminState.handleHospitalSelect}
            loading={adminState.hospitalsLoading}
            highlightedHospitalName={adminState.highlightedHospitalName}
            currentMode={adminState.currentMode as CareTarget}
            onModeChange={handleCareTargetChange}
            showAvailableOnly={showAvailableOnly}
            onShowAvailableOnlyChange={setShowAvailableOnly}
            severeCondition={severeCondition}
            onSevereConditionChange={handleSevereConditionChange}
          />
        </div>

        <div className={DASHBOARD_MAP_COL_CLASS}>
          {!kakao.configured ? (
            <div className="flex h-full flex-1 items-center justify-center rounded-xl bg-amber-50 px-6 text-center text-sm text-amber-900">
              지도를 사용할 수 없습니다.
            </div>
          ) : null}

          {kakao.configured && kakao.loading ? (
            <div className="flex h-full flex-1 items-center justify-center text-sm text-indigo-600">
              카카오맵 불러오는 중…
            </div>
          ) : null}

          {kakao.configured && kakao.error ? (
            <div className="flex h-full flex-1 items-center justify-center bg-red-50 px-6 text-center text-sm text-red-700">
              지도를 불러오지 못했습니다.
            </div>
          ) : null}

          {kakao.configured && !kakao.loading && !kakao.error && adminState.hospitalsLoading ? (
            <HospitalsLoadingState />
          ) : null}

          {kakao.configured && !kakao.loading && !kakao.error && adminState.hospitalsError ? (
            <HospitalsErrorState onRetry={onRetryHospitals} />
          ) : null}

          {kakao.configured && !kakao.loading && !kakao.error && !adminState.mapBlocked ? (
            <div className="flex h-full min-h-0 flex-1 flex-col">
              <MapComponent
                hospitals={filteredHospitals}
                selectedHospital={adminState.selectedHospital}
                onHospitalSelect={adminState.handleHospitalSelect}
                selectedDistrict={adminState.selectedDistrict}
                onDistrictSelect={adminState.handleDistrictSelect}
                riskThreshold={adminState.riskThreshold}
                onRiskThresholdChange={adminState.setRiskThreshold}
                highlightedHospitalName={adminState.highlightedHospitalName}
                currentMode={adminState.currentMode}
              />
            </div>
          ) : null}
        </div>

        <div
          className={`${DASHBOARD_DETAIL_COL_CLASS} relative hidden overflow-hidden lg:flex`}
        >
          <div
            className={`${DASHBOARD_DETAIL_INNER_CLASS} transition-transform duration-300 ease-in-out`}
          >
            {adminState.isDetailOpen ? (
              <DetailPanel
                selectedHospital={adminState.selectedHospital}
                vulnerabilityRecord={adminState.selectedVulnerability}
                hospitals={adminState.hospitals}
                vulnerabilitySummary={adminState.vulnerabilitySummary ?? undefined}
                onDistrictSelect={adminState.handleDistrictSelect}
              />
            ) : (
              <PolicyWelcomePanel />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
