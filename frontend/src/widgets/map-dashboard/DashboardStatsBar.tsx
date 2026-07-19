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
  populationBaseMonth?: string;
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
  populationBaseMonth = '확인 중',
  dataStale = false,
}: DashboardStatsBarProps) {
  const totalHospitals = tier1Count + tier2Count + tier3Count;

  const rows = [
    {
      label: '분석 동네',
      metric: formatMetric(districtCount, loading),
      detail: '대구 행정동 기준',
    },
    {
      label: '응급 관련 기관',
      metric: formatMetric(totalHospitals, loading),
      detail: `대형 ${formatMetric(tier1Count, loading)} · 준종합 ${formatMetric(tier2Count, loading)} · 소아야간 ${formatMetric(tier3Count, loading)}`,
    },
    {
      label: '위험 높은 동네',
      metric: formatMetric(highRiskDistrictCount, loading),
      detail: `상위 25% 상대 경계 ${Math.round(highRiskThreshold ?? 0).toLocaleString('ko-KR')}`,
    },
    {
      label: '인구 기준',
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
              대구 응급의료 접근성 지도
            </h1>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              병원까지의 거리와 보호가 필요한 인구를 함께 보며, 먼저 살펴볼 동네를 좁힙니다.
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 text-[11px] font-bold lg:items-end">
            <div className="flex flex-wrap gap-2">
            <span className="rounded-md bg-red-50 px-2.5 py-1 text-red-700 ring-1 ring-red-200">
              상위 25% 우선 확인
            </span>
            <span className="rounded-md bg-blue-50 px-2.5 py-1 text-blue-800 ring-1 ring-blue-200">
              현재 상대 경계 {Math.round(highRiskThreshold ?? 0).toLocaleString('ko-KR')}
            </span>
            <span className="rounded-md bg-slate-100 px-2.5 py-1 text-slate-700 ring-1 ring-slate-200">
              의료적 절대 기준 아님
            </span>
            </div>
            <p className="max-w-xl text-right text-[11px] font-normal leading-5 text-slate-500">
              150개 행정동 점수를 높은 순서로 정렬해 상위 25%를 먼저 확인할 지역으로 표시합니다. 경계값은 분석본에 따라 달라지는 비교용 숫자입니다.
            </p>
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

        <div
          className="flex flex-wrap items-center gap-1.5 border-t border-slate-200 py-2 text-[10px] font-bold sm:text-[11px]"
          aria-label="데이터 갱신 주기"
        >
          <span className="mr-1 text-slate-500">데이터 갱신 기준</span>
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-900 ring-1 ring-amber-200">
            병상 변동 가능
          </span>
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-800 ring-1 ring-blue-200">
            인구 월간 기준
          </span>
          <span className="rounded-full bg-violet-50 px-2.5 py-1 text-violet-800 ring-1 ring-violet-200">
            정책 분석 기준본
          </span>
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-900 ring-1 ring-amber-200">
            후보지·정책결과 수동 재분석
          </span>
        </div>

        <p className="border-t border-slate-200 pt-2 text-[11px] text-slate-500">
          병원 상태 확인 {formatUpdatedAt(hospitalsUpdatedAt)} · 분석 파일 확인 {formatUpdatedAt(vulnerabilityUpdatedAt)}
          {dataStale ? ' · 최신 자료 확인이 지연되어 저장된 자료를 표시 중' : ''}
        </p>
      </div>
    </section>
  );
}
