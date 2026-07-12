const GUIDE_ITEMS = [
  {
    term: '정책지표를 쓰는 이유',
    body: '병원 수만 세면 “공급이 있어 보이는 지역”을 놓치기 쉽습니다. VDI는 병원 접근성과 보호가 필요한 인구를 한 화면에서 같이 보게 해 줍니다.',
  },
  {
    term: 'VDI Log',
    body: '우선순위를 정하는 기본 점수입니다. 병원까지의 거리를 그대로 곱하지 않고 Log(1 + 거리)로 눌러서, 너무 먼 거리 하나가 점수를 과하게 키우는 문제를 줄입니다.',
  },
  {
    term: 'VDI Norm',
    body: '0~100점 보조 점수입니다. 거리와 취약인구를 같은 눈금으로 맞춘 뒤 비교합니다. 숫자가 높을수록 상대적으로 더 취약합니다.',
  },
  {
    term: '취약인구',
    body: '65세 이상 어르신과 0~9세 어린이를 합친 값입니다. 응급 상황에서 이동·대기 부담이 더 커질 수 있는 주민을 정책 검토에 포함합니다.',
  },
] as const;

const THRESHOLDS = [
  { label: '관찰', value: '1,500+', className: 'bg-amber-50 text-amber-800 ring-amber-200' },
  { label: '높음', value: '5,000+', className: 'bg-orange-50 text-orange-800 ring-orange-200' },
  { label: '매우 높음', value: '10,000+', className: 'bg-red-50 text-red-800 ring-red-200' },
] as const;

const EXAMPLES = [
  ['A동', '병원은 가깝지만 취약인구가 많음', 'VDI Log가 중간 이상일 수 있어 안내·수요 관리가 필요합니다.'],
  ['B동', '인구는 적지만 병원까지 멂', 'VDI Norm에서 거리 부담이 드러나 교통·이송 보완 후보가 됩니다.'],
  ['C동', '거리도 멀고 취약인구도 많음', '두 지표가 모두 높으면 우선 현장 확인 대상입니다.'],
] as const;

export function MetricsGuide() {
  return (
    <details className="group shrink-0 border-b border-slate-300/80 bg-[#f3f7fc]">
      <summary className="mx-auto flex max-w-[1800px] cursor-pointer list-none items-center justify-between gap-2 px-4 py-2 text-sm text-slate-600 marker:content-none md:px-6 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="font-semibold text-slate-800">정책지표가 왜 필요한가요?</span>
          <span className="hidden text-slate-500 sm:inline"> VDI를 쉬운 예시와 기준 차트로 봅니다</span>
        </span>
        <span
          className="text-xs font-medium text-slate-400 transition group-open:rotate-180"
          aria-hidden
        >
          ▾
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
            <p className="text-xs font-bold text-teal-800">VDI 위험 기준</p>
            <h3 className="mt-1 text-base font-extrabold text-slate-950">
              어느 정도면 우선 검토하나요?
            </h3>
            <div className="mt-4 space-y-2">
              {THRESHOLDS.map((item) => (
                <div
                  key={item.label}
                  className={`flex items-center justify-between rounded-md px-3 py-2 text-sm font-bold ring-1 ${item.className}`}
                >
                  <span>{item.label}</span>
                  <span className="tabular-nums">{item.value}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-600">
              기준은 “자동 결정선”이 아니라 우선 검토 신호입니다. 기준을 넘은 지역은 현장 접근성,
              병원 수용력, 주민 이동 조건을 함께 확인해야 합니다.
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
            거리는 행정동 중심점에서 병원까지의 직선거리입니다. 실제 이동 시간, 교통 상황,
            병원별 수용 가능 여부와 다를 수 있으므로 응급·위급 상황에서는 119 또는 1339를 이용해 주세요.
          </p>
        </div>
      </div>
    </details>
  );
}
