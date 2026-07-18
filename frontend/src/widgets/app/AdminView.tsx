import { useState, useMemo } from 'react';
import { hasReportedGeneralErBed } from '../../shared/lib/bed-status';
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
import { PolicyDataPipeline } from '../map-dashboard/PolicyDataPipeline';
import { PolicyWelcomePanel } from '../map-dashboard/PolicyWelcomePanel';

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
  const adminState = useAdminController();
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [severeCondition, setSevereCondition] = useState<SevereConditionId>('all');

  const filteredHospitals = useMemo(() => {
    let filtered = filterByCareTarget(
      adminState.hospitals,
      adminState.currentMode as CareTarget,
      severeCondition,
    );
    if (showAvailableOnly) {
      filtered = filtered.filter(hasReportedGeneralErBed);
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

        <PolicyDataPipeline
          districtCount={adminState.districtCount}
          hospitalCount={adminState.hospitals.length}
          highRiskDistrictCount={adminState.highRiskDistrictCount}
          highRiskThreshold={adminState.riskThreshold}
          populationBaseMonth={adminState.populationBaseMonth}
        />

        <div className="flex flex-col items-center border-b border-slate-200/50 bg-[#eef2f3] pb-3 pt-1">
          {adminState.policyStatus ? <PolicyStatusBanner {...adminState.policyStatus} /> : null}
        </div>
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
                vulnerabilityRecords={adminState.vulnerabilityData}
                districtFeatures={adminState.vulnerabilityFeatures}
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
