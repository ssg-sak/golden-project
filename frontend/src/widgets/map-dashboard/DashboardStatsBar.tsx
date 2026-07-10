interface DashboardStatsBarProps {
  districtCount: number;
  tier1Count: number;
  tier2Count: number;
  tier3Count: number;
  highRiskDistrictCount?: number;
  highRiskThreshold?: number;
  loading?: boolean;
  hospitalsUpdatedAt?: string | null;
  vulnerabilityUpdatedAt?: string | null;
  totalHospitalsDelta?: number | null;
  highRiskDelta?: number | null;
}

function formatUpdatedAt(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

function formatValue(value: number | undefined, loading?: boolean): string {
  if (loading) return '—';
  if (value === undefined) return '—';
  return value.toLocaleString('ko-KR');
}

function formatDelta(value?: number | null): string {
  if (value == null || Number.isNaN(value)) return '변화 없음';
  if (value === 0) return '변화 없음';
  return value > 0 ? `직전 대비 +${value}` : `직전 대비 ${value}`;
}

interface MetricProps {
  label: string;
  value: string;
  detail?: string;
  accent?: string;
}

function Metric({ label, value, detail, accent = 'bg-slate-400' }: MetricProps) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1 rounded-xl border border-slate-200/80 bg-white px-3 py-2 shadow-[0_1px_0_rgba(15,23,42,0.03)]">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 shrink-0 rounded-full ${accent}`} aria-hidden />
        <span className="text-xs font-semibold tracking-tight text-slate-600">{label}</span>
      </div>
      <p className="text-2xl font-extrabold tabular-nums tracking-tight text-slate-900 md:text-[1.55rem]">
        {value}
      </p>
      {detail && <p className="text-[11px] leading-snug text-slate-500">{detail}</p>}
    </div>
  );
}

export function DashboardStatsBar({
  districtCount,
  tier1Count,
  tier2Count,
  tier3Count,
  highRiskDistrictCount,
  highRiskThreshold,
  loading,
  hospitalsUpdatedAt,
  vulnerabilityUpdatedAt,
  totalHospitalsDelta,
  highRiskDelta,
}: DashboardStatsBarProps) {
  const totalHospitals = tier1Count + tier2Count + tier3Count;

  return (
    <section
      className="shrink-0 border-b border-slate-300/70 bg-[#f6f9fc]"
      aria-label="대시보드 요약 지표"
    >
      <div className="mx-auto max-w-[1800px] px-4 py-2.5 md:px-6 md:py-3.5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4 sm:gap-y-0">
            <Metric
              label="분석 행정동"
              value={formatValue(districtCount, loading)}
              detail="대구광역시 읍·면·동"
              accent="bg-slate-500"
            />
            <Metric
              label="응급의료기관"
              value={formatValue(totalHospitals, loading)}
              detail={`권역·대형 ${formatValue(tier1Count, loading)} · 준종합 ${formatValue(tier2Count, loading)} · 달빛·소아 ${formatValue(tier3Count, loading)} (${formatDelta(totalHospitalsDelta)})`}
              accent="bg-red-600"
            />
            <Metric
              label="고위험 행정동"
              value={formatValue(highRiskDistrictCount, loading)}
              detail={`기준 ${Math.round(highRiskThreshold ?? 0)} (${formatDelta(highRiskDelta)})`}
              accent="bg-amber-600"
            />
            <Metric
              label="인구 데이터"
              value="2026.06"
              detail="통계청 주민등록인구"
              accent="bg-slate-400"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600">
            <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-300/80">
              병원 데이터 {formatUpdatedAt(hospitalsUpdatedAt)}
            </span>
            <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-300/80">
              분석 데이터 {formatUpdatedAt(vulnerabilityUpdatedAt)}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
