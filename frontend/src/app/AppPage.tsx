import { useCallback } from 'react';

import { useKakaoLoader } from 'react-kakao-maps-sdk';

import { isKakaoMapConfigured, KAKAO_MAP_APP_KEY } from '../shared/config/kakao';
import { useAppModeStore } from '../shared/store/appModeStore';
import { useHospitalStore } from '../shared/store/hospitalStore';
import { AdminView } from '../widgets/app/AdminView';
import { CitizenView } from '../widgets/app/CitizenView';
import { GlobalNavigationBar } from '../widgets/app/GlobalNavigationBar';
import { PlatformIntroView } from '../widgets/app/PlatformIntroView';
import { DisclaimerBanner } from '../widgets/shared/DisclaimerBanner';
import { SimulationBanner } from '../widgets/shared/SimulationBanner';
import { DemoWarningBanner } from '../widgets/shared/DemoWarningBanner';
import { DemoNoticeModal } from '../widgets/shared/DemoNoticeModal';
import { GovernanceFooter } from '../widgets/shared/GovernanceFooter';

export default function AppPage() {
  const viewMode = useAppModeStore((state) => state.viewMode);
  const kakaoConfigured = isKakaoMapConfigured();
  const [kakaoLoading, kakaoError] = useKakaoLoader({
    appkey: KAKAO_MAP_APP_KEY,
  });

  const fetchHospitals = useHospitalStore((state) => state.fetchHospitals);

  const handleRetryHospitals = useCallback(() => {
    void fetchHospitals();
  }, [fetchHospitals]);

  const kakao = {
    configured: kakaoConfigured,
    loading: kakaoLoading,
    error: kakaoError ?? null,
  };

  return (
    <div className="flex min-h-dvh flex-col bg-slate-100">
      <DemoNoticeModal />
      
      {/* 모바일에서는 지도 위로 플로팅, 데스크톱에서는 정상 흐름 */}
      <div className="fixed top-0 left-0 right-0 z-50 flex flex-col lg:relative lg:z-auto">
        <DemoWarningBanner />
        <GlobalNavigationBar />
        <SimulationBanner />
        <DisclaimerBanner />
      </div>

      <div className="flex min-h-0 flex-1 flex-col pt-[var(--mobile-nav-height,0px)] lg:pt-0">
        {viewMode === 'citizen' && (
          <div key="citizen" className="flex min-h-0 flex-1 flex-col transition-opacity duration-200">
            <CitizenView kakao={kakao} onRetryHospitals={handleRetryHospitals} />
          </div>
        )}
        {viewMode === 'admin' && (
          <div key="admin" className="flex min-h-0 flex-1 flex-col transition-opacity duration-200">
            <AdminView kakao={kakao} onRetryHospitals={handleRetryHospitals} />
          </div>
        )}
        {viewMode === 'intro' && (
          <div key="intro" className="flex min-h-0 flex-1 flex-col transition-opacity duration-200 bg-[#eef2f0]">
            <PlatformIntroView />
          </div>
        )}
      </div>

      <GovernanceFooter variant="compact" />
    </div>
  );
}
