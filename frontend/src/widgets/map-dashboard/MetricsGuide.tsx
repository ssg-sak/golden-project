const GUIDE_ITEMS = [
  {
    term: '사각지대 지수',
    body: '우리 동네에서 가장 가까운 응급병원까지의 거리와, 응급 도움이 더 필요할 수 있는 주민 수를 함께 반영한 값입니다. 숫자가 클수록·지도 색이 진할수록 응급 접근에 불리할 가능성이 높다는 뜻입니다.',
  },
  {
    term: '취약인구',
    body: '65세 이상 어르신과 0~9세 어린이 인구를 합친 수입니다. 응급 상황에서 이동·대응이 상대적으로 어려운 경우가 많아 분석에 포함했습니다.',
  },
  {
    term: '응급의료기관 종류',
    body: '권역·대형은 중증 응급을 주로 받는 큰 병원, 준종합은 일반 응급 진료가 가능한 병원, 달빛어린이는 야간·휴일 소아 응급을 돕는 지정 기관입니다.',
  },
  {
    term: '고위험 행정동',
    body: '사각지대 지수가 상위 25%에 해당하는 동입니다. 우선적으로 살펴볼 지역을 가리키는 참고 지표이며, 개인의 실제 접근 시간과는 다를 수 있습니다.',
  },
] as const;

export function MetricsGuide() {
  return (
    <details className="group shrink-0 border-b border-slate-300/80 bg-[#f3f7fc]">
      <summary className="mx-auto flex max-w-[1800px] cursor-pointer list-none items-center justify-between gap-2 px-4 py-2 text-sm text-slate-600 marker:content-none md:px-6 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="font-semibold text-slate-800">지표가 처음이신가요?</span>
          <span className="hidden text-slate-500 sm:inline"> — 쉬운 설명을 펼쳐 볼 수 있습니다</span>
        </span>
        <span
          className="text-xs font-medium text-slate-400 transition group-open:rotate-180"
          aria-hidden
        >
          ▼
        </span>
      </summary>

      <div className="max-h-[min(42vh,380px)] overflow-y-auto border-t border-slate-300/70 bg-white overscroll-y-contain">
        <div className="mx-auto grid max-w-[1600px] gap-5 px-4 py-5 md:grid-cols-2 md:px-8 md:py-6">
          {GUIDE_ITEMS.map((item) => (
            <div key={item.term} className="min-w-0 rounded-xl border border-slate-200/80 bg-[#fbfdff] p-4">
              <h3 className="text-sm font-semibold text-slate-900 md:text-base">{item.term}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{item.body}</p>
            </div>
          ))}
        </div>

        <p className="mx-auto max-w-[1600px] border-t border-slate-100 px-4 py-4 text-xs leading-relaxed text-slate-500 md:px-8 md:text-sm">
          거리는 행정동 중심에서 병원까지의 직선 거리이며, 실제 도로·교통 상황과 다를 수 있습니다.
          응급·위급 상황에서는 119 또는 1339를 이용해 주세요. 응급실 찾기는 상단{' '}
          <span className="font-medium text-indigo-600">응급실 목록</span>을 이용해 주세요.
        </p>
      </div>
    </details>
  );
}
