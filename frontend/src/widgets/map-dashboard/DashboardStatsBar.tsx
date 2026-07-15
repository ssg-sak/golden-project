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
  populationBaseMonth?: string;
  adminAreaChangeText?: string;
  emergencyChangeText?: string;
  highRiskChangeText?: string;
  dataStale?: boolean;
}

function formatUpdatedAt(value?: string | null): string {
  if (!value) return '확인 중';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '확인 중';
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

function formatMetric(value: number | undefined, loading?: boolean): string {
  if (loading || value === undefined) return '-';
  return value.toLocaleString('ko-KR');
}

function formatDelta(delta?: number | null, changeText?: string): string {
  if (changeText) return changeText;
  if (delta === null || delta === undefined) return '변화 확인 중';
  if (delta === 0) return '변화 없음';
  return delta > 0 ? `${delta} 증가` : `${Math.abs(delta)} 감소`;
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
  populationBaseMonth = '2026.06',
  adminAreaChangeText,
  emergencyChangeText,
  highRiskChangeText,
  dataStale = false,
}: DashboardStatsBarProps) {
  const totalHospitals = tier1Count + tier2Count + tier3Count;

  const rows = [
    {
      label: '분석 행정동',
      metric: formatMetric(districtCount, loading),
      detail: `대구 읍·면·동 기준 · ${formatDelta(undefined, adminAreaChangeText)}`,
    },
    {
      label: '응급의료기관',
      metric: formatMetric(totalHospitals, loading),
      detail: `권역·대형 ${formatMetric(tier1Count, loading)} · 준종합 ${formatMetric(tier2Count, loading)} · 달빛소아 ${formatMetric(tier3Count, loading)} · ${formatDelta(totalHospitalsDelta, emergencyChangeText)}`,
    },
    {
      label: '고위험 행정동',
      metric: formatMetric(highRiskDistrictCount, loading),
      detail: `VDI Log ${Math.round(highRiskThreshold ?? 0).toLocaleString('ko-KR')} 이상 · ${formatDelta(highRiskDelta, highRiskChangeText)}`,
    },
    {
      label: '인구 기준월',
      metric: populationBaseMonth,
      detail: '주민등록인구 기준',
    },
  ];

  return (
    <section className="shrink-0 border-b border-slate-300 bg-white" aria-label="정책 현황 요약">
      <div className="mx-auto max-w-[1800px] px-4 py-3 md:px-6">
        <div className="grid gap-3 border-b border-slate-300 pb-3 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-xs font-bold text-teal-800">정책 현황 요약</p>
            <h1 className="mt-0.5 text-lg font-extrabold text-slate-900">
              대구 응급의료 접근성 모니터링
            </h1>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              기본 지표는 <strong>VDI Log</strong>, 비교 보조 지표는 <strong>VDI Norm 0~100</strong>입니다.
              병원 접근성과 취약인구를 함께 봅니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] font-bold">
            <span className="rounded-md bg-red-50 px-2.5 py-1 text-red-700 ring-1 ring-red-200">
              매우 높음 10,000+
            </span>
            <span className="rounded-md bg-orange-50 px-2.5 py-1 text-orange-700 ring-1 ring-orange-200">
              높음 5,000+
            </span>
            <span className="rounded-md bg-amber-50 px-2.5 py-1 text-amber-700 ring-1 ring-amber-200">
              관찰 1,500+
            </span>
          </div>
        </div>

        <dl className="grid divide-y divide-slate-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
          {rows.map(({ label, metric, detail }) => (
            <div key={label} className="px-3 py-3 first:pl-0">
              <dt className="text-xs font-bold text-slate-600">{label}</dt>
              <dd className="mt-1 flex flex-wrap items-baseline gap-2">
                <strong className="text-xl font-extrabold tabular-nums text-slate-900">{metric}</strong>
                <span className="text-[11px] leading-4 text-slate-500">{detail}</span>
              </dd>
            </div>
          ))}
        </dl>

        <p className="border-t border-slate-200 pt-2 text-[11px] text-slate-500">
          병원 {formatUpdatedAt(hospitalsUpdatedAt)} 갱신 · 분석 {formatUpdatedAt(vulnerabilityUpdatedAt)} 갱신
          {dataStale ? ' · 공공데이터 갱신 지연으로 마지막 정상 자료 표시 중' : ''}
        </p>
      </div>
    </section>
  );
}
