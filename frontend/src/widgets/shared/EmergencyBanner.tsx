/** 시민 모드 상단 응급 연락 — 지도·사이드바와 시각적 경쟁을 줄인 슬림 배너 */
export function EmergencyBanner() {
  return (
    <div
      role="note"
      className="shrink-0 border-b border-slate-200 bg-white px-4 py-1.5 text-center text-xs text-slate-600 sm:px-6"
    >
      응급·위급 시{' '}
      <span className="font-bold text-rose-700">119</span>
      <span className="text-slate-300"> · </span>
      <span className="font-bold text-rose-700">1339</span>
    </div>
  );
}
