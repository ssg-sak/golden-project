const reportRows = [
  {
    label: '보고서 주제',
    value: '대구 골든타임 정책 분석 보고서',
    description: '응급의료 사각지대 진단과 최적 거점 배치 전략을 정리한 28쪽 보고서입니다.',
  },
  {
    label: '핵심 관점',
    value: '소아·고령층 이중 트랙 분석',
    description: '생애주기 양 끝단의 응급 접근성 문제를 같은 지도 위에서 비교합니다.',
  },
  {
    label: '활용 방식',
    value: '시민과 현장이 함께 읽는 근거 자료',
    description: '정책 담당자만이 아니라 시민, 의료기관, 지역 관계자가 함께 논의할 출발점입니다.',
  },
];

const guideRows = [
  [
    '1',
    '고위험 기준을 먼저 봅니다',
    '지도 위 기준 바는 VDI Log 기준입니다. 값이 높을수록 취약인구와 응급의료 접근성 문제를 함께 볼 필요가 큽니다.',
  ],
  [
    '2',
    '빠른 지역 조회로 후보를 좁힙니다',
    'VDI 고위험, 소아 응급 취약, 일반 응급 취약 버튼을 누르면 우선 검토할 지역 목록을 바로 볼 수 있습니다.',
  ],
  [
    '3',
    'VDI Log와 VDI Norm을 같이 봅니다',
    'VDI Log는 실제 우선순위 점수이고, VDI Norm은 0~100 점수로 바꾼 비교용 지표입니다.',
  ],
  [
    '4',
    '마지막 결정은 현장 정보로 보완합니다',
    '교통, 병원 진료 역량, 실제 주민 수요를 함께 확인해야 정책 대상이 더 정확해집니다.',
  ],
];

const examples = [
  {
    title: '가까운 병원이 있어도 취약인구가 많은 동',
    description:
      '병원이 멀지 않아도 고령자나 어린이가 많으면 실제 응급 수요가 커질 수 있습니다. 이런 지역은 안내 체계나 이송 연계 점검이 필요합니다.',
  },
  {
    title: '인구는 적지만 병원까지 먼 동',
    description:
      '취약인구 규모가 아주 크지 않아도 응급의료기관까지 거리가 멀면 접근성 문제가 두드러집니다. 교통·이송 보완 검토에 적합합니다.',
  },
  {
    title: 'VDI Log와 Norm이 모두 높은 동',
    description:
      '거리 문제와 취약인구 부담이 동시에 큰 지역입니다. 신규 거점, 이동지원, 야간·휴일 진료 연계 같은 정책을 우선 검토할 수 있습니다.',
  },
];

