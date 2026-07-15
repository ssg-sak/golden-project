import { useEffect } from 'react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div
        className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 id="modal-title" className="text-xl font-extrabold text-slate-800">
            대구 골든타임 <span className="ml-2 text-sm font-medium text-blue-600">서비스 안내</span>
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="닫기"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-6 text-slate-600">
          <div className="space-y-6">
            <section className="rounded-xl bg-blue-50/50 p-5 ring-1 ring-blue-100/50">
              <p className="text-[15px] leading-relaxed">
                <strong>대구 골든타임</strong>은 가까운 응급기관, 병상, 차량 이동시간, 중증질환 수용 가능 정보를
                한 화면에서 확인하는 교육용 서비스입니다.
              </p>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-2 text-base font-bold text-slate-900">시민 화면</h3>
              <p className="text-sm leading-relaxed text-slate-600">
                현재 위치 기준으로 가까운 응급기관을 보여줍니다. 심근경색, 절단, 화상처럼 상황별로 확인해야 할
                수용 가능 정보도 함께 볼 수 있습니다.
              </p>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-2 text-base font-bold text-slate-900">정책 화면</h3>
              <p className="text-sm leading-relaxed text-slate-600">
                행정동별로 응급기관 접근성과 보호 필요 인구를 함께 보여줍니다. 화면의 후보지는 확정안이 아니라
                현장 확인 전에 먼저 살펴볼 참고 위치입니다.
              </p>
            </section>

            <section className="rounded-xl border border-teal-200 bg-teal-50 p-5">
              <h3 className="mb-2 text-base font-bold text-slate-900">주의</h3>
              <p className="text-sm leading-relaxed text-slate-700">
                실제 응급·위급 상황에서는 화면을 해석하기보다 즉시 119 또는 1339 안내를 따르세요.
              </p>
            </section>
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-100 bg-slate-50/50 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
