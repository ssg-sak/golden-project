const noticeCards = [
  {
    title: '현재 결과는 검토용 자료입니다',
    body: '새 병원 설치 확정안이 아니라, 현장 조사 전에 먼저 확인할 지역을 좁혀 보는 참고 자료입니다.',
  },
  {
    title: '일반 소아과가 아니라 야간·휴일 소아진료를 봅니다',
    body: '달빛어린이병원은 응급실 부담을 줄이기 위한 보완 자원입니다. 일반 소아과 분포는 이 기준에 넣지 않습니다.',
  },
  {
    title: '거리와 이동시간은 함께 봐야 합니다',
    body: '가까워 보여도 도로 상황과 병원 수용 가능 여부에 따라 실제 접근성은 달라질 수 있습니다.',
  },
] as const;

const guideRows = [
  ['1', '빠른 조회 버튼으로 먼저 볼 지역을 좁힙니다.'],
  ['2', '지도를 눌러 행정동별 접근성과 가까운 응급기관을 확인합니다.'],
  ['3', '후보지는 현장 조사와 병원 역할 검토 전에 보는 출발점으로 사용합니다.'],
] as const;

const examples = [
  {
    title: '보호가 필요한 인구가 많은 지역',
    body: '병원이 가까워도 고령층이나 어린이가 많은 지역은 안내와 이송 체계 점검이 필요할 수 있습니다.',
  },
  {
    title: '소아 야간·휴일 공백 지역',
    body: '일반 소아과가 아니라 야간과 휴일에 실제로 갈 수 있는 소아진료 자원을 따로 확인합니다.',
  },
] as const;

const supplyTypeGuides = [
  {
    label: '권역응급의료센터 · 2개',
    tone: 'border-rose-200 bg-rose-50',
    labelTone: 'text-rose-800',
    body: '대구의 권역응급의료센터 2개입니다. Tier 1 정책 분석 그룹에 포함됩니다.',
  },
  {
    label: '지역응급의료센터 · 4개',
    tone: 'border-violet-200 bg-violet-50',
    labelTone: 'text-violet-800',
    body: '대구의 지역응급의료센터 4개입니다. 권역센터와 함께 Tier 1 정책 분석 그룹으로 묶어 접근성을 비교합니다.',
  },
  {
    label: '지역응급의료기관 · 13개',
    tone: 'border-sky-200 bg-sky-50',
    labelTone: 'text-sky-800',
    body: '공식 기관 유형인 지역응급의료기관 13개입니다. Tier 2 정책 분석 그룹으로 접근성을 비교합니다.',
  },
  {
    label: '달빛어린이병원 · 6개',
    tone: 'border-amber-200 bg-amber-50',
    labelTone: 'text-amber-900',
    body: '달빛어린이병원 등 야간·휴일 소아진료 자원입니다. 일반 응급기관과 같은 의미가 아니라 소아 접근성의 보완 자원으로 따로 봅니다.',
  },
] as const;

export function PolicyWelcomePanel() {
  return (
    <aside className="flex h-full min-h-0 flex-col overflow-y-auto border-l border-slate-300 bg-white">
      <header className="border-b-2 border-teal-800 bg-slate-50 px-5 py-5">
        <p className="text-xs font-bold text-teal-800">정책 분석 안내</p>
        <h2 className="mt-1 text-xl font-extrabold leading-snug text-slate-900">
          어디를 먼저 확인할지 좁혀 보는 화면
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          보호가 필요한 인구와 응급기관 접근성을 함께 보며 우선 검토할 지역을 정리합니다.
        </p>
      </header>

      <div className="space-y-5 p-5">
        <section className="space-y-3">
          {noticeCards.map((card) => (
            <article key={card.title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-extrabold leading-5 text-slate-950">{card.title}</h3>
              <p className="mt-2 text-xs leading-5 text-slate-600">{card.body}</p>
            </article>
          ))}
        </section>

        <section>
          <h3 className="border-l-4 border-teal-700 pl-3 text-sm font-extrabold text-slate-900">
            기관 유형을 이렇게 구분합니다
          </h3>
          <div className="mt-3 space-y-2">
            {supplyTypeGuides.map((item) => (
              <article key={item.label} className={`rounded-xl border p-3 ${item.tone}`}>
                <h4 className={`text-xs font-extrabold ${item.labelTone}`}>{item.label}</h4>
            <p className="mt-1 text-[11px] leading-5 text-slate-700">{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <p className="text-[10px] leading-5 text-slate-500">
          위 분류는 공공데이터 기관 유형을 바탕으로 한 프로젝트 표시입니다. 개별 기관의 실제 진료·수용 가능 여부를 판정하는 정보가 아닙니다.
        </p>

        <section className="rounded-xl border border-teal-200 bg-teal-50 p-4">
          <p className="text-xs font-bold text-teal-800">위험 점수를 쓰는 이유</p>
          <h3 className="mt-1 text-base font-extrabold leading-6 text-slate-950">
            거리만 보면 놓치는 지역이 생깁니다
          </h3>
          <p className="mt-2 text-xs leading-5 text-slate-700">
            위험 점수는 응급기관 접근성, 보호가 필요한 인구, 이동 부담을 함께 보기 위한 신호입니다.
            결론이 아니라 우선 확인할 후보를 찾는 기준입니다.
          </p>
        </section>

        <section>
          <h3 className="border-l-4 border-slate-600 pl-3 text-sm font-extrabold text-slate-900">
            예시로 이해하기
          </h3>
          <div className="mt-3 space-y-3">
            {examples.map((item) => (
              <article key={item.title} className="rounded-xl border border-slate-200 bg-white p-4">
                <h4 className="text-sm font-bold leading-5 text-slate-950">{item.title}</h4>
                <p className="mt-1 text-xs leading-5 text-slate-600">{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section>
          <h3 className="border-l-4 border-teal-700 pl-3 text-sm font-extrabold text-slate-900">
            사용하는 순서
          </h3>
          <ol className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
            {guideRows.map(([number, description]) => (
              <li key={number} className="grid grid-cols-[28px_1fr] gap-2 px-4 py-3">
                <span className="font-mono text-sm font-bold text-teal-800">{number}</span>
                <p className="text-xs leading-5 text-slate-600">{description}</p>
              </li>
            ))}
          </ol>
        </section>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
          <strong className="text-sm text-emerald-900">25개 기관 기준 분석</strong>
          <p className="mt-1 text-[11px] leading-5 text-emerald-800">
            소아 6개·어르신 19개 기관과 5,100개 도로 경로를 한 분석본으로 사용합니다.
          </p>
        </div>
      </div>
    </aside>
  );
}
