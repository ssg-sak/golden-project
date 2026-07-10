export function DisclaimerBanner() {
  return (
    <div
      role="note"
      className="shrink-0 bg-slate-50 px-4 py-2 text-center text-[11px] text-slate-600 sm:px-6 sm:text-xs border-b border-slate-200"
    >
      <span className="mr-1.5 inline-block font-bold text-amber-600" aria-hidden="true">안내</span>
      본 플랫폼은 빠른 물리적 이송 목적이며, 특정 병원 쏠림 방지를 위해 <strong className="font-semibold text-slate-700">전문의 상주 여부 등 세부 임상 정보는 제공하지 않습니다.</strong>
    </div>
  );
}
