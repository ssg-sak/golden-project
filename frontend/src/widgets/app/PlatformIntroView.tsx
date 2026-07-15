const serviceSteps = [
  [
    '01',
    '현재 위치를 확인합니다',
    '위치 사용을 허용하면 가까운 응급기관을 거리와 차량 이동시간 기준으로 확인할 수 있습니다.',
  ],
  [
    '02',
    '상황에 맞는 병원을 좁힙니다',
    '심근경색, 절단, 화상, 소아 야간진료처럼 상황별로 확인해야 할 수용 가능 정보를 함께 봅니다.',
  ],
  [
    '03',
    '전화 확인 후 이동합니다',
    '병상과 수용 가능 여부는 계속 바뀔 수 있으므로 출발 전 병원, 119, 1339 확인이 우선입니다.',
  ],
] as const;

const policyAudienceItems = [
  {
    title: '시민',
    description: '우리 동네 응급의료 접근성이 어떤 상태인지 쉽게 확인할 수 있습니다.',
  },
  {
    title: '의료기관·지역 관계자',
    description: '진료 공백, 이송 부담, 지역 수요를 함께 논의하는 공통 자료로 사용할 수 있습니다.',
  },
  {
    title: '정책 담당자',
    description: '새 거점, 이동 지원, 야간·휴일 진료 연계 후보를 데이터로 좁혀 볼 수 있습니다.',
  },
] as const;

const analysisItems = [
  [
    '우리 동네 응급 공백 보기',
    '병원 위치만 보는 것이 아니라 보호가 필요한 인구와 병원 접근성을 함께 봅니다.',
  ],
  [
    '실제 이동 부담 반영',
    '직선거리만 쓰지 않고 도로 이동시간을 함께 보며, 멀리 돌아가야 하는 지역을 놓치지 않도록 했습니다.',
  ],
  [
    '논의를 시작하기 위한 후보',
    '화면의 후보지는 확정안이 아니라 현장 조사 전에 먼저 살펴볼 위치입니다.',
  ],
] as const;

