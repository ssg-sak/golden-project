import { useEffect, useState } from 'react';

import { useAppModeStore } from '../../shared/store/appModeStore';

import { MOBILE_SCROLL_Y_CLASS } from '../../shared/lib/mobile-scroll';

export function DemoNoticeModal() {
  const isSimulationMode = useAppModeStore((state) => state.isSimulationMode);
  const [isOpen, setIsOpen] = useState(false);
  const [agreements, setAgreements] = useState({
    mockData: false,
    noBackend: false,
    fakeEta: false,
  });

  const allAgreed = Object.values(agreements).every(Boolean);

  useEffect(() => {
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
      <div className="relative flex max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-[0_0_40px_rgba(225,29,72,0.4)] ring-4 ring-rose-600 md:max-h-[90vh]">
        <div className="shrink-0 bg-gradient-to-r from-rose-700 to-rose-600 px-3 py-3 text-white md:px-6 md:py-5">
          <div className="flex items-center gap-2 md:gap-3">
            <span className="animate-pulse text-xl md:text-3xl" aria-hidden>
              🧪
            </span>
            <div>
              <h2 className="text-base font-extrabold leading-tight tracking-tight md:text-xl">
                [개발 안내] 완성 서비스가 아닌 데모 테스트 화면
              </h2>
              <p className="mt-0.5 text-[11px] font-medium leading-tight text-rose-100 md:text-sm">
                실제 응급의료 안내 서비스가 아니라 기능 검증과 발표 시연을 위한 페이지입니다.
              </p>
            </div>
          </div>
        </div>

        <div className={`flex-1 px-3 py-4 text-sm text-slate-700 md:px-6 md:py-6 ${MOBILE_SCROLL_Y_CLASS}`}>
          <p className="mb-3 border-l-4 border-rose-500 pl-2 text-xs font-bold leading-snug text-slate-900 md:mb-5 md:pl-3 md:text-base">
            이 페이지는 개발자와 검토자가 기능 흐름, UI, 데이터 표시 방식을 확인하기 위한{' '}
            <span className="text-rose-600">검증용 데모</span>입니다.
          </p>

          <div className="space-y-2 md:space-y-4">
            <label
              className={`flex cursor-pointer items-start gap-2 rounded-lg border-2 p-2 transition-colors md:gap-3 md:p-4 ${
                agreements.mockData ? 'border-rose-500 bg-rose-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
              }`}
            >
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-rose-600 md:h-5 md:w-5"
                checked={agreements.mockData}
                onChange={(event) => setAgreements((prev) => ({ ...prev, mockData: event.target.checked }))}
              />
              <span className="text-[11px] leading-snug md:text-sm">
                <strong className="mb-0.5 block text-slate-900">데이터는 개발·검증용일 수 있습니다</strong>
                병원 위치, 병상, 정책 지표는 실제 운영 데이터와 다를 수 있음을 인지했습니다.
              </span>
            </label>

            <label
              className={`flex cursor-pointer items-start gap-2 rounded-lg border-2 p-2 transition-colors md:gap-3 md:p-4 ${
                agreements.noBackend ? 'border-rose-500 bg-rose-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
              }`}
            >
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-rose-600 md:h-5 md:w-5"
                checked={agreements.noBackend}
                onChange={(event) => setAgreements((prev) => ({ ...prev, noBackend: event.target.checked }))}
              />
              <span className="text-[11px] leading-snug md:text-sm">
                <strong className="mb-0.5 block text-slate-900">일부 기능은 실제 서버와 다를 수 있습니다</strong>
                GitHub Pages 데모에서는 실제 서버, 외부 데이터 연결, 지도 연동 조건에 따라 표시가 제한될 수 있습니다.
              </span>
            </label>

            <label
              className={`flex cursor-pointer items-start gap-2 rounded-lg border-2 p-2 transition-colors md:gap-3 md:p-4 ${
                agreements.fakeEta ? 'border-rose-500 bg-rose-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
              }`}
            >
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-rose-600 md:h-5 md:w-5"
                checked={agreements.fakeEta}
                onChange={(event) => setAgreements((prev) => ({ ...prev, fakeEta: event.target.checked }))}
              />
              <span className="text-[11px] leading-snug md:text-sm">
                <strong className="mb-0.5 block text-slate-900">응급 상황 판단에 사용하지 않습니다</strong>
                실제 응급·위급 상황에서는 화면 정보를 기다리지 않고 119 또는 1339에 연락해야 함을 인지했습니다.
              </span>
            </label>
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-100 bg-slate-50 px-3 py-3 md:px-6 md:py-5">
          <button
            onClick={handleClose}
            disabled={!allAgreed}
            className={`w-full rounded-xl py-3 text-sm font-extrabold text-white shadow-md transition-all md:py-4 md:text-base ${
              allAgreed
                ? 'bg-rose-600 shadow-rose-500/30 hover:bg-rose-700 active:scale-95'
                : 'cursor-not-allowed bg-slate-300 opacity-70'
            }`}
          >
            {allAgreed ? '확인하고 데모 화면 보기' : '위 3가지 사항을 확인해 주세요'}
          </button>
        </div>
      </div>
    </div>
  );
}
