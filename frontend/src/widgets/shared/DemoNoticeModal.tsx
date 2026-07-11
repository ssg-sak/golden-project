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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-md transition-opacity">
      <div className="relative w-full max-w-lg max-h-[85dvh] md:max-h-[90vh] flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_0_40px_rgba(225,29,72,0.4)] ring-4 ring-rose-600 animate-in fade-in zoom-in-95 duration-300">
        
        {/* 헤더 (고정) */}
        <div className="shrink-0 bg-gradient-to-r from-rose-700 to-rose-600 px-3 py-3 md:px-6 md:py-5 text-white">
          <div className="flex items-center gap-2 md:gap-3">
            <span className="text-xl md:text-3xl animate-pulse" aria-hidden>🚨</span>
            <div>
              <h2 className="text-base md:text-xl font-extrabold tracking-tight leading-tight">
                [경고] 포트폴리오 데모 전용
              </h2>
              <p className="mt-0.5 text-[11px] md:text-sm text-rose-100 font-medium leading-tight">본 시스템은 실제 응급의료 서비스가 아닙니다.</p>
            </div>
          </div>
        </div>
        
        {/* 본문 (스크롤 영역) */}
        <div className="flex-1 overflow-y-auto px-3 py-4 md:px-6 md:py-6 text-sm text-slate-700">
          <p className="mb-3 md:mb-5 text-xs md:text-base font-bold text-slate-900 border-l-4 border-rose-500 pl-2 md:pl-3 leading-snug">
            기획 및 UI/UX 시연을 위한 <span className="text-rose-600">가상 데모</span>입니다.
          </p>
          
          <div className="space-y-2 md:space-y-4">
            <label className={`flex cursor-pointer items-start gap-2 md:gap-3 rounded-lg border-2 p-2 md:p-4 transition-colors ${agreements.mockData ? 'border-rose-500 bg-rose-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}`}>
              <input 
                type="checkbox" 
                className="mt-0.5 h-4 w-4 md:h-5 md:w-5 shrink-0 cursor-pointer accent-rose-600" 
                checked={agreements.mockData}
                onChange={(e) => setAgreements(prev => ({ ...prev, mockData: e.target.checked }))}
              />
              <span className="leading-snug text-[11px] md:text-sm">
                <strong className="block text-slate-900 mb-0.5">좌표/길찾기는 더미 데이터입니다</strong>
                실제 병원 위치가 아니므로, 오차가 발생함을 인지했습니다.
              </span>
            </label>

            <label className={`flex cursor-pointer items-start gap-2 md:gap-3 rounded-lg border-2 p-2 md:p-4 transition-colors ${agreements.noBackend ? 'border-rose-500 bg-rose-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}`}>
              <input 
                type="checkbox" 
                className="mt-0.5 h-4 w-4 md:h-5 md:w-5 shrink-0 cursor-pointer accent-rose-600" 
                checked={agreements.noBackend}
                onChange={(e) => setAgreements(prev => ({ ...prev, noBackend: e.target.checked }))}
              />
              <span className="leading-snug text-[11px] md:text-sm">
                <strong className="block text-slate-900 mb-0.5">프론트 단독 구동입니다</strong>
                백엔드와 분리되어 있어 필터 적용 시 오작동할 수 있음을 인지했습니다.
              </span>
            </label>

            <label className={`flex cursor-pointer items-start gap-2 md:gap-3 rounded-lg border-2 p-2 md:p-4 transition-colors ${agreements.fakeEta ? 'border-rose-500 bg-rose-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}`}>
              <input 
                type="checkbox" 
                className="mt-0.5 h-4 w-4 md:h-5 md:w-5 shrink-0 cursor-pointer accent-rose-600" 
                checked={agreements.fakeEta}
                onChange={(e) => setAgreements(prev => ({ ...prev, fakeEta: e.target.checked }))}
              />
              <span className="leading-snug text-[11px] md:text-sm">
                <strong className="block text-slate-900 mb-0.5">병상 수/ETA는 가상 시나리오입니다</strong>
                잔여 시간 및 병상은 실제 현장과 무관함을 인지했습니다.
              </span>
            </label>
          </div>
        </div>
        
        {/* 푸터 (고정) */}
        <div className="shrink-0 bg-slate-50 px-3 py-3 md:px-6 md:py-5 border-t border-slate-100">
          <button
            onClick={handleClose}
            disabled={!allAgreed}
            className={`w-full rounded-xl py-3 md:py-4 text-sm md:text-base font-extrabold text-white shadow-md transition-all ${
              allAgreed 
                ? 'bg-rose-600 hover:bg-rose-700 active:scale-95 shadow-rose-500/30' 
                : 'bg-slate-300 cursor-not-allowed opacity-70'
            }`}
          >
            {allAgreed ? '모두 동의하고 데모 시작하기' : '위 3가지 사항을 체크해 주세요'}
          </button>
        </div>
      </div>
    </div>
  );
}
