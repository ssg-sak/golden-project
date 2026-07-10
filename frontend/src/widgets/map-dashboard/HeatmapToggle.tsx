import { useVulnerabilityStore } from '../../shared/store/vulnerabilityStore';

export function HeatmapToggle() {
  const showHeatmap = useVulnerabilityStore((state) => state.showHeatmap);
  const toggleHeatmap = useVulnerabilityStore((state) => state.toggleHeatmap);
  const vulnerabilityError = useVulnerabilityStore((state) => state.error);
  const features = useVulnerabilityStore((state) => state.features);
  const isLoading = useVulnerabilityStore((state) => state.isLoading);

  const disabled = isLoading || vulnerabilityError !== null || features.length === 0;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={showHeatmap}
      aria-disabled={disabled}
      disabled={disabled}
      aria-label="취약지구 히트맵 보기"
      onClick={toggleHeatmap}
      title={
        disabled
          ? '동네 분석 데이터를 불러온 뒤 사용할 수 있습니다'
          : undefined
      }
      className={`inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${
        showHeatmap
          ? 'bg-[#2b63d9] text-white ring-1 ring-[#1f4ea8]/30'
          : 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50'
      }`}
    >
      <span>취약지구 히트맵</span>
      <span
        className={`inline-flex h-5 w-9 shrink-0 items-center overflow-hidden rounded-full p-0.5 transition-colors ${
          showHeatmap ? 'justify-end bg-white/30' : 'justify-start bg-slate-200'
        }`}
        aria-hidden
      >
        <span className="h-3.5 w-3.5 shrink-0 rounded-full bg-white shadow-sm" />
      </span>
    </button>
  );
}
