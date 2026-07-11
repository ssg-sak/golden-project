const guideRows = [
  ['1', '지역을 선택합니다', '지도에서 행정동을 선택하면 취약인구, 병원 접근거리와 종합 취약도 지수를 확인할 수 있습니다.'],
  ['2', '지표를 비교합니다', '색이 진할수록 현재 설정한 기준에서 의료 접근 취약도가 높은 지역입니다.'],
  ['3', '정책 후보를 검토합니다', '고위험 지역과 소아·일반 응급 우선 지역을 비교해 현장 조사 대상을 좁힙니다.'],
  ['4', '근거를 내려받습니다', '검토 결과는 CSV 또는 인쇄 보고서로 내려받아 추가 분석에 활용합니다.'],
];

export function PolicyWelcomePanel() {
  const reportUrl = `${import.meta.env.BASE_URL}data/사회과학_분석_보고서.pdf`;

  return (
    <aside className="flex h-full flex-col overflow-y-auto border-l border-slate-300 bg-white">
      <header className="border-b-2 border-teal-800 bg-slate-50 px-5 py-5">
        <p className="text-xs font-bold text-teal-800">분석 이용 안내</p>
        <h2 className="mt-1 text-xl font-extrabold text-slate-900">지역 의료 접근성 판단 지원</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          행정동별 취약인구와 의료기관 접근성을 함께 비교해 우선 검토가 필요한 지역을 찾습니다.
        </p>
      </header>

      <div className="p-5">
        <section className="mb-7 border border-slate-300 bg-slate-50">
          <div className="border-b border-slate-300 px-4 py-3">
            <p className="text-xs font-bold text-teal-800">2026년 7월 사회과학 분석 보고서</p>
            <h3 className="mt-1 text-base font-extrabold text-slate-900">데이터 기반 거버넌스와 응급의료 사각지대의 해소</h3>
          </div>
          <dl className="grid grid-cols-2 divide-x divide-slate-300 border-b border-slate-300">
            <div className="p-4">
              <dt className="text-xs font-bold text-slate-600">소아 분석 기준</dt>
              <dd className="mt-2 text-sm font-extrabold text-slate-900">달빛 6곳 · 사각지대 414곳</dd>
              <dd className="mt-1 text-xs text-slate-500">정책 거점 후보 4곳</dd>
            </div>
            <div className="p-4">
              <dt className="text-xs font-bold text-slate-600">어르신 분석 기준</dt>
              <dd className="mt-2 text-sm font-extrabold text-slate-900">센터급 공급 18곳 · 사각지대 38곳</dd>
              <dd className="mt-1 text-xs text-slate-500">정책 거점 후보 3곳</dd>
            </div>
          </dl>
          <div className="p-4">
            <p className="text-xs leading-5 text-slate-600">
              웹 등록 Tier 1·2 기관과 보고서의 어르신 공급 기준은 현재 모두 18곳입니다. 기관별 명단은 분석 재실행 시 다시 대조해야 합니다.
            </p>
            <a
              href={reportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex border border-teal-800 bg-teal-800 px-3 py-2 text-xs font-bold text-white hover:bg-teal-900"
            >
              전체 보고서 열기 (PDF 24쪽)
            </a>
          </div>
        </section>

        <section>
          <h3 className="border-l-4 border-teal-700 pl-3 text-sm font-extrabold text-slate-900">분석 순서</h3>
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

        <section className="mt-7">
          <h3 className="border-l-4 border-slate-600 pl-3 text-sm font-extrabold text-slate-900">주요 지표 읽는 법</h3>
          <dl className="mt-4 divide-y divide-slate-200 border border-slate-300">
            <div className="p-4">
              <dt className="text-sm font-bold text-slate-900">취약도 지수</dt>
              <dd className="mt-1 text-xs leading-5 text-slate-600">취약인구 규모와 의료기관 접근성을 결합한 상대 비교 지표입니다.</dd>
            </div>
            <div className="p-4">
              <dt className="text-sm font-bold text-slate-900">최근접 병원 거리</dt>
              <dd className="mt-1 text-xs leading-5 text-slate-600">행정동 중심점과 가까운 의료기관 사이의 직선거리이며 실제 이동시간과 다를 수 있습니다.</dd>
            </div>
            <div className="p-4">
              <dt className="text-sm font-bold text-slate-900">고위험 기준</dt>
              <dd className="mt-1 text-xs leading-5 text-slate-600">지도 상단의 기준값을 조절해 검토 대상 지역의 범위를 변경할 수 있습니다.</dd>
            </div>
          </dl>
        </section>

        <section className="mt-7 border border-amber-300 bg-amber-50 p-4">
          <h3 className="text-sm font-extrabold text-amber-950">정책 활용 시 유의사항</h3>
          <p className="mt-2 text-xs leading-5 text-amber-900">
            분석 결과는 정책 결정을 자동으로 확정하지 않습니다. 교통 여건, 실제 진료 역량, 주민 수요와 현장 조사를 함께 검토해야 합니다.
          </p>
        </section>
      </div>
    </aside>
  );
}
