import { useEffect } from 'react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  // ESC 키 닫기 지원
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* 배경 오버레이 */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* 모달 콘텐츠 */}
      <div 
        className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 id="modal-title" className="text-xl font-extrabold text-slate-800">
            대구 골든타임 <span className="ml-2 text-sm font-medium text-blue-600">플랫폼 아키텍처 및 비전</span>
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
            
            {/* 요약 섹션 */}
            <section className="rounded-xl bg-blue-50/50 p-5 ring-1 ring-blue-100/50">
              <p className="text-[15px] leading-relaxed">
                <strong>대구 골든타임</strong>은 시민에게는 1초라도 빠른 응급실 생존 UX를 제공하고, 행정가에게는 AI 기반의 의료 사각지대 지표를 제공하는 <strong>투트랙(Two-Track) 데이터 거버넌스 플랫폼</strong>입니다.
              </p>
            </section>

            {/* 투 트랙 소개 & 아키텍처 */}
            <div className="space-y-6">
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <h3 className="mb-2 text-base font-bold text-slate-900">듀얼 모드 아키텍처</h3>
                <p className="text-sm leading-relaxed text-slate-600 mb-2">
                  <strong>🚑 시민 응급 모드 (생존 중심 UX):</strong> 내 위치 기반으로 진료 가능한 병원을 즉시 안내하며, 병원 등급에 따라 마커 크기를 다르게 하는 넛지(Nudge) 디자인을 적용해 경증 환자의 권역센터 쏠림을 방지합니다.
                </p>
                <p className="text-sm leading-relaxed text-slate-600">
                  <strong>📊 정책 분석 모드 (데이터 기반 거버넌스):</strong> 취약 인구(영유아, 노인)와 병원 접근성을 결합한 사각지대 지수(VDI)를 도출하고 히트맵으로 시각화합니다.
                </p>
              </section>

              <div className="grid gap-6 md:grid-cols-2">
                <section className="rounded-xl border border-purple-200 bg-white p-5 shadow-sm">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  </div>
                  <h3 className="mb-2 text-base font-bold text-slate-900">AI 공간 분석 K-Means</h3>
                  <p className="text-sm leading-relaxed text-slate-600">
                    기존 병원 인프라 바깥의 수요처를 추출, K-Means 알고리즘으로 최적의 신규 입지 중심점을 자동 산출합니다.
                  </p>
                </section>

                <section className="rounded-xl border border-emerald-200 bg-white p-5 shadow-sm">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                    </svg>
                  </div>
                  <h3 className="mb-2 text-base font-bold text-slate-900">백그라운드 캐시 폴링</h3>
                  <p className="text-sm leading-relaxed text-slate-600">
                    공공 API 장애 시에도 화면이 멈추지 않는 Graceful Degradation 설계로 안전성을 극대화했습니다.
                  </p>
                </section>
              </div>
            </div>

            {/* 핵심 가치 키워드 */}
            <section className="mt-4 flex flex-wrap items-center justify-center gap-2 border-t border-slate-100 pt-6">
              <span className="rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">#듀얼모드아키텍처</span>
              <span className="rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">#AI최적입지분석</span>
              <span className="rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">#GracefulDegradation</span>
            </section>
            
          </div>
        </div>
        
        {/* 하단 푸터 */}
        <div className="flex justify-end border-t border-slate-100 bg-slate-50/50 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
          >
            응급실 바로 찾기
          </button>
        </div>
      </div>
    </div>
  );
}
