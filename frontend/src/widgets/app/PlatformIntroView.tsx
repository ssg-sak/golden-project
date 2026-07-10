export function PlatformIntroView() {
  return (
    <div className="h-full w-full overflow-y-auto bg-slate-50 text-slate-800 font-sans selection:bg-teal-100">
      {/* Print Bar */}
      <div className="max-w-5xl mx-auto px-6 pt-4 flex justify-end">
        <button
          onClick={() => window.print()}
          className="text-xs font-semibold tracking-wide text-teal-700 bg-white border border-teal-200 px-4 py-2 rounded-lg hover:bg-teal-50 transition-colors shadow-sm"
        >
          🖨️ 인쇄 / PDF로 저장
        </button>
      </div>

      {/* Hero Section */}
      <header className="bg-gradient-to-b from-teal-50/50 to-slate-50 border-b border-slate-200/60 pt-16 pb-12 mt-4">
        <div className="max-w-5xl mx-auto px-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 text-xs font-bold tracking-widest text-teal-800 uppercase bg-teal-100/50 rounded-full ring-1 ring-teal-200/50">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
            </span>
            플랫폼 소개 · 대구 골든타임
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight mb-5 text-balance">
            통합 의료 거버넌스 플랫폼
          </h1>
          <p className="text-lg md:text-xl text-slate-600 max-w-3xl leading-relaxed mb-10 text-balance">
            시민에게는 1초라도 빠른 응급실 생존 UX를 제공하고, 행정가에게는 AI 기반의 의료 사각지대 지표를 제공하는 투트랙(Two-Track) 데이터 플랫폼입니다.
          </p>
          <div className="flex flex-wrap gap-x-8 gap-y-4 text-sm text-slate-500 border-t border-slate-200/60 pt-6">
            <span className="flex items-center gap-2"><span className="text-lg">📍</span> <strong className="text-slate-900">지역</strong> 대구광역시 행정동 150곳</span>
            <span className="flex items-center gap-2"><span className="text-lg">👥</span> <strong className="text-slate-900">대상</strong> 시민 · 보호자 · 지역 행정 담당자</span>
            <span className="flex items-center gap-2"><span className="text-lg">🚀</span> <strong className="text-slate-900">현재 상태</strong> 실 데이터 기반 서비스 구현 완료</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12 space-y-20">
        
        {/* Quick Facts */}
        <section>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">한눈에 보기</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-xs font-bold text-teal-600 uppercase tracking-wider mb-2">핵심 문제의식</h3>
              <p className="text-sm font-semibold text-slate-800 leading-snug">단순한 지도 앱이 아닌, 시민 중심 서비스와 거버넌스 격차 진단 통합</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-xs font-bold text-teal-600 uppercase tracking-wider mb-2">데이터 출처</h3>
              <p className="text-sm font-semibold text-slate-800 leading-snug">국립중앙의료원(API), 통계청(인구), 지자체 지정(달빛병원)</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-xs font-bold text-teal-600 uppercase tracking-wider mb-2">주요 기능</h3>
              <p className="text-sm font-semibold text-slate-800 leading-snug">실시간 병상/수술실 모니터링, AI 최적 입지 도출, 환자 넛지(Nudge) UI</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-xs font-bold text-teal-600 uppercase tracking-wider mb-2">안정성 기반 설계</h3>
              <p className="text-sm font-semibold text-slate-800 leading-snug">백그라운드 캐시 폴링, 안전한 폴백(Graceful Degradation)</p>
            </div>
          </div>
        </section>

        {/* Dual-Mode Architecture */}
        <section>
          <div className="mb-8">
            <h2 className="text-xs font-bold text-teal-600 uppercase tracking-widest mb-3">듀얼 모드 아키텍처</h2>
            <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4 tracking-tight">시민의 생존과 행정의 진단을 하나의 플랫폼에</h3>
            <p className="text-lg text-slate-600 max-w-3xl leading-relaxed">이 서비스는 접속 대상에 따라 화면이 완전히 분리되어 작동하는 <strong>듀얼 모드(Dual-Mode)</strong>를 채택했습니다.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="group bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:-translate-y-1 hover:shadow-lg hover:border-red-200 transition-all duration-300">
              <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform">🚑</div>
              <h4 className="text-xl font-bold text-slate-900 mb-3">시민 응급 모드 <span className="block mt-1 text-sm font-medium text-red-500">생존 중심 UX (Nudge 적용)</span></h4>
              <p className="text-slate-600 leading-relaxed">내 위치를 기준으로 진료 가능한 병원을 즉시 보여주고 카카오내비로 바로 연결합니다. 병원 등급에 따라 마커 크기를 다르게 하여(Nudge), <strong>경증 환자가 대형 권역센터로 몰리는 현상을 방지</strong>합니다.</p>
            </div>
            <div className="group bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:-translate-y-1 hover:shadow-lg hover:border-teal-200 transition-all duration-300">
              <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform">📊</div>
              <h4 className="text-xl font-bold text-slate-900 mb-3">정책 분석 모드 <span className="block mt-1 text-sm font-medium text-teal-600">데이터 기반 거버넌스</span></h4>
              <p className="text-slate-600 leading-relaxed">취약 인구(영유아, 노인)와 병원 접근성을 결합한 <strong>사각지대 지수(VDI)</strong>를 히트맵으로 시각화합니다. 직관이 아닌 데이터를 기반으로 한정된 예산과 자원을 최적의 위치에 배치하도록 돕습니다.</p>
            </div>
          </div>
        </section>

        {/* Core Value 1 */}
        <section>
          <div className="mb-8">
            <h2 className="text-xs font-bold text-teal-600 uppercase tracking-widest mb-3">플랫폼의 핵심 가치 1</h2>
            <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4 tracking-tight">데이터 기반 거버넌스 (AI 공간 분석)</h3>
            <p className="text-lg text-slate-600 max-w-3xl leading-relaxed">단순히 현황을 보여주는 것을 넘어, <strong>"다음 신규 병원은 어디에 지정해야 하는가?"</strong>에 대한 과학적 해답을 제시합니다.</p>
          </div>
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="bg-teal-50/50 px-8 py-5 border-b border-slate-200/60">
              <h4 className="font-bold text-teal-900 flex items-center gap-2"><span>🎯</span> Golden Governance Pipeline</h4>
            </div>
            <div className="p-8">
              <ul className="space-y-4">
                <li className="flex gap-4">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-xs mt-0.5">1</div>
                  <div>
                    <strong className="text-slate-900 block mb-1">공간 필터링</strong>
                    <p className="text-slate-600 leading-relaxed">기존 병원 인프라 3km 반경 밖의 '사각지대 보육시설' 및 취약 인구를 우선 필터링합니다.</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-xs mt-0.5">2</div>
                  <div>
                    <strong className="text-slate-900 block mb-1">K-Means 머신러닝 클러스터링</strong>
                    <p className="text-slate-600 leading-relaxed">추출된 수요처들의 위경도를 학습하여 최적 입지 중심점(Centroid) 3곳을 정밀하게 계산해 냅니다.</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-xs mt-0.5">3</div>
                  <div>
                    <strong className="text-slate-900 block mb-1">엔드투엔드 자동화 파이프라인</strong>
                    <p className="text-slate-600 leading-relaxed">백엔드 스크립트가 도출한 최적의 위경도와 배후 수요량 JSON을 프론트엔드 대시보드 지도 위에 즉시 렌더링합니다.</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Core Value 2 */}
        <section>
          <div className="mb-8">
            <h2 className="text-xs font-bold text-teal-600 uppercase tracking-widest mb-3">플랫폼의 핵심 가치 2</h2>
            <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4 tracking-tight">시민의 불편을 최소화하는 안정적 서비스 설계</h3>
            <p className="text-lg text-slate-600 max-w-3xl leading-relaxed">실시간 특이사항 메시지, 응급전용 수술실 등 대량의 공공 API를 가져오면서도 <strong>서버가 절대 멈추지 않는 구조</strong>를 완성했습니다.</p>
          </div>
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="bg-blue-50/50 px-8 py-5 border-b border-slate-200/60">
              <h4 className="font-bold text-blue-900 flex items-center gap-2"><span>🛡️</span> 백그라운드 비동기 캐시 폴링 (Graceful Degradation)</h4>
            </div>
            <div className="p-8">
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <li>
                  <strong className="text-slate-900 flex items-center gap-2 mb-2"><span className="text-red-500">❌</span> 사용자 On-Demand 배제</strong>
                  <p className="text-slate-600 text-sm leading-relaxed">접속자가 1만 명이라고 공공 API를 1만 번 호출하지 않습니다. 외부 API 의존성으로 인한 병목을 원천 차단했습니다.</p>
                </li>
                <li>
                  <strong className="text-slate-900 flex items-center gap-2 mb-2"><span className="text-green-500">✅</span> 주기적 Polling 시스템</strong>
                  <p className="text-slate-600 text-sm leading-relaxed">백엔드가 1~2분 주기로 스스로 최신 API 데이터를 수집하여 메모리에 고속으로 캐싱합니다.</p>
                </li>
                <li>
                  <strong className="text-slate-900 flex items-center gap-2 mb-2"><span className="text-amber-500">⚡</span> 우아한 성능 저하 (Fallback)</strong>
                  <p className="text-slate-600 text-sm leading-relaxed">공공 API가 뻗거나 첫 로딩이 늦어지면, 화면이 깨지는 대신 "실시간 데이터 확인 중"이라는 안전한 폴백(Degraded Mode) UI를 띄웁니다.</p>
                </li>
                <li>
                  <strong className="text-slate-900 flex items-center gap-2 mb-2"><span className="text-purple-500">🧩</span> 관심사 분리(SoC)</strong>
                  <p className="text-slate-600 text-sm leading-relaxed">백엔드는 XML 파싱에만 집중하고, 프론트엔드는 데이터의 Key를 몰라도 동적으로 UI를 렌더링하는 뛰어난 확장성을 가집니다.</p>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Roadmap */}
        <section>
          <div className="mb-10">
            <h2 className="text-xs font-bold text-teal-600 uppercase tracking-widest mb-3">프로젝트 연혁</h2>
            <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4 tracking-tight">개발 진행 상황</h3>
          </div>
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8 bg-white p-6 rounded-2xl border border-slate-200">
              <div className="flex-shrink-0 w-24">
                <span className="text-xs font-bold text-slate-400 font-mono tracking-wider">PHASE 1</span>
                <span className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">완료</span>
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900 mb-1">기본 플랫폼 및 UX 뼈대 완성</h4>
                <p className="text-slate-600 text-sm leading-relaxed">지도 렌더링, 공통 Zustand 스토어 분리, 시민/정책 듀얼 모드 UI 분리 및 컴포넌트 아키텍처 설계를 마쳤습니다.</p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8 bg-white p-6 rounded-2xl border border-teal-500 shadow-md relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-teal-500"></div>
              <div className="flex-shrink-0 w-24">
                <span className="text-xs font-bold text-teal-600 font-mono tracking-wider">PHASE 2</span>
                <span className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800 border border-teal-200">고도화 완료</span>
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900 mb-1">실 데이터 연동 및 AI 거버넌스 구축</h4>
                <p className="text-slate-600 text-sm leading-relaxed">국립중앙의료원 API 연동, 백그라운드 캐시 시스템 최적화, 응급 병상 및 메시지 실시간 파싱, K-Means 최적 입지 모델 구동을 완료했습니다.</p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8 bg-white p-6 rounded-2xl border border-slate-200 opacity-75">
              <div className="flex-shrink-0 w-24">
                <span className="text-xs font-bold text-slate-400 font-mono tracking-wider">PHASE 3</span>
                <span className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-400 border border-slate-200">예정</span>
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900 mb-1">이송 시간 고도화 및 폐쇄망 연계</h4>
                <p className="text-slate-600 text-sm leading-relaxed">도로 트래픽 기반 이송 시간(Routing API)을 반영하고, 전문의 상주 현황 등을 119 내부망과 연계할 수 있는 기술적 확장을 준비 중입니다.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Notice Disclaimer */}
        <section>
          <div className="flex flex-col sm:flex-row gap-6 bg-red-50/50 p-8 rounded-3xl border border-red-100">
            <div className="flex-shrink-0 w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-2xl font-bold">!</div>
            <div>
              <h3 className="text-lg font-bold text-red-900 mb-2">꼭 알아두세요</h3>
              <p className="text-red-800/80 leading-relaxed">
                이 서비스는 <strong>119를 대신하지 않습니다.</strong> 실제 위급 상황에서는 즉시 <strong>119</strong> 또는 <strong>응급의료 정보센터(1339)</strong>로 연락하세요. 플랫폼에서 제공하는 거리와 병상 색상, 실시간 메시지는 공공 API 응답을 기준으로 하므로 실제 병원 상황과 다를 수 있습니다.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-100 border-t border-slate-200 py-12 text-center px-6">
        <p className="text-lg font-bold text-slate-700 mb-3 text-balance max-w-2xl mx-auto">
          골든타임을 사수하기 위해 시민에게는 올바른 행동을 유도하고,<br className="hidden sm:block" /> 정책 결정자에게는 과학적 예산 배분의 근거를 제공합니다.
        </p>
        <p className="text-sm text-slate-500 max-w-2xl mx-auto">
          본 소개 페이지는 최신 데이터 인프라 아키텍처와 프론트엔드 UI/UX 설계 철학을 반영한<br className="hidden sm:block" /> 대구 골든타임 플랫폼의 비전을 담고 있습니다.
        </p>
      </footer>
    </div>
  );
}
