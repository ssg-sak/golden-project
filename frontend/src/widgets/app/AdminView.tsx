

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

export function AdminView({ kakao, onRetryHospitals }: AdminViewProps) {
  const adminState = useAdminController(kakao, onRetryHospitals);

  return (
    <div className={`${DASHBOARD_VIEW_ROOT_CLASS} bg-[#eef2f3]`}>
      <div className="hidden lg:block shrink-0">
        <DashboardStatsBar
          districtCount={adminState.vulnerabilityError ? 0 : adminState.vulnerabilityData.length}
          tier1Count={adminState.hospitals.filter((h) => h.tier === 1).length}
          tier2Count={adminState.hospitals.filter((h) => h.tier === 2).length}
          tier3Count={adminState.hospitals.filter((h) => h.tier === 3).length}
          highRiskDistrictCount={adminState.highRiskDistrictCount}
          highRiskThreshold={adminState.riskThreshold}
          loading={adminState.statsLoading}
          hospitalsUpdatedAt={adminState.hospitalsUpdatedAt}
          vulnerabilityUpdatedAt={adminState.vulnerabilityUpdatedAt}
          totalHospitalsDelta={adminState.totalHospitalsDelta}
          highRiskDelta={adminState.highRiskDelta}
        />

        <MetricsGuide />

        {adminState.policyStatus ? <PolicyStatusBanner {...adminState.policyStatus} /> : null}
      </div>

      <main className={DASHBOARD_MAIN_CLASS}>
        <div className="block lg:hidden">
          <AdminMobileBottomSheet
            hospitals={adminState.hospitals}
            selectedHospital={adminState.selectedHospital}
            onHospitalSelect={adminState.handleHospitalSelect}
            loading={adminState.hospitalsLoading}
            highlightedHospitalName={adminState.highlightedHospitalName}
            currentMode={adminState.currentMode as 'all' | 'adult' | 'pediatric' | 'senior'}
            onModeChange={(val) => adminState.setOptimalMode(val)}
            isDetailOpen={adminState.isDetailOpen}
            selectedVulnerability={adminState.selectedVulnerability}
            vulnerabilitySummary={adminState.vulnerabilitySummary ?? undefined}
            onDistrictSelect={adminState.handleDistrictSelect}
            
            // 추가 Props for Mobile PC-Info Overlay
            districtCount={adminState.vulnerabilityError ? 0 : adminState.vulnerabilityData.length}
            highRiskDistrictCount={adminState.highRiskDistrictCount}
            highRiskThreshold={adminState.riskThreshold}
            statsLoading={adminState.statsLoading}
            hospitalsUpdatedAt={adminState.hospitalsUpdatedAt}
            vulnerabilityUpdatedAt={adminState.vulnerabilityUpdatedAt}
            totalHospitalsDelta={adminState.totalHospitalsDelta}
            highRiskDelta={adminState.highRiskDelta}
            policyStatus={adminState.policyStatus}
          />
        </div>

        <div className={`hidden lg:flex ${DESKTOP_SIDEBAR_WRAPPER_CLASS}`}>
          <AdminHospitalSidebar
            hospitals={adminState.hospitals}
            selectedHospital={adminState.selectedHospital}
            onHospitalSelect={adminState.handleHospitalSelect}
            loading={adminState.hospitalsLoading}
            highlightedHospitalName={adminState.highlightedHospitalName}
            currentMode={adminState.currentMode as 'all' | 'adult' | 'pediatric' | 'senior'}
            onModeChange={(val) => adminState.setOptimalMode(val)}
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
                hospitals={adminState.hospitals}
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
          className={`${DASHBOARD_DETAIL_COL_CLASS} relative overflow-hidden hidden lg:block`}
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
