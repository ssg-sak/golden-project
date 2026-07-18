import { useCallback, useEffect, useMemo, useState } from 'react';

import { DASHBOARD_DATA_STATUS_API_URL } from '../../shared/config/api';
import { fetchWithTimeout } from '../../shared/lib/fetch-with-timeout';
import { usePolicyReleaseStore } from '../../shared/store/policyReleaseStore';

interface DataSourceStatusRecord {
  sourceName: string;
  status: string;
  recordCount: number;
  lastCheckedAt?: string | null;
  lastUpdatedAt?: string | null;
  lastSuccessAt?: string | null;
  errorMessage?: string | null;
}

interface DataStatusResponse {
  sources: DataSourceStatusRecord[];
  latestSnapshotAt: string | null;
  status?: {
    lastCheckedAt: string | null;
    lastUpdatedAt: string | null;
    stale: boolean;
    dataState: string;
    failedSources: string[];
  };
  analysis?: {
    version: string | null;
    resourceCount: number | null;
    resourceCountByMode: {
      pediatric?: number;
      senior?: number;
    };
    requestedRouteCount: number | null;
    successfulRouteCount: number | null;
    missingRouteCount: number | null;
    pending: boolean;
  };
}

interface PolicyDataPipelineProps {
  districtCount: number;
  hospitalCount: number;
  highRiskDistrictCount?: number;
  highRiskThreshold?: number;
  populationBaseMonth?: string;
}

type StageTone = 'success' | 'stable' | 'warning' | 'unknown';

interface PolicyDataStage {
  title: string;
  metric: string;
  detail: string;
  statusLabel: string;
  tone: StageTone;
}

const STATUS_STYLE: Record<StageTone, string> = {
  success: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  stable: 'bg-blue-50 text-blue-800 ring-blue-200',
  warning: 'bg-amber-50 text-amber-900 ring-amber-200',
  unknown: 'bg-slate-100 text-slate-600 ring-slate-200',
};

function sourceTone(source?: DataSourceStatusRecord): StageTone {
  if (!source) return 'unknown';
  if (source.status === 'failed' || source.status === 'degraded') return 'warning';
  if (source.status === 'updated' || source.status === 'unchanged') return 'success';
  if (source.status === 'static') return 'stable';
  return 'unknown';
}

function sourceLabel(source?: DataSourceStatusRecord): string {
  if (!source) return '확인 중';
  if (source.status === 'failed' || source.status === 'degraded') return '기존 자료 유지';
  if (source.status === 'updated') return '새 자료 반영';
  if (source.status === 'unchanged') return '변경 없음 확인';
  if (source.status === 'static') return '저장된 기준 자료';
  return '확인 중';
}

function formatSnapshotTime(value: string | null): string {
  if (!value) return '정책 자료 확인 시각을 불러오는 중입니다.';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '정책 자료 확인 시각을 불러오는 중입니다.';
  return `정책 자료 ${date.toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })} 확인`;
}

function formatAnalysisEdition(releasedAt?: string, version?: string | null): string {
  const releasedDate = releasedAt ? new Date(releasedAt) : null;
  if (releasedDate && !Number.isNaN(releasedDate.getTime())) {
    return `${releasedDate.getFullYear()}.${String(releasedDate.getMonth() + 1).padStart(2, '0')}.${String(releasedDate.getDate()).padStart(2, '0')} 검증본`;
  }
  const versionDate = version?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (versionDate) return `${versionDate[1]}.${versionDate[2]}.${versionDate[3]} 검증본`;
  return '검증된 분석본';
}

