import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef } from 'react';

import { useKakaoLoader } from 'react-kakao-maps-sdk';

import { isKakaoMapConfigured, KAKAO_MAP_APP_KEY } from '../shared/config/kakao';
import { useAppModeStore } from '../shared/store/appModeStore';
import { useHospitalStore } from '../shared/store/hospitalStore';
import { CitizenView } from '../widgets/app/CitizenView';
import { GlobalNavigationBar } from '../widgets/app/GlobalNavigationBar';
import { DisclaimerBanner } from '../widgets/shared/DisclaimerBanner';
import { GovernanceFooter } from '../widgets/shared/GovernanceFooter';

const AdminView = lazy(() => import('../widgets/app/AdminView').then((module) => ({ default: module.AdminView })));
const PlatformIntroView = lazy(() => import('../widgets/app/PlatformIntroView').then((module) => ({ default: module.PlatformIntroView })));

export default function AppPage() {
  const navigationRef = useRef<HTMLDivElement>(null);
  const viewMode = useAppModeStore((state) => state.viewMode);
  const setViewMode = useAppModeStore((state) => state.setViewMode);
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

  // 지도 앱 모드(시민, 관리자)일 때만 body에 app-mode 클래스를 추가하여
  // index.css의 overflow:hidden이 소개 페이지 등 일반 스크롤 뷰에 영향을 주지 않도록 한다.
  useEffect(() => {
    if (viewMode !== 'intro') {
      document.body.classList.add('app-mode');
    } else {
      document.body.classList.remove('app-mode');
    }
    return () => {
      document.body.classList.remove('app-mode');
    };
  }, [viewMode]);

  useLayoutEffect(() => {
    const navigation = navigationRef.current;
    if (!navigation) return;

    const updateMobileNavigationHeight = () => {
      document.documentElement.style.setProperty(
        '--mobile-nav-height',
        `${navigation.getBoundingClientRect().height}px`,
      );
    };

    updateMobileNavigationHeight();
    const resizeObserver = new ResizeObserver(updateMobileNavigationHeight);
    resizeObserver.observe(navigation);
    // 아이폰 주소창 높이 변화에 대응
    window.visualViewport?.addEventListener('resize', updateMobileNavigationHeight);
    window.visualViewport?.addEventListener('scroll', updateMobileNavigationHeight);

    return () => {
      resizeObserver.disconnect();
      window.visualViewport?.removeEventListener('resize', updateMobileNavigationHeight);
      window.visualViewport?.removeEventListener('scroll', updateMobileNavigationHeight);
      document.documentElement.style.removeProperty('--mobile-nav-height');
    };
  }, []);

  useEffect(() => {
    const desktopQuery = window.matchMedia('(min-width: 1024px)');

    const keepMobileOnCitizenMode = () => {
      if (!desktopQuery.matches && useAppModeStore.getState().viewMode === 'admin') {
        setViewMode('citizen');
      }
    };

    keepMobileOnCitizenMode();
    desktopQuery.addEventListener('change', keepMobileOnCitizenMode);

    return () => {
      desktopQuery.removeEventListener('change', keepMobileOnCitizenMode);
    };
  }, [setViewMode]);

  return (
    <div className={`flex max-w-[100vw] flex-col overflow-hidden bg-slate-100 ${
      viewMode === 'citizen'
        ? 'h-[100dvh] max-h-[100dvh]'
        : 'h-[100dvh] max-h-[100dvh] lg:h-auto lg:max-h-none lg:min-h-dvh'
    }`}>
      
      {/* 모바일에서는 지도 위로 플로팅, 데스크톱에서는 정상 흐름 */}
      <div
        ref={navigationRef}
        className="fixed top-0 left-0 right-0 z-50 flex flex-col lg:relative lg:z-auto"
      >
        <GlobalNavigationBar />
        <DisclaimerBanner />
      </div>

      <div className={`flex min-h-0 flex-1 flex-col overflow-hidden pt-[var(--mobile-nav-height,0px)] ${
        viewMode !== 'citizen' ? 'lg:overflow-visible lg:pt-0' : 'lg:pt-0'
      }`}>
        {viewMode === 'citizen' && (
          <div key="citizen" className="flex min-h-0 flex-1 flex-col overflow-hidden transition-opacity duration-200">
            <CitizenView kakao={kakao} onRetryHospitals={handleRetryHospitals} />
          </div>
        )}
        <Suspense fallback={<div className="flex min-h-0 flex-1 items-center justify-center text-sm font-semibold text-slate-600">화면을 불러오는 중입니다.</div>}>
          {viewMode === 'admin' && (
            <div key="admin" className="flex min-h-0 flex-1 flex-col overflow-hidden transition-opacity duration-200">
              <AdminView kakao={kakao} onRetryHospitals={handleRetryHospitals} />
            </div>
          )}
          {viewMode === 'intro' && (
            <div key="intro" className="flex min-h-0 flex-1 flex-col overflow-y-auto transition-opacity duration-200 bg-[#eef2f0]">
              <PlatformIntroView />
            </div>
          )}
        </Suspense>
      </div>

      <GovernanceFooter variant="compact" className="hidden shrink-0 lg:block" />
    </div>
  );
}
