const serviceSteps = [
  [
    '01',
    '현재 위치를 확인합니다',
    '위치 사용을 허용하면 가까운 응급의료기관을 거리순으로 확인할 수 있습니다.',
  ],
  [
    '02',
    '진료 가능성을 확인합니다',
    '병상·기관 정보는 참고용입니다. 출발 전에는 해당 의료기관에 전화로 진료 가능 여부를 확인해 주세요.',
  ],
  [
    '03',
    '전화와 길찾기로 이동합니다',
    '상세 화면에서 전화 연결과 카카오 길찾기를 바로 실행할 수 있습니다.',
  ],
];

const vdiItems = [
  [
    'VDI Log',
    '거리 영향이 지나치게 커지지 않도록 보정한 기본 위험 점수입니다. 값이 높을수록 먼저 살펴볼 이유가 큽니다.',
  ],
  [
    'VDI Norm',
    '동네별 위험도를 0~100으로 맞춘 비교 점수입니다. 서로 다른 지역을 같은 눈금에서 비교할 때 유용합니다.',
  ],
  [
    '고위험 기준',
    '10,000 이상은 매우 높음, 5,000 이상은 높음, 1,500 이상은 관찰 구간으로 표시합니다.',
  ],
];

const simulationItems = [
  [
    '우리 동네 의료 공백의 가시화',
    'AI 클러스터링과 공간 연산을 통해, 우리 동네에 응급의료 인프라나 전문의가 얼마나 부족한지 시민 누구나 직관적으로 파악할 수 있도록 돕습니다.',
  ],
  [
    '데이터 기반 정책의 가능성 실증',
    '직관이나 민원이 아닌 데이터를 바탕으로 "어디에 무엇이 필요한지"를 계산합니다. 비록 교육 과정에서 만든 단순 추정 모델이지만, 데이터 기반 행정의 청사진을 제시합니다.',
  ],
  [
    '함께 논의하기 위한 참고 자료 (면책 고지)',
    '화면에 표출된 수치와 권고안은 공식 확정 자료가 아닌 검증용 예시 데이터(추정치)입니다. 실제 정책 결정의 근거가 아닌, 지역 문제를 함께 고민하기 위한 아이디어 스케치로 보아주세요.',
  ],
];