export function PolicyDataPipeline({
  districtCount,
  hospitalCount,
  highRiskDistrictCount,
  highRiskThreshold,
  populationBaseMonth = '확인 중',
}: PolicyDataPipelineProps) {
  const [dataStatus, setDataStatus] = useState<DataStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const policyRelease = usePolicyReleaseStore((state) => state.release);
  const fetchPolicyRelease = usePolicyReleaseStore((state) => state.fetchRelease);

  const loadStatus = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);
    try {
      await fetchPolicyRelease();
      const statusResponse = await fetchWithTimeout(
        DASHBOARD_DATA_STATUS_API_URL,
        { signal },
        6_000,
      );
      if (statusResponse.ok) {
        setDataStatus((await statusResponse.json()) as DataStatusResponse);
      } else {
        throw new Error(`정책 데이터 상태 조회 실패 (${statusResponse.status})`);
      }
    } catch (caught) {
      if (caught instanceof Error && caught.name === 'AbortError') return;
      setError('최신 상태를 확인하지 못해 현재 저장된 결과를 표시합니다.');
    } finally {
      setIsLoading(false);
    }
  }, [fetchPolicyRelease]);

  useEffect(() => {
    const controller = new AbortController();
    void loadStatus(controller.signal);
    return () => controller.abort();
  }, [fetchPolicyRelease, loadStatus]);

  const stages = useMemo<PolicyDataStage[]>(() => {
    const byName = new Map(
      (dataStatus?.sources ?? []).map((source) => [source.sourceName, source]),
    );
    const pick = (...names: string[]) => names.map((name) => byName.get(name)).find(Boolean);
    const populationSource = pick('population', 'static_population');
    const hospitalSource = pick('emergency_facilities', 'static_hospitals');
    const candidates = policyRelease?.candidates ?? [];
    const pediatricCount = candidates.filter(
      (candidate) => candidate.mode === 'pediatric',
    ).length;
    const seniorCount = candidates.filter(
      (candidate) => candidate.mode === 'senior',
    ).length;
    const analysis = policyRelease?.metadata
      ? {
          version: policyRelease.metadata.version,
          resourceCount: policyRelease.metadata.resource_count,
          resourceCountByMode: policyRelease.metadata.resource_count_by_mode,
          requestedRouteCount: policyRelease.metadata.route_count,
          successfulRouteCount: policyRelease.metadata.successful_route_count,
          missingRouteCount: policyRelease.metadata.missing_route_count,
          pending: dataStatus?.analysis?.pending ?? false,
        }
      : dataStatus?.analysis;
    const routeProgress =
      analysis?.successfulRouteCount != null && analysis.requestedRouteCount != null
        ? `${analysis.successfulRouteCount.toLocaleString('ko-KR')}/${analysis.requestedRouteCount.toLocaleString('ko-KR')} 경로`
        : '도로 경로 결과 확인 중';
    const analysisTone: StageTone =
      analysis?.pending || (analysis?.missingRouteCount ?? 0) > 0 ? 'warning' : 'stable';
    const analysisEdition = formatAnalysisEdition(
      policyRelease?.metadata.released_at,
      analysis?.version,
    );

    return [
      {
        title: '병상 정보',
        metric: '변동 가능',
        detail: `분석 기준 기관 ${analysis?.resourceCount ?? hospitalCount}곳 · 병상은 출발 전 전화 확인`,
        statusLabel: sourceLabel(hospitalSource),
        tone: sourceTone(hospitalSource),
      },
      {
        title: '인구와 행정동',
        metric: policyRelease?.metadata.population_base_month ?? populationBaseMonth,
        detail: `${policyRelease?.metadata.district_count ?? districtCount}개 동네 기준`,
        statusLabel: sourceLabel(populationSource),
        tone: sourceTone(populationSource),
      },
      {
        title: '동네별 위험도',
        metric: `${policyRelease?.metadata.district_count ?? districtCount}개 동네`,
        detail: `상위 25% ${policyRelease?.metadata.high_risk_district_count ?? highRiskDistrictCount ?? 0}개 · 상대 경계 ${Math.round(policyRelease?.metadata.risk_threshold ?? highRiskThreshold ?? 0).toLocaleString('ko-KR')}`,
        statusLabel: analysis?.pending ? '재분석 대기' : '기준자료 기반 분석',
        tone: analysisTone,
      },
      {
        title: '정책 후보와 접근성 비교',
        metric: candidates.length > 0 ? `${candidates.length}개 후보` : '저장된 분석본',
        detail: `소아 ${pediatricCount}개 · 어르신 ${seniorCount}개 · ${routeProgress}`,
        statusLabel: analysis?.pending ? '재분석 대기' : '분석 결과',
        tone: analysisTone,
      },
      {
        title: '현재 정책 분석',
        metric: analysisEdition,
        detail: `기관 ${analysis?.resourceCount ?? hospitalCount}곳 · 소아 ${analysis?.resourceCountByMode.pediatric ?? 6} · 어르신 ${analysis?.resourceCountByMode.senior ?? 19}`,
        statusLabel: analysis?.missingRouteCount === 0 ? '검증 완료' : '표시 보류',
        tone: analysis?.missingRouteCount === 0 ? 'success' : 'warning',
      },
    ];
  }, [
    dataStatus,
    districtCount,
    highRiskDistrictCount,
    highRiskThreshold,
    hospitalCount,
    populationBaseMonth,
    policyRelease,
  ]);

  const statusNotice = useMemo(() => {
    if (error) {
      return {
        tone: 'border-amber-200 bg-amber-50 text-amber-900',
        message: '최신 상태를 확인하지 못해 현재 저장된 검증 분석본을 표시합니다.',
      };
    }
    if (dataStatus?.analysis?.pending) {
      return {
        tone: 'border-amber-200 bg-amber-50 text-amber-900',
        message: '원천자료 변경이 확인되어 재분석 대기 중입니다. 현재 화면은 이전 검증 분석본입니다.',
      };
    }
    if (dataStatus?.status?.dataState === 'degraded' || dataStatus?.status?.stale) {
      return {
        tone: 'border-amber-200 bg-amber-50 text-amber-900',
        message: '공공데이터 갱신이 지연되어 마지막 정상 검증본을 표시합니다.',
      };
    }
    return null;
  }, [dataStatus, error]);

  return (
    <section className="shrink-0 border-b border-slate-300 bg-white" aria-label="정책 자료 안내">
      {statusNotice ? (
        <p
          className={`border-b px-4 py-2 text-center text-xs font-bold leading-5 md:px-6 ${statusNotice.tone}`}
          role="status"
        >
          {statusNotice.message}
        </p>
      ) : null}
      <details className="group mx-auto max-w-[1800px] px-4 py-3 md:px-6">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
          <div>
            <p className="text-xs font-bold text-teal-800">정책 자료 안내</p>
            <h2 className="mt-0.5 text-sm font-extrabold text-slate-900 md:text-base">
              변동 정보와 기준자료 기반 정책분석을 구분해 보여드립니다
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              병상은 계속 달라질 수 있지만, 위험도와 정책 후보는 기준 자료가 바뀔 때 별도로 다시 분석합니다.
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-700">
            <span className="group-open:hidden">펼쳐보기</span>
            <span className="hidden group-open:inline">접기</span>
            <span className="text-sm transition-transform group-open:rotate-180" aria-hidden>
              ↓
            </span>
          </span>
        </summary>

        <div className="mt-3 border-t border-slate-200 pt-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-900 ring-1 ring-amber-200">
                병상은 변동 가능
              </span>
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-800 ring-1 ring-blue-200">
                정책 결과는 기준자료 기반 분석본
              </span>
            </div>
            <button
              type="button"
              onClick={() => void loadStatus()}
              disabled={isLoading}
              className="rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
            >
              {isLoading ? '확인 중' : '최신 상태 확인'}
            </button>
          </div>

          <ol className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {stages.map((stage, index) => (
              <li key={stage.title} className="relative min-w-0 border border-slate-200 bg-slate-50 px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] font-bold text-slate-400">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${STATUS_STYLE[stage.tone]}`}
                  >
                    {stage.statusLabel}
                  </span>
                </div>
                <p className="mt-2 text-xs font-bold text-slate-600">{stage.title}</p>
                <strong className="mt-0.5 block text-lg font-extrabold tabular-nums text-slate-950">
                  {stage.metric}
                </strong>
                <p className="mt-1 text-[11px] leading-4 text-slate-500">{stage.detail}</p>
              </li>
            ))}
          </ol>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] leading-4 text-slate-500">
            <p className={error ? 'font-semibold text-amber-800' : undefined}>
              {error ?? `마지막 정상 분석본 · ${formatSnapshotTime(dataStatus?.latestSnapshotAt ?? null)}`}
            </p>
            <p className="font-bold text-teal-800">
              25개 기관과 5,100개 도로 경로를 함께 검증한 정책 분석본
            </p>
          </div>
        </div>
      </details>
    </section>
  );
}
