import { useState, useEffect } from 'react';
import { useAppModeStore } from '../../shared/store/appModeStore';

export function DemoNoticeModal() {
  const isSimulationMode = useAppModeStore((state) => state.isSimulationMode);
  const [isOpen, setIsOpen] = useState(false);
  
  // 3가지 필수 체크 항목 상태
  const [agreements, setAgreements] = useState({
    mockData: false,
    noBackend: false,
    fakeEta: false,
  });

  const allAgreed = Object.values(agreements).every(Boolean);

  useEffect(() => {
    // 세션 스토리지 검사 (한 번 동의했으면 세션 동안 안 뜸)
    const hasSeenNotice = sessionStorage.getItem('hasSeenDemoNotice');
    if (isSimulationMode && !hasSeenNotice) {
      setIsOpen(true);
    }
  }, [isSimulationMode]);

  const handleClose = () => {
    if (!allAgreed) return;
    sessionStorage.setItem('hasSeenDemoNotice', 'true');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md transition-opacity">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-[0_0_40px_rgba(225,29,72,0.4)] ring-4 ring-rose-600 animate-in fade-in zoom-in-95 duration-300">
        
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-rose-700 to-rose-600 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <span className="text-3xl animate-pulse" aria-hidden>🚨</span>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight">
                [강력 경고] 포트폴리오 시연 전용
              </h2>
              <p className="mt-1 text-sm text-rose-100 font-medium">본 시스템은 실제 응급의료 서비스가 아닙니다.</p>
            </div>
          </div>
        </div>
        
        {/* 본문 */}
        <div className="px-6 py-6 text-sm text-slate-700">
          <p className="mb-5 text-base font-bold text-slate-900 border-l-4 border-rose-500 pl-3">
            본 페이지는 기획 및 UI/UX 시연을 위해 만들어진 <span className="text-rose-600">가상의 목업(Mock-up) 데모</span>입니다.
          </p>
          
          <div className="space-y-4">
            <label className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-colors ${agreements.mockData ? 'border-rose-500 bg-rose-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}`}>
              <input 
                type="checkbox" 
                className="mt-0.5 h-5 w-5 cursor-pointer accent-rose-600" 
                checked={agreements.mockData}
                onChange={(e) => setAgreements(prev => ({ ...prev, mockData: e.target.checked }))}
              />
              <span className="leading-snug">
                <strong className="block text-slate-900 mb-0.5">좌표 및 길찾기는 더미 데이터입니다</strong>
                실제 병원 위치가 아니므로, 카카오내비 연동 및 위경도 표출 시 오차가 발생함을 인지했습니다.
              </span>
            </label>

            <label className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-colors ${agreements.noBackend ? 'border-rose-500 bg-rose-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}`}>
              <input 
                type="checkbox" 
                className="mt-0.5 h-5 w-5 cursor-pointer accent-rose-600" 
                checked={agreements.noBackend}
                onChange={(e) => setAgreements(prev => ({ ...prev, noBackend: e.target.checked }))}
              />
              <span className="leading-snug">
                <strong className="block text-slate-900 mb-0.5">백엔드 서버와 분리된 프론트 단독 구동입니다</strong>
                필터 기능('진료 가능 병원만 보기' 등) 적용 시 정적 데이터의 한계로 오작동할 수 있음을 인지했습니다.
              </span>
            </label>

            <label className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-colors ${agreements.fakeEta ? 'border-rose-500 bg-rose-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}`}>
              <input 
                type="checkbox" 
                className="mt-0.5 h-5 w-5 cursor-pointer accent-rose-600" 
                checked={agreements.fakeEta}
                onChange={(e) => setAgreements(prev => ({ ...prev, fakeEta: e.target.checked }))}
              />
              <span className="leading-snug">
                <strong className="block text-slate-900 mb-0.5">병상 수 및 ETA는 가상 시나리오입니다</strong>
                지도에 표시되는 병상 수나 잔여 시간은 실제 현장 상황과 전혀 무관한 렌더링임을 인지했습니다.
              </span>
            </label>
          </div>
        </div>
        
        {/* 푸터 */}
        <div className="bg-slate-50 px-6 py-5 border-t border-slate-100">
          <button
            onClick={handleClose}
            disabled={!allAgreed}
            className={`w-full rounded-xl py-4 text-base font-extrabold text-white shadow-md transition-all ${
              allAgreed 
                ? 'bg-rose-600 hover:bg-rose-700 active:scale-95 shadow-rose-500/30' 
                : 'bg-slate-300 cursor-not-allowed opacity-70'
            }`}
          >
            {allAgreed ? '모두 동의하고 포트폴리오 데모 시작하기' : '위 3가지 사항을 모두 체크해 주세요'}
          </button>
        </div>
      </div>
    </div>
  );
}