const policyAudienceItems = [
  {
    title: '시민',
    description: '우리 동네의 응급의료 접근성이 어떤 상태인지 쉽게 확인할 수 있습니다.',
  },
  {
    title: '의료기관·지역 관계자',
    description: '진료 공백, 이송 부담, 지역 수요를 함께 논의할 공통 자료로 활용할 수 있습니다.',
  },
  {
    title: '정책 담당자',
    description: '신규 거점, 이동지원, 야간·휴일 진료 연계 후보를 데이터로 좁혀 볼 수 있습니다.',
  },
];

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
          <p className="mb-4 text-sm font-bold tracking-[0.18em] text-teal-200">
            대구 골든타임 서비스 안내
          </p>
          <h1 className="max-w-4xl text-3xl font-extrabold leading-tight tracking-tight md:text-5xl">
            시민에게는 가까운 응급의료 정보를,
            <br className="hidden md:block" /> 모두에게는 지역 사각지대의 근거를
          </h1>
          <p className="mt-6 max-w-3xl border-l-4 border-teal-300 pl-5 text-base leading-7 text-slate-100 md:text-lg">
            대구 골든타임은 병원 접근성과 취약인구를 함께 살펴 응급의료 이용과 지역 정책 논의를 돕는
            공익 지도 서비스입니다. 정책·분석 모니터링 탭은 관리자만을 위한 공간이 아니라, 시민과
            의료기관, 지역 관계자, 정책 담당자가 같은 근거를 보고 대화하기 위한 화면입니다.
          </p>
        </div>
      </header>

      <div className="border-b border-amber-300 bg-amber-50">
        <div className="mx-auto flex max-w-6xl gap-4 px-5 py-5 md:px-8">
          <strong className="shrink-0 text-amber-900">긴급 안내</strong>
          <p className="text-sm leading-6 text-amber-950">
            호흡곤란, 심한 통증, 의식 저하 등 위급 증상이 있으면 지도를 검색하지 말고 즉시{' '}
            <strong>119</strong>에 신고하세요.
          </p>
        </div>
      </div>

      <div className="border-b border-cyan-200 bg-cyan-50">
        <div className="mx-auto grid max-w-6xl gap-4 px-5 py-5 text-sm leading-6 text-cyan-950 md:grid-cols-[220px_1fr] md:px-8">
          <strong className="text-cyan-900">달빛어린이병원이 필요한 이유</strong>
          <p>
            이 서비스는 의료기관 전체 분포가 아니라 응급환경을 봅니다. 소아의 밤·휴일 진료 공백을 줄이면
            경증·중등도 소아 환자가 곧바로 응급실로 몰리는 부담을 낮추고, 응급실은 중증 환자 대응에 더 집중할
            수 있습니다. 그래서 달빛어린이병원은 응급실 병상 평가가 아니라 야간·휴일 소아진료 접근성의 보완
            자원으로 표시합니다.
          </p>
        </div>
      </div>

      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-4 px-5 py-5 text-sm leading-6 text-slate-700 md:grid-cols-[220px_1fr] md:px-8">
          <strong className="text-slate-900">모바일 화면 구성</strong>
          <p>
            모바일에서는 정책 분석 지도를 줄이고 가까운 응급실, 야간·휴일 소아진료, 전화 확인과 길찾기처럼
            현장에서 바로 필요한 행동을 우선합니다. 행정동별 취약도, 정책 우선 검토 후보, 보고서형 해석은 넓은
            화면에서 비교해 보는 데 적합해 데스크톱 정책·분석 화면에 배치했습니다.
          </p>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-5 py-10 md:px-8 md:py-14">
        <section className="grid border border-slate-300 bg-white lg:grid-cols-[1fr_340px]">
          <div className="p-6 md:p-9">
            <p className="text-sm font-bold text-teal-800">시민 이용 안내</p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight md:text-3xl">
              병원을 찾을 때 이렇게 이용하세요
            </h2>
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
                <dt className="text-sm text-slate-600">보건복지상담센터</dt>
                <dd className="mt-1 text-2xl font-black text-slate-900">129</dd>
              </div>
              <div className="py-5">
                <dt className="text-sm text-slate-600">질병관리청 콜센터</dt>
                <dd className="mt-1 text-2xl font-black text-slate-900">1339</dd>
              </div>
            </dl>
          </aside>
        </section>

        <section className="mt-12 border border-slate-300 bg-white">
          <div className="border-b-2 border-teal-800 px-6 py-5">
            <p className="text-sm font-bold text-teal-800">정책·분석 모니터링 탭</p>
            <h2 className="mt-1 text-2xl font-extrabold">
              관리자만 보는 탭이 아니라, 지역이 함께 읽는 공공 데이터 화면입니다
            </h2>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">
              정책탭은 특정 담당자만의 내부 관리 화면이 아닙니다. 시민은 우리 동네의 상황을 이해하고,
              의료기관과 지역 관계자는 현장의 문제를 설명하며, 정책 담당자는 지원 우선순위를 검토하는
              공통 근거로 활용할 수 있습니다.
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
            <p className="text-sm font-bold text-teal-800">정책 지표 쉬운 설명</p>
            <h2 className="mt-1 text-2xl font-extrabold">
              VDI는 멀리 떨어진 의료기관과 취약인구를 함께 보기 위한 참고 지표입니다
            </h2>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">
              행정동별 병원 접근성과 취약인구를 함께 보되, 현재 버전에서는 거리 영향은 로그로 줄이고
              0~100 정규화 점수를 함께 제공합니다.
            </p>
          </div>
          <div className="grid divide-y divide-slate-300 md:grid-cols-3 md:divide-x md:divide-y-0">
            {vdiItems.map(([title, description]) => (
              <div key={title} className="p-6">
                <h3 className="font-extrabold text-slate-900">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12 border border-slate-300 bg-white">
          <div className="border-b-2 border-teal-800 px-6 py-5">
            <p className="text-sm font-bold text-teal-800">AI 인프라 시뮬레이션 결과 안내</p>
            <h2 className="mt-1 text-2xl font-extrabold">
              AI 데이터 분석이 만드는 지역 사회의 새로운 논의 출발점
            </h2>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">
              이 시뮬레이션은 단순히 취약 지점을 찾는 것을 넘어, "무엇을 얼마나 투입해야 할까?"라는 질문에 대한 가상의 해답을 제시합니다. 비록 교육용 추정치에 불과하지만, 시민과 지역 관계자 모두가 같은 데이터를 보며 우리 동네의 공공의료 청사진을 함께 그려보는 계기가 되기를 바랍니다.
            </p>
          </div>
          <div className="grid divide-y divide-slate-300 md:grid-cols-3 md:divide-x md:divide-y-0">
            {simulationItems.map(([title, description]) => (
              <div key={title} className="p-6 bg-teal-50/30">
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
              대구 골든타임 정책분석보고서 열기
            </a>
          </div>
          <div className="border-t border-amber-300 bg-amber-50 px-6 py-4 text-xs leading-5 text-amber-950">
            분석 결과는 정책 검토를 위한 참고 자료입니다. 실제 정책 결정에는 현장 조사, 교통 여건,
            병원별 진료 역량 확인이 필요합니다.
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-300 bg-[#e9edef]">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-8 text-sm text-slate-600 md:px-8">
          <strong className="text-slate-900">대구 골든타임</strong>
          <p>시민의 안전한 의료기관 이용과 지역 응급의료 정책 논의를 돕는 정보 서비스</p>
          <p className="mt-2 text-xs text-slate-500">실제 위급 상황에서는 즉시 119에 연락하시기 바랍니다.</p>
        </div>
      </footer>
    </div>
  );
}
