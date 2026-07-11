import { useNavigate } from 'react-router-dom';

import { PlatformIntroView } from '../app/PlatformIntroView';
import { DemoWarningBanner } from '../shared/DemoWarningBanner';

/** 공식 소개 라우트는 앱 내부 소개와 동일한 시민 안내 화면을 사용한다. */
export default function PublicAboutPage() {
  const navigate = useNavigate();

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <DemoWarningBanner />
      <div className="relative min-h-0 flex-1">
        <button
        type="button"
        onClick={() => navigate('/')}
        className="fixed bottom-5 right-5 z-50 border border-teal-900 bg-teal-800 px-5 py-3 text-sm font-bold text-white shadow-lg hover:bg-teal-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
      >
        응급의료 지도로 돌아가기
      </button>
        <PlatformIntroView />
      </div>
    </div>
  );
}
