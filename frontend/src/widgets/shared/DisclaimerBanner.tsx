export function DisclaimerBanner() {
  return (
    <div
      role="note"
      className="shrink-0 bg-slate-50 px-4 py-2 text-center text-[11px] text-slate-600 sm:px-6 sm:text-xs border-b border-slate-200"
    >
      <span className="mr-1.5 inline-block font-bold text-amber-600" aria-hidden="true">안내</span>
      이 서비스는 병원 탐색을 돕는 참고 도구이며 응급 이송, 진료 가능 여부 또는 수용 가능 여부를 결정하지 않습니다.{' '}
      <strong className="font-semibold text-slate-700">위급할 때는 119, 의료상담은 1339, 방문 전에는 의료기관에 확인하세요.</strong>
    </div>
  );
}
