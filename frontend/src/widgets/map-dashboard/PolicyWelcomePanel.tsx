const reportRows = [
  {
    label: '자료 성격',
    value: '정책 확정안이 아닌 사전 검토 자료',
    description: '응급의료 접근성 문제를 데이터로 먼저 살펴보기 위한 참고 자료입니다.',
  },
  {
    label: '핵심 관점',
    value: '소아 야간·휴일 진료와 고령층 응급 접근성 분리',
    description: '일반 소아과나 일반 병원 분포가 아니라 응급환경에 필요한 자원을 따로 봅니다.',
  },
  {
    label: '사용 방식',
    value: '현장 조사 전에 후보를 좁히는 자료',
    description: '시민, 의료기관, 지역 관계자, 정책 담당자가 같은 화면을 보며 논의하기 위한 출발점입니다.',
  },
];

const guideRows = [
  ['1', '위험 높은 지역을 먼저 봅니다', '보호 필요 인구와 응급기관 접근성이 함께 좋지 않은 동네를 먼저 확인합니다.'],
  ['2', '빠른 조회로 목록을 좁힙니다', '위험 높은 지역, 소아 야간 취약, 응급 접근 취약 버튼은 먼저 확인할 지역 목록을 보여줍니다.'],
  ['3', '검토 후보는 확정 위치가 아닙니다', '지도에 표시된 후보는 수요가 몰리는 곳을 먼저 찾기 위한 참고 위치입니다.'],
  ['4', '마지막 판단은 현장 정보로 보완합니다', '교통, 부지, 예산, 병원 역할, 실제 진료 역량을 추가로 확인해야 합니다.'],
];

const examples = [
  {
    title: '가까운 병원은 있지만 보호 필요 인구가 많은 지역',
    description: '응급기관이 가까워도 고령층이나 어린이가 많으면 안내 체계와 수요 관리가 필요할 수 있습니다.',
  },
  {
    title: '인구는 적지만 병원까지 먼 지역',
    description: '인구 규모가 작아도 병원 접근이 어렵다면 교통·이송 보완 후보가 될 수 있습니다.',
  },
  {
    title: '후보가 반복 등장한 지역',
    description: '조건을 바꿔도 반복 등장한 후보는 먼저 살펴볼 가치가 있지만, 설치 확정이나 예산 배정을 뜻하지 않습니다.',
  },
];

export function PolicyWelcomePanel() {
  return (
    <aside className="flex h-full flex-col overflow-y-auto border-l border-slate-300 bg-white">
      <header className="border-b-2 border-teal-800 bg-slate-50 px-5 py-5">
        <p className="text-xs font-bold text-teal-800">정책 분석 안내</p>
        <h2 className="mt-1 text-xl font-extrabold text-slate-900">어디를 먼저 확인할지 좁혀 보는 화면</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          이 화면은 보호가 필요한 인구와 응급기관 접근성을 함께 보며 우선 검토할 지역을 정리합니다.
          화면의 후보지는 새 병원 설치 확정안이 아니라, 현장 조사 전에 논의를 시작하기 위한 참고 위치입니다.
        </p>
      </header>

      <div className="p-5">
        <section className="mb-7 border border-amber-300 bg-amber-50">
          <div className="border-b border-amber-200 px-4 py-3">
            <p className="text-xs font-bold text-amber-900">먼저 확인할 한계</p>
            <h3 className="mt-1 text-base font-extrabold text-slate-950">현재 결과는 사전 검토 자료입니다</h3>
          </div>
          <div className="grid divide-y divide-amber-200 text-xs leading-5 text-amber-950 md:grid-cols-3 md:divide-x md:divide-y-0">
            <p className="p-4">일부 병원 장비와 진료 역량 정보는 최신 공식 운영 상태와 다를 수 있습니다.</p>
            <p className="p-4">거리와 이동시간은 분석 기준에 따라 달라질 수 있습니다.</p>
            <p className="p-4">실제 결정에는 교통, 부지, 예산, 인력, 병원 역할 검토가 필요합니다.</p>
          </div>
        </section>

        <section className="mb-7 border border-cyan-200 bg-cyan-50">
          <div className="border-b border-cyan-200 px-4 py-3">
            <p className="text-xs font-bold text-cyan-800">달빛어린이병원을 따로 보는 이유</p>
            <h3 className="mt-1 text-base font-extrabold text-slate-950">일반 소아과가 아니라 야간·휴일 소아진료 공백을 봅니다</h3>
          </div>
          <div className="grid divide-y divide-cyan-200 text-xs leading-5 text-cyan-950 md:grid-cols-3 md:divide-x md:divide-y-0">
            <p className="p-4">소아 경증·중등도 환자가 바로 응급실로 몰리는 부담을 줄이는 보완 자원입니다.</p>
            <p className="p-4">응급실 병상이나 특수병상 규모로 평가하는 대상이 아닙니다.</p>
            <p className="p-4">일반 소아과는 이 프로젝트의 소아 응급 접근성 기준에 포함하지 않습니다.</p>
          </div>
        </section>

        <section className="mb-7 border border-teal-200 bg-teal-50">
          <div className="border-b border-teal-200 px-4 py-3">
            <p className="text-xs font-bold text-teal-800">위험 점수가 필요한 이유</p>
            <h3 className="mt-1 text-base font-extrabold text-slate-950">거리와 인구를 따로 보면 놓치는 지역이 생깁니다</h3>
          </div>
          <div className="grid divide-y divide-teal-200 md:grid-cols-3 md:divide-x md:divide-y-0">
            <div className="p-4">
              <h4 className="text-sm font-extrabold text-slate-950">거리만 보면 부족합니다</h4>
              <p className="mt-2 text-xs leading-5 text-slate-700">같은 거리라도 보호 필요 인구가 많으면 부담이 커질 수 있습니다.</p>
            </div>
            <div className="p-4">
              <h4 className="text-sm font-extrabold text-slate-950">인구만 봐도 부족합니다</h4>
              <p className="mt-2 text-xs leading-5 text-slate-700">주민이 많아도 응급기관 접근성이 충분하면 우선순위가 달라질 수 있습니다.</p>
            </div>
            <div className="p-4">
              <h4 className="text-sm font-extrabold text-slate-950">둘을 함께 봅니다</h4>
              <p className="mt-2 text-xs leading-5 text-slate-700">위험 점수는 접근 부담과 보호 필요 인구를 함께 보여주는 신호입니다.</p>
            </div>
          </div>
        </section>

        <section className="mb-7 border border-slate-300 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <p className="text-xs font-bold text-slate-500">분석 보고서</p>
            <h3 className="mt-1 text-base font-extrabold text-slate-950">대구 응급의료 접근성 진단과 검토 후보 추출</h3>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              보고서의 핵심은 최종 좌표보다 분석의 한계를 확인하고 후보를 보수적으로 다시 정의한 과정입니다.
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
          <h3 className="border-l-4 border-slate-600 pl-3 text-sm font-extrabold text-slate-900">예시로 이해하기</h3>
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
          <h3 className="border-l-4 border-teal-700 pl-3 text-sm font-extrabold text-slate-900">사용하는 순서</h3>
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
