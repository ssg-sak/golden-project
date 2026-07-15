const reportRows = [
  {
    label: '보고서 성격',
    value: '정책 확정안이 아닌 사전 검토 자료',
    description: '응급의료 접근성 문제를 데이터로 먼저 살펴보기 위한 개인 프로젝트 산출물입니다.',
  },
  {
    label: '핵심 관점',
    value: '소아·고령층 이중 트랙 검토',
    description: '소아 야간·휴일 진료와 고령층 중증 응급 접근성은 같은 기준으로 해석하지 않습니다.',
  },
  {
    label: '사용 방식',
    value: '현장 조사 전에 후보를 좁히는 참고 자료',
    description: '시민, 의료기관, 지역 관계자, 정책 담당자가 같은 데이터를 보고 논의하기 위한 출발점입니다.',
  },
];

const guideRows = [
  [
    '1',
    '고위험 지역을 먼저 봅니다',
    '지도 색상은 VDI Log 기준입니다. 값이 높을수록 취약인구와 응급의료 접근성 문제를 함께 볼 필요가 큽니다.',
  ],
  [
    '2',
    '빠른 조회로 후보를 좁힙니다',
    'VDI 고위험, 소아 취약, 응급 취약 버튼은 최종 결정이 아니라 먼저 확인할 지역 목록을 보여줍니다.',
  ],
  [
    '3',
    '검토 후보는 확정 입지가 아닙니다',
    '지도에 표시되는 후보는 수요가 몰리는 곳을 먼저 찾기 위한 참고 위치입니다. 실제 결정에는 교통, 부지, 예산, 병원 역할 검토가 추가로 필요합니다.',
  ],
  [
    '4',
    '마지막 판단은 현장 정보로 보완합니다',
    '병원별 진료 역량, 실제 주민 수요, 이송 동선, 행정 절차를 확인해야 정책 대상이 더 정확해집니다.',
  ],
];

const examples = [
  {
    title: '가까운 병원이 있어도 취약인구가 많은 동',
    description:
      '병원이 멀지 않아도 고령자나 어린이가 많으면 안내 체계, 이송 연계, 야간·휴일 진료 공백을 함께 볼 필요가 있습니다.',
  },
  {
    title: '인구는 적지만 병원까지 먼 동',
    description:
      '취약인구 규모가 작아도 응급의료기관까지 거리가 멀면 교통·이송 보완 후보가 될 수 있습니다.',
  },
  {
    title: '검토 후보가 반복 등장한 지역',
    description:
      '조건을 바꿔도 반복 등장한 후보는 먼저 살펴볼 가치가 있지만, 입지 확정이나 예산 배정을 뜻하지 않습니다.',
  },
];

export function PolicyWelcomePanel() {
  return (
    <aside className="flex h-full flex-col overflow-y-auto border-l border-slate-300 bg-white">
      <header className="border-b-2 border-teal-800 bg-slate-50 px-5 py-5">
        <p className="text-xs font-bold text-teal-800">정책 분석 안내</p>
        <h2 className="mt-1 text-xl font-extrabold text-slate-900">
          어디를 먼저 확인할지 좁혀 보는 화면
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          이 화면은 취약인구와 응급의료 접근성을 함께 보며 정책 검토 우선순위를 정리합니다.
          단, 화면의 후보와 자원 보강 수치는 실제 정책 결정이나 신규 병원 설치 확정안이 아닙니다.
          현장 조사 전에 논의할 대상을 줄이는 참고 자료로 해석해야 합니다.
        </p>
      </header>

      <div className="p-5">
        <section className="mb-7 border border-amber-300 bg-amber-50">
          <div className="border-b border-amber-200 px-4 py-3">
            <p className="text-xs font-bold text-amber-900">먼저 확인할 한계</p>
            <h3 className="mt-1 text-base font-extrabold text-slate-950">
              현재 결과는 사전 검토 자료입니다
            </h3>
          </div>
          <div className="grid divide-y divide-amber-200 text-xs leading-5 text-amber-950 md:grid-cols-3 md:divide-x md:divide-y-0">
            <p className="p-4">
              병원 전문의 수와 MRI/CT 정보 일부는 기준 시점이 다른 자료와 추정치를 함께 사용했습니다.
            </p>
            <p className="p-4">
              3km와 5km는 분석 시나리오 기준입니다. 실제 이송 시간과 생활권을 그대로 뜻하지 않습니다.
            </p>
            <p className="p-4">
              후보지는 실제 교통망, 부지 가능성, 예산, 병원별 역할을 함께 검토해야 합니다.
            </p>
          </div>
        </section>

        <section className="mb-7 border border-teal-200 bg-teal-50">
          <div className="border-b border-teal-200 px-4 py-3">
            <p className="text-xs font-bold text-teal-800">정책지표가 필요한 이유</p>
            <h3 className="mt-1 text-base font-extrabold text-slate-950">
              거리와 취약인구를 따로 보면 놓치는 지역이 생깁니다
            </h3>
          </div>
          <div className="grid divide-y divide-teal-200 md:grid-cols-3 md:divide-x md:divide-y-0">
            <div className="p-4">
              <h4 className="text-sm font-extrabold text-slate-950">거리만 보면 부족합니다</h4>
              <p className="mt-2 text-xs leading-5 text-slate-700">
                같은 거리라도 취약인구가 많은 동과 적은 동의 정책 부담은 다릅니다.
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
              대구 응급의료 접근성 진단과 검토 후보 추출
            </h3>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              보고서의 핵심은 최종 후보 좌표보다 모델의 한계를 발견하고 후보를 보수적으로 다시 정의한 과정입니다.
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
            VDI를 읽는 법
          </h3>
          <div className="mt-4 grid gap-3">
            <div className="border border-slate-300 bg-white p-4">
              <p className="text-sm font-extrabold text-slate-950">VDI Log</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                기본 우선순위 점수입니다. 값이 높을수록 먼저 살펴볼 이유가 강합니다.
              </p>
            </div>
            <div className="border border-slate-300 bg-white p-4">
              <p className="text-sm font-extrabold text-slate-950">VDI Norm</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                0~100으로 바꾼 비교 점수입니다. 서로 다른 지역을 같은 눈금에서 보기 위한 참고 지표입니다.
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
