const GUIDE_ITEMS = [
  {
    term: '왜 따로 점수를 보나요?',
    body: '병원 수만 보면 실제로 멀리 떨어진 동네를 놓칠 수 있습니다. 이 점수는 병원 접근성과 보호가 필요한 인구를 같이 보게 해 줍니다.',
  },
  {
    term: '위험 점수',
    body: '응급기관까지 멀수록, 고령층과 어린이가 많을수록 높아지는 참고 점수입니다. 값이 높으면 먼저 살펴볼 이유가 큽니다.',
  },
  {
    term: '비교 점수',
    body: '동네별 점수를 0~100으로 맞춘 값입니다. 서로 다른 동네를 같은 눈금에서 비교할 때 씁니다.',
  },
  {
    term: '보호 필요 인구',
    body: '65세 이상 고령층과 0~9세 어린이를 합친 값입니다. 응급 상황에서 이동과 대기 부담이 더 커질 수 있는 주민을 뜻합니다.',
  },
] as const;

const EXAMPLES = [
  ['A동', '병원은 가깝지만 보호 필요 인구가 많음', '안내와 수요 관리가 필요할 수 있습니다.'],
  ['B동', '인구는 적지만 병원까지 멂', '교통이나 이송 보완을 먼저 볼 수 있습니다.'],
  ['C동', '거리도 멀고 보호 필요 인구도 많음', '현장 확인 우선순위가 높습니다.'],
] as const;

export function MetricsGuide() {
  return (
    <details className="group shrink-0 border-b border-slate-300/80 bg-[#f3f7fc]">
      <summary className="mx-auto flex max-w-[1800px] cursor-pointer list-none items-center justify-between gap-2 px-4 py-2 text-sm text-slate-600 marker:content-none md:px-6 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="font-semibold text-slate-800">위험 점수를 왜 보나요?</span>
          <span className="hidden text-slate-500 sm:inline"> 쉬운 예시와 기준을 봅니다</span>
        </span>
        <span className="text-xs font-medium text-slate-400 transition group-open:rotate-180" aria-hidden>
          v
        </span>
      </summary>

      <div className="max-h-[min(50vh,460px)] overflow-y-auto border-t border-slate-300/70 bg-white overscroll-y-contain">
        <div className="mx-auto grid max-w-[1600px] gap-5 px-4 py-5 xl:grid-cols-[1fr_360px] md:px-8 md:py-6">
          <div className="grid gap-4 md:grid-cols-2">
            {GUIDE_ITEMS.map((item) => (
              <div key={item.term} className="min-w-0 border border-slate-200/80 bg-[#fbfdff] p-4">
                <h3 className="text-sm font-semibold text-slate-900 md:text-base">{item.term}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{item.body}</p>
              </div>
            ))}
          </div>

          <aside className="border border-teal-200 bg-teal-50 p-4">
            <p className="text-xs font-bold text-teal-800">위험 기준</p>
            <h3 className="mt-1 text-base font-extrabold text-slate-950">어느 정도면 먼저 볼까요?</h3>
            <div className="mt-4 rounded-md bg-white px-3 py-3 text-sm leading-6 text-slate-700 ring-1 ring-teal-200">
              150개 행정동의 점수를 높은 순서로 정렬한 뒤, 현재 분석본의 상위 25%를 먼저 확인할 지역으로 표시합니다.
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-600">
              화면의 경계값은 분석본이 바뀌면 함께 달라지는 상대값입니다. 질병 위험이나 병원 설치를 확정하는
              절대 기준이 아니며, 실제 판단에는 도로 상황, 병원 수용 가능 여부, 예산과 인력 검토가 필요합니다.
            </p>
          </aside>
        </div>

        <div className="mx-auto max-w-[1600px] border-t border-slate-100 px-4 py-4 md:px-8">
          <p className="text-xs font-bold text-slate-700">간단 예시</p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {EXAMPLES.map(([name, situation, meaning]) => (
              <div key={name} className="border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-extrabold text-slate-900">{name}</p>
                <p className="mt-1 text-xs font-semibold text-slate-700">{situation}</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">{meaning}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-slate-500 md:text-sm">
            실제 응급·위급 상황에서는 지도 결과보다 119 또는 1339 안내가 우선입니다.
          </p>
        </div>
      </div>
    </details>
  );
}
