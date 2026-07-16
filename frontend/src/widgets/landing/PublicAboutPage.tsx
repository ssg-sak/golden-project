import { useNavigate } from 'react-router-dom';

import { PlatformIntroView } from '../app/PlatformIntroView';
export default function PublicAboutPage() {
  const navigate = useNavigate();

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
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