export function PlatformIntroView() {
  return (
    <div className="h-full w-full overflow-y-auto bg-[#f4f6f7] text-slate-900 selection:bg-teal-100">
      <div className="border-b border-slate-300 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 text-xs text-slate-600 md:px-8">
          <p>대구 응급의료 접근성 안내</p>
          <button
            type="button"
            onClick={() => window.print()}
            className="border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:border-teal-700 hover:text-teal-800"
          >
            인쇄·PDF 저장
          </button>
        </div>
      </div>

      <header className="border-b-4 border-teal-700 bg-[#123c4a] text-white">
        <div className="mx-auto max-w-6xl px-5 py-12 md:px-8 md:py-16">
          <p className="mb-4 text-sm font-bold tracking-[0.18em] text-teal-200">대구 골든타임 서비스 안내</p>
          <h1 className="max-w-4xl text-3xl font-extrabold leading-tight tracking-tight md:text-5xl">
            가까운 병원만이 아니라,
            <br className="hidden md:block" /> 지금 받을 수 있는 응급 도움을 봅니다
          </h1>
          <p className="mt-6 max-w-3xl border-l-4 border-teal-300 pl-5 text-base leading-7 text-slate-100 md:text-lg">
            이 서비스는 시민이 응급기관을 빠르게 확인하고, 지역 관계자가 응급의료 공백을 함께 논의할 수 있도록
            만든 교육용 지도입니다.
          </p>
        </div>
      </header>

      <div className="border-b border-amber-300 bg-amber-50">
        <div className="mx-auto flex max-w-6xl gap-4 px-5 py-5 md:px-8">
          <strong className="shrink-0 text-amber-900">긴급 안내</strong>
          <p className="text-sm leading-6 text-amber-950">
            흉통, 심한 통증, 의식 저하, 호흡곤란 등 위급 증상이 있으면 지도를 보지 말고 즉시 <strong>119</strong>에 연락하세요.
          </p>
        </div>
      </div>

      <div className="border-b border-cyan-200 bg-cyan-50">
        <div className="mx-auto grid max-w-6xl gap-4 px-5 py-5 text-sm leading-6 text-cyan-950 md:grid-cols-[220px_1fr] md:px-8">
          <strong className="text-cyan-900">달빛어린이병원이 필요한 이유</strong>
          <p>
            이 프로젝트는 일반 병원 분포가 아니라 응급환경을 봅니다. 달빛어린이병원은 야간·휴일 소아 진료 공백을 줄이고
            응급실이 중증 환자 대응에 집중하도록 돕는 보완 자원입니다.
          </p>
        </div>
      </div>

      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-4 px-5 py-5 text-sm leading-6 text-slate-700 md:grid-cols-[220px_1fr] md:px-8">
          <strong className="text-slate-900">모바일 화면 구성</strong>
          <p>
            모바일에서는 지도보다 병원 목록, 상황별 필터, 전화 확인, 길찾기처럼 현장에서 바로 필요한 행동을 우선 배치했습니다.
          </p>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-5 py-10 md:px-8 md:py-14">
        <section className="grid border border-slate-300 bg-white lg:grid-cols-[1fr_340px]">
          <div className="p-6 md:p-9">
            <p className="text-sm font-bold text-teal-800">시민 이용 안내</p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight md:text-3xl">병원을 찾을 때 이렇게 이용하세요</h2>
            <div className="mt-8 divide-y divide-slate-200 border-y border-slate-300">
              {serviceSteps.map(([number, title, description]) => (
                <div key={number} className="grid gap-3 py-6 sm:grid-cols-[64px_180px_1fr] sm:items-start">
                  <span className="font-mono text-xl font-bold text-teal-700">{number}</span>
                  <h3 className="font-bold text-slate-900">{title}</h3>
                  <p className="text-sm leading-6 text-slate-600">{description}</p>
                </div>
              ))}
            </div>
          </div>

          <aside className="border-t border-slate-300 bg-slate-100 p-6 md:p-8 lg:border-l lg:border-t-0">
            <h2 className="text-lg font-extrabold">알아두면 좋은 연락처</h2>
            <dl className="mt-6 divide-y divide-slate-300 border-y border-slate-300">
              <div className="py-5">
                <dt className="text-sm text-slate-600">응급 신고·구급 요청</dt>
                <dd className="mt-1 text-3xl font-black text-rose-700">119</dd>
              </div>
              <div className="py-5">
                <dt className="text-sm text-slate-600">보건복지 상담센터</dt>
                <dd className="mt-1 text-2xl font-black text-slate-900">129</dd>
              </div>
              <div className="py-5">
                <dt className="text-sm text-slate-600">응급의료 상담</dt>
                <dd className="mt-1 text-2xl font-black text-slate-900">1339</dd>
              </div>
            </dl>
          </aside>
        </section>

        <section className="mt-12 border border-slate-300 bg-white">
          <div className="border-b-2 border-teal-800 px-6 py-5">
            <p className="text-sm font-bold text-teal-800">정책 화면 안내</p>
            <h2 className="mt-1 text-2xl font-extrabold">지역이 함께 읽는 응급의료 지도입니다</h2>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">
              정책 화면은 누구 한 명만 보는 관리 화면이 아니라, 시민과 지역 관계자가 같은 근거를 보고 대화하기 위한 화면입니다.
            </p>
          </div>
          <div className="grid divide-y divide-slate-300 md:grid-cols-3 md:divide-x md:divide-y-0">
            {policyAudienceItems.map((item) => (
              <div key={item.title} className="p-6">
                <h3 className="font-extrabold text-slate-900">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12 border border-slate-300 bg-white">
          <div className="border-b-2 border-teal-800 px-6 py-5">
            <p className="text-sm font-bold text-teal-800">분석 결과 안내</p>
            <h2 className="mt-1 text-2xl font-extrabold">결론보다 “어디를 먼저 확인할까”에 초점을 둡니다</h2>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">
              이 결과는 정책 결정을 대신하지 않습니다. 현장 조사와 전문가 검토 전에 우선순위를 좁히는 자료입니다.
            </p>
          </div>
          <div className="grid divide-y divide-slate-300 md:grid-cols-3 md:divide-x md:divide-y-0">
            {analysisItems.map(([title, description]) => (
              <div key={title} className="bg-teal-50/30 p-6">
                <h3 className="font-extrabold text-teal-900">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-200 bg-slate-50 px-6 py-4">
            <a
              href="/data/reports/daegu-golden-time-policy-analysis-report.pdf"
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-full bg-teal-800 px-4 py-2 text-xs font-bold text-white hover:bg-teal-900"
            >
              정책 분석 보고서 열기
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-300 bg-[#e9edef]">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-8 text-sm text-slate-600 md:px-8">
          <strong className="text-slate-900">대구 골든타임</strong>
          <p>응급의료 이용과 지역 응급의료 논의를 돕는 교육용 정보 서비스</p>
          <p className="mt-2 text-xs text-slate-500">실제 위급 상황에서는 즉시 119에 연락하세요.</p>
        </div>
      </footer>
    </div>
  );
}