export function PolicyWelcomePanel() {
  return (
    <aside className="flex h-full flex-col overflow-y-auto border-l border-slate-300 bg-white">
      <header className="border-b-2 border-teal-800 bg-slate-50 px-5 py-5">
        <p className="text-xs font-bold text-teal-800">정책 분석 안내</p>
        <h2 className="mt-1 text-xl font-extrabold text-slate-900">
          어디를 먼저 살펴볼지 정하는 지도
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          병원이 얼마나 가까운지만 보면 인구 규모를 놓치고, 인구만 보면 실제 접근성을 놓칠 수
          있습니다. 그래서 이 화면은 <strong>취약인구</strong>와{' '}
          <strong>응급의료 접근성</strong>을 함께 묶어 정책 검토 우선순위를 보여줍니다.
          정책관리자만을 위한 화면이 아니라, 시민·의료기관·지역 관계자가 같은 근거를 보고
          골든타임 문제를 함께 이해하도록 만든 공익 서비스입니다.
        </p>
      </header>

      <div className="p-5">
        <section className="mb-7 border border-teal-200 bg-teal-50">
          <div className="border-b border-teal-200 px-4 py-3">
            <p className="text-xs font-bold text-teal-800">정책지표가 필요한 이유</p>
            <h3 className="mt-1 text-base font-extrabold text-slate-950">
              “어디가 멀고, 누가 더 많이 영향을 받는가”를 함께 보기 위해서입니다
            </h3>
          </div>
          <div className="grid divide-y divide-teal-200 md:grid-cols-3 md:divide-x md:divide-y-0">
            <div className="p-4">
              <h4 className="text-sm font-extrabold text-slate-950">거리만 보면 부족합니다</h4>
              <p className="mt-2 text-xs leading-5 text-slate-700">
                같은 3km라도 취약인구가 많은 동과 적은 동의 정책 부담은 다릅니다.
              </p>
            </div>
            <div className="p-4">
              <h4 className="text-sm font-extrabold text-slate-950">인구만 봐도 부족합니다</h4>
              <p className="mt-2 text-xs leading-5 text-slate-700">
                취약인구가 많아도 가까운 응급의료기관이 충분하면 우선순위가 달라질 수 있습니다.
              </p>
            </div>
            <div className="p-4">
              <h4 className="text-sm font-extrabold text-slate-950">둘을 같이 봐야 합니다</h4>
              <p className="mt-2 text-xs leading-5 text-slate-700">
                VDI는 접근성 부담과 보호가 필요한 인구를 함께 보여주는 정책 판단 신호입니다.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-7 border border-slate-300 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <p className="text-xs font-bold text-slate-500">정책 분석 보고서</p>
            <h3 className="mt-1 text-base font-extrabold text-slate-950">
              대구 골든타임: 데이터 기반 응급의료 사각지대 진단
            </h3>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              이 정책탭은 보고서의 분석 내용을 지도와 지표로 쉽게 확인할 수 있게 만든 화면입니다.
              자세한 분석 배경과 정책 제언은 원문 보고서에서 확인할 수 있습니다.
            </p>
            <a
              href="/data/reports/daegu-golden-time-policy-analysis-report.pdf"
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center justify-center rounded-full bg-teal-800 px-4 py-2 text-xs font-bold text-white transition hover:bg-teal-900"
            >
              정책 분석 보고서 열기
            </a>
          </div>
          <dl className="divide-y divide-slate-200">
            {reportRows.map((row) => (
              <div key={row.label} className="grid gap-2 px-4 py-3 sm:grid-cols-[92px_1fr]">
                <dt className="text-xs font-bold text-teal-800">{row.label}</dt>
                <dd>
                  <p className="text-sm font-extrabold text-slate-950">{row.value}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{row.description}</p>
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mb-7">
          <h3 className="border-l-4 border-teal-700 pl-3 text-sm font-extrabold text-slate-900">
            VDI를 쉽게 읽는 법
          </h3>
          <div className="mt-4 grid gap-3">
            <div className="border border-slate-300 bg-white p-4">
              <p className="text-sm font-extrabold text-slate-950">VDI Log</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                기본 우선순위 점수입니다. 값이 높을수록 “먼저 살펴볼 이유”가 강합니다. 예를 들어
                10,000 이상이면 취약인구와 응급 접근성 부담이 함께 큰 후보로 봅니다.
              </p>
            </div>
            <div className="border border-slate-300 bg-white p-4">
              <p className="text-sm font-extrabold text-slate-950">VDI Norm</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                0~100으로 바꾼 비교 점수입니다. 예를 들어 90점대 지역은 전체 동 중에서도 상대적으로
                위험도가 높은 편이라고 읽으면 됩니다.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-7">
          <h3 className="border-l-4 border-slate-600 pl-3 text-sm font-extrabold text-slate-900">
            예시로 이해하기
          </h3>
          <div className="mt-4 space-y-3">
            {examples.map((item) => (
              <article key={item.title} className="border border-slate-200 bg-slate-50 p-4">
                <h4 className="text-sm font-bold text-slate-950">{item.title}</h4>
                <p className="mt-1 text-xs leading-5 text-slate-600">{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section>
          <h3 className="border-l-4 border-teal-700 pl-3 text-sm font-extrabold text-slate-900">
            사용하는 순서
          </h3>
          <ol className="mt-4 divide-y divide-slate-200 border-y border-slate-300">
            {guideRows.map(([number, title, description]) => (
              <li key={number} className="grid grid-cols-[28px_1fr] gap-2 py-4">
                <span className="font-mono text-sm font-bold text-teal-800">{number}</span>
                <div>
                  <strong className="text-sm text-slate-900">{title}</strong>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </aside>
  );
}
