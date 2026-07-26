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
      <div className="mx-auto max-w-[1800px] px-4 py-2 md:px-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between border-b border-slate-300 pb-2 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold text-slate-900">
                대구 응급의료 접근성 지도
              </h1>
              <p className="text-xs font-bold text-teal-800">정책 현황 요약</p>
            </div>
            <p className="mt-0.5 text-xs text-slate-600">
              병원까지의 거리와 보호가 필요한 인구를 함께 보며, 먼저 살펴볼 동네를 좁힙니다.
            </p>
          </div>
          <div className="flex flex-col items-start gap-1.5 text-xs font-bold lg:items-end">
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-md bg-red-50 px-2 py-0.5 text-red-700 ring-1 ring-red-200">
                상위 25% 우선 확인
              </span>
              <span className="rounded-md bg-blue-50 px-2 py-0.5 text-blue-800 ring-1 ring-blue-200">
                현재 상대 경계 {Math.round(highRiskThreshold ?? 0).toLocaleString('ko-KR')}
              </span>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-600 ring-1 ring-slate-200">
                의료적 절대 기준 아님
              </span>
            </div>
          </div>
        </div>

        <details className="group border-t border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
          <summary className="flex cursor-pointer list-none items-center justify-between font-bold text-slate-700 [&::-webkit-details-marker]:hidden">
            <span>위험 점수는 어떻게 계산하고 읽나요?</span>
            <span className="text-slate-400 transition group-open:rotate-180" aria-hidden>⌄</span>
          </summary>
          <div className="mt-1.5 border-t border-slate-200 pt-1.5 leading-snug">
            위험 점수는 0~9세와 65세 이상 인구를 합친 보호 필요 인구에 최근접 응급 관련 기관까지의 도로 이동 부담을 결합한 비교값입니다. 150개 행정동 점수를 높은 순서로 정렬해 상위 25%를 먼저 확인할 지역으로 표시합니다.
            <br />
            현재 상대 경계 {Math.round(highRiskThreshold ?? 0).toLocaleString('ko-KR')} 이상인 동네는 먼저 확인할 비교 대상이며,
            {highRiskDistrictCount !== undefined ? ` 현재 ${highRiskDistrictCount}개 동네가 해당합니다.` : ''} 설치·진료 가능 여부를 자동으로 결정하는 값은 아닙니다.
          </div>
        </details>

        <dl className="grid divide-y divide-slate-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
          {rows.map(({ label, metric, detail }) => (
            <div key={label} className="px-3 py-2 first:pl-0">
              <dt className="text-xs font-bold text-slate-500">{label}</dt>
              <dd className="mt-0.5 flex flex-wrap items-baseline gap-1.5">
                <strong className="text-lg font-extrabold tabular-nums text-slate-900">{metric}</strong>
                <span className="text-[11px] leading-snug text-slate-500">{detail}</span>
              </dd>
            </div>
          ))}
        </dl>

        <div
          className="flex flex-wrap items-center gap-2 border-t border-slate-200 py-1.5 text-xs font-bold"
          aria-label="데이터 갱신 주기"
        >
          <span className="text-slate-500">데이터 갱신 기준:</span>
          <span className="rounded-md bg-amber-50 px-2 py-0.5 text-amber-900 ring-1 ring-amber-200">
            병상 변동 가능
          </span>
          <span className="rounded-md bg-blue-50 px-2 py-0.5 text-blue-800 ring-1 ring-blue-200">
            인구 월간 기준
          </span>
          <span className="rounded-md bg-violet-50 px-2 py-0.5 text-violet-800 ring-1 ring-violet-200">
            정책 분석 기준본
          </span>
        </div>

        <p className="border-t border-slate-200 pt-2 text-[11px] text-slate-500">
          병원 상태 확인 {formatUpdatedAt(hospitalsUpdatedAt)} · 분석 파일 확인 {formatUpdatedAt(vulnerabilityUpdatedAt)}
          {dataStale ? ' · 병원 등 운영정보의 최신 확인이 지연됨' : ''}
        </p>
      </div>
    </section>
  );
}
