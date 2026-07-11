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
  if (!value) return '확인 중';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '확인 중';
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

function value(value: number | undefined, loading?: boolean): string {
  if (loading || value === undefined) return '—';
  return value.toLocaleString('ko-KR');
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
}: DashboardStatsBarProps) {
  const totalHospitals = tier1Count + tier2Count + tier3Count;

  const rows = [
    ['분석 행정동', value(districtCount, loading), '대구광역시 읍·면·동'],
    ['웹 등록 의료기관', value(totalHospitals, loading), `중증 거점 ${value(tier1Count, loading)} · 일반 응급 ${value(tier2Count, loading)} · 소아 ${value(tier3Count, loading)}`],
    ['고위험 행정동', value(highRiskDistrictCount, loading), `현재 기준값 ${Math.round(highRiskThreshold ?? 0)} 이상`],
    ['기준 인구자료', '2026.06', '주민등록인구 기준'],
  ];

  return (
    <section className="shrink-0 border-b border-slate-300 bg-white" aria-label="정책 현황 요약">
      <div className="mx-auto max-w-[1800px] px-4 py-3 md:px-6">
        <div className="flex flex-col gap-2 border-b border-slate-300 pb-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold text-teal-800">정책 현황 요약</p>
            <h1 className="mt-0.5 text-lg font-extrabold text-slate-900">대구광역시 응급의료 접근성 모니터링</h1>
          </div>
          <p className="text-xs text-slate-500">
            병원 {formatUpdatedAt(hospitalsUpdatedAt)} 갱신 · 분석 {formatUpdatedAt(vulnerabilityUpdatedAt)} 갱신
          </p>
        </div>
        <dl className="grid divide-y divide-slate-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
          {rows.map(([label, metric, detail]) => (
            <div key={label} className="px-3 py-3 first:pl-0">
              <dt className="text-xs font-bold text-slate-600">{label}</dt>
              <dd className="mt-1 flex items-baseline gap-2">
                <strong className="text-xl font-extrabold tabular-nums text-slate-900">{metric}</strong>
                <span className="text-[11px] leading-4 text-slate-500">{detail}</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
