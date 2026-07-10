export function ChoroplethLegend() {
  return (
    <div
      className="map-float-card pointer-events-none p-3"
      aria-label="사각지대 지수 범례"
    >
      <p className="mb-2 text-xs font-bold text-slate-700">취약지구 지수</p>
      <div
        className="h-2.5 w-full min-w-[10rem] max-w-48 rounded-full shadow-inner"
        style={{
          background:
            'linear-gradient(to right, rgba(254,249,195,0.9) 0%, #fca5a5 55%, #7f1d1d 100%)',
        }}
      />
      <div className="mt-1.5 flex w-full min-w-[10rem] max-w-48 justify-between text-[10px] font-semibold text-slate-500">
        <span>양호</span>
        <span className="text-rose-900">주의</span>
      </div>
    </div>
  );
}
