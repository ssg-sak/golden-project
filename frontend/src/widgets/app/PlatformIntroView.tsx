const serviceSteps = [
  ['01', '현재 위치 확인', '위치 사용을 허용하면 가까운 응급의료기관을 거리순으로 확인할 수 있습니다.'],
  ['02', '진료 가능 여부 확인', '병상 표시와 기관별 안내를 확인하고, 방문 전 반드시 해당 의료기관에 전화하세요.'],
  ['03', '병원 선택 및 이동', '병원 상세 정보에서 전화 연결과 카카오맵 길찾기를 이용할 수 있습니다.'],
];

const dataGuide = [
  ['진료 가능', '공공데이터에서 이용 가능한 병상이 확인된 기관입니다.', 'bg-emerald-600'],
  ['수용 어려움', '현재 확인된 가용 병상이 없거나 수용이 어려운 기관입니다.', 'bg-rose-600'],
  ['확인 필요', '실시간 정보가 없거나 최신 상태를 확인 중인 기관입니다.', 'bg-slate-500'],
];

export function PlatformIntroView() {
  return (
    <div className="h-full w-full overflow-y-auto bg-[#f4f6f7] text-slate-900 selection:bg-teal-100">
      <div className="border-b border-slate-300 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 text-xs text-slate-600 md:px-8">
          <p>대구광역시 시민 응급의료 정보 안내</p>
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
          <p className="mb-4 text-sm font-bold tracking-[0.18em] text-teal-200">대구 골든타임 공식 서비스 안내</p>
          <h1 className="max-w-4xl text-3xl font-extrabold leading-tight tracking-tight md:text-5xl">
            응급 상황에서 시민이 더 빠르게<br className="hidden md:block" /> 의료기관을 찾을 수 있도록
          </h1>
          <p className="mt-6 max-w-3xl border-l-4 border-teal-300 pl-5 text-base leading-7 text-slate-100 md:text-lg">
            대구 골든타임은 시민이 공공데이터와 공간분석으로 지역 의료 접근성 문제를 진단하고, 행정의 검증과 정책 판단을 지원하도록 만든 공익 서비스입니다.
          </p>
        </div>
      </header>

      <div className="border-b border-amber-300 bg-amber-50">
        <div className="mx-auto flex max-w-6xl gap-4 px-5 py-5 md:px-8">
          <strong className="shrink-0 text-amber-900">긴급 안내</strong>
          <p className="text-sm leading-6 text-amber-950">
            의식 저하, 호흡 곤란, 심한 흉통, 대량 출혈 등 위급한 증상이 있으면 지도를 검색하지 말고 즉시 <strong>119</strong>에 신고하세요.
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

          <aside className="border-t border-slate-300 bg-slate-100 p-6 lg:border-l lg:border-t-0 md:p-8">
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
                <dt className="text-sm text-slate-600">감염병·질병 정보</dt>
                <dd className="mt-1 text-2xl font-black text-slate-900">1339</dd>
              </div>
            </dl>
          </aside>
        </section>

        <section className="mt-12">
          <div className="border-l-4 border-teal-700 pl-4">
            <p className="text-sm font-bold text-teal-800">표시 정보 이해하기</p>
            <h2 className="mt-1 text-2xl font-extrabold">병상 상태는 방문 판단을 돕는 참고 정보입니다</h2>
          </div>
          <div className="mt-6 grid border border-slate-300 bg-white md:grid-cols-3 md:divide-x md:divide-slate-300">
            {dataGuide.map(([title, description, color]) => (
              <div key={title} className="border-b border-slate-300 p-6 last:border-b-0 md:border-b-0">
                <div className="flex items-center gap-3">
                  <span className={`h-3 w-3 ${color}`} aria-hidden />
                  <h3 className="font-extrabold">{title}</h3>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            병상 정보는 공공 API 수집 시점과 실제 현장 상황 사이에 차이가 있을 수 있습니다. 출발 전 의료기관에 전화하여 진료 가능 여부를 다시 확인하세요.
          </p>
        </section>

        <section className="mt-12 grid gap-6 md:grid-cols-2">
          <div className="border-t-4 border-teal-700 bg-white px-6 py-7 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-extrabold">시민 응급의료 지도</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              가까운 병원, 진료 대상, 병상 상태를 확인하고 전화와 길찾기로 바로 연결합니다. 어린이와 고령자 등 필요한 진료 대상을 선택해 목록을 좁힐 수 있습니다.
            </p>
          </div>
          <div className="border-t-4 border-slate-600 bg-white px-6 py-7 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-extrabold">지역 의료 접근성 안내</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              행정동별 의료 접근성과 취약 인구 정보를 함께 살펴 지역 간 의료 격차를 이해할 수 있도록 돕습니다. 분석 결과는 정책 검토를 위한 참고 자료입니다.
            </p>
          </div>
        </section>

        <section className="mt-12 border border-slate-300 bg-white">
          <div className="border-b-2 border-teal-800 px-6 py-5">
            <p className="text-sm font-bold text-teal-800">응급의료 인프라 심층 분석 주요 결과</p>
            <h2 className="mt-1 text-2xl font-extrabold">소아·고령층 이중 트랙 공간 분석</h2>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">
              총량 확대만으로 해결하기 어려운 의료 격차에 대해 취약지역을 먼저 찾고 한정된 자원의 공간적 우선순위를 검토하는 방법을 제안합니다.
            </p>
          </div>
          <div className="grid divide-y divide-slate-300 md:grid-cols-2 md:divide-x md:divide-y-0">
            <div className="p-6">
              <h3 className="font-extrabold text-slate-900">소아 응급의료 분석</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">달빛어린이병원 6곳과 보육시설 992곳을 기준으로 3km 안전망 밖 사각지대 414곳을 분석하고 정책 거점 후보 4곳을 도출했습니다.</p>
            </div>
            <div className="p-6">
              <h3 className="font-extrabold text-slate-900">고령층 응급의료 분석</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">권역·지역응급의료센터 18곳과 150개 행정동을 기준으로 사각지대 38곳을 분석하고 정책 거점 후보 3곳을 도출했습니다.</p>
            </div>
          </div>
          <div className="border-t border-amber-300 bg-amber-50 px-6 py-4 text-xs leading-5 text-amber-950">
            위 수치는 행정과의 공동 검증을 전제로 한 보고서 최신 산출값입니다. 직선거리, 수요 대리지표와 일부 추정 인프라 자료의 한계가 있어 실제 정책 결정에는 현장 조사와 공식 자료 검증이 필요합니다.
          </div>
        </section>

        <section className="mt-12 border border-slate-300 bg-white">
          <div className="border-b border-slate-300 bg-slate-100 px-6 py-4">
            <h2 className="font-extrabold">서비스 정보 및 데이터 이용 안내</h2>
          </div>
          <div className="grid divide-y divide-slate-200 text-sm md:grid-cols-2 md:divide-x md:divide-y-0">
            <div className="p-6">
              <h3 className="font-bold text-slate-900">활용 정보</h3>
              <p className="mt-2 leading-6 text-slate-600">응급의료기관 기본정보, 실시간 병상 정보, 지자체 지정 소아진료기관, 지역 인구 및 행정구역 자료</p>
            </div>
            <div className="p-6">
              <h3 className="font-bold text-slate-900">이용 시 유의사항</h3>
              <p className="mt-2 leading-6 text-slate-600">본 서비스는 의료진의 진단이나 119의 판단을 대신하지 않습니다. 제공 정보만으로 응급 여부를 판단하지 마세요.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-300 bg-[#e9edef]">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-8 text-sm text-slate-600 md:px-8">
          <strong className="text-slate-900">대구 골든타임</strong>
          <p>시민의 안전한 의료기관 이용을 돕기 위한 지역 응급의료 정보 서비스</p>
          <p className="mt-2 text-xs text-slate-500">실제 위급 상황에서는 즉시 119에 연락하시기 바랍니다.</p>
        </div>
      </footer>
    </div>
  );
}
