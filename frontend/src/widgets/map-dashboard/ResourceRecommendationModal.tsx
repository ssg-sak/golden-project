import { useResourceSimulation, type ResourceRecommendation } from './lib/useResourceSimulation';
import {
  candidateDistrictFromCoordinates,
  type CandidateMode,
} from './lib/candidate-location-labels';

interface ResourceRecommendationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const priorityStyle: Record<ResourceRecommendation['resource_gap']['priority_level'], string> = {
  HIGH: 'bg-rose-100 text-rose-700 ring-1 ring-rose-300/60',
  MEDIUM: 'bg-amber-100 text-amber-700 ring-1 ring-amber-300/60',
  LOW: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300/60',
  REVIEW: 'bg-sky-100 text-sky-700 ring-1 ring-sky-300/60',
};

const priorityLabel: Record<ResourceRecommendation['resource_gap']['priority_level'], string> = {
  HIGH: '우선 검토',
  MEDIUM: '보강 검토',
  LOW: '모니터링',
  REVIEW: '별도 권역',
};

function modeLabel(pipeline: ResourceRecommendation['pipeline']) {
  return pipeline === 'pediatric' ? '소아' : '어르신';
}

function groupLabel(group: ResourceRecommendation['candidate_group']) {
  if (group === 'main_daegu') return '도시권 검토';
  if (group === 'separate_region') return '별도 권역';
  if (group === 'hold') return '추가 확인';
  return '검토 후보';
}

function recommendationAreaLabel(rec: ResourceRecommendation): string {
  const mode = rec.pipeline as CandidateMode;
  return (
    candidateDistrictFromCoordinates(mode, rec.location.lat, rec.location.lng) ??
    rec.regionName ??
    '대구 권역 미확인'
  );
}

export function ResourceRecommendationModal({ isOpen, onClose }: ResourceRecommendationModalProps) {
  const { recommendations, loading, error } = useResourceSimulation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center p-0 sm:items-center sm:p-4 lg:p-6">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="relative flex max-h-[min(92dvh,760px)] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl ring-1 ring-slate-900/5 sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl lg:max-h-[calc(100dvh-3rem)]">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-4 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-bold text-slate-800">정책 우선 검토 후보와 자원 보강 시나리오</h2>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-500">
              이 표는 민감도 분석에서 반복 등장한 후보를 기준으로 반경 5km 안의 병원 인프라를 1차로 살펴본
              사전 검토 자료입니다. 실제 입지 확정, 예산 배정, 의료기관 지정 근거가 아니라 현장 조사와 전문가
              검토를 시작할 후보를 좁히는 참고 자료입니다.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="닫기"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overscroll-contain overflow-y-auto px-4 py-5 sm:p-6">
          <div className="mb-5 grid gap-3 rounded-2xl bg-amber-50 p-4 text-xs leading-relaxed text-amber-950 ring-1 ring-amber-200 md:grid-cols-3">
            <p>
              <strong>자료 기준:</strong> 일부 병원 전문의 수와 MRI/CT 정보는 기준 시점이 다른 자료와 추정치를 함께 사용했습니다.
            </p>
            <p>
              <strong>후보 의미:</strong> 지도에 표시된 위치는 최종 입지가 아니라 먼저 살펴볼 참고 후보입니다.
            </p>
            <p>
              <strong>해석 범위:</strong> 교통, 부지, 예산, 법적 지정 요건은 아직 반영되지 않았습니다.
            </p>
          </div>

          <div className="mb-5 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <h3 className="text-sm font-extrabold text-slate-800">용어 해설</h3>
            <div className="mt-3 grid gap-3 text-xs leading-relaxed text-slate-600 md:grid-cols-2">
              <p><strong>우선 검토 후보</strong>: 확정 위치가 아니라 먼저 현장 확인할 분석 후보입니다.</p>
              <p><strong>분석 수요</strong>: 실제 환자 수가 아니라 후보 산출에 사용된 취약 수요 묶음의 규모입니다.</p>
              <p><strong>민감도 반복률</strong>: K, seed, 거리 상한, 군위 처리 조건을 바꿔도 다시 등장한 비율입니다.</p>
              <p><strong>반경 5km</strong>: 후보 주변 병원 인프라를 보는 1차 탐색 범위입니다.</p>
              <p><strong>전문의 보강</strong>: 공식 정원 산정이 아니라 주변 병원 평균을 이용한 보강 필요 추정치입니다.</p>
              <p><strong>MRI/CT 보강</strong>: 장비 도입 확정이 아니라 진료 기능과 역할 분담을 검토할 신호입니다.</p>
              <p><strong>별도 권역</strong>: 군위나 원거리처럼 메인 대구권 후보와 분리해 해석해야 하는 후보입니다.</p>
              <p><strong>설명용 점수</strong>: 접근성 개선과 커버 인구를 결합한 후보 설명용 참고값입니다.</p>
            </div>
          </div>

          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <span className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
            </div>
          ) : error ? (
            <div className="flex h-40 flex-col items-center justify-center text-center">
              <p className="text-sm font-semibold text-rose-600">{error}</p>
            </div>
          ) : recommendations.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-slate-500">
              표시할 검토 후보가 없습니다.
            </div>
          ) : (
            <div className="grid gap-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:grid-cols-2">
              {recommendations.map((rec) => {
                const priority = rec.resource_gap.priority_level;
                const areaLabel = recommendationAreaLabel(rec);
                return (
                  <article
                    key={`${rec.pipeline}-${rec.cluster_id}-${rec.location.lat}-${rec.location.lng}`}
                    className="overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:shadow-md"
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-extrabold text-slate-800">
                          {modeLabel(rec.pipeline)} {areaLabel} 권역
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          {groupLabel(rec.candidate_group)} · 내부번호 #{rec.cluster_id}
                        </p>
                        <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                          좌표값 대신 후보가 속한 대략적인 행정권역으로 표시합니다.
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ${priorityStyle[priority]}`}>
                        {priorityLabel[priority]}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <Metric label="반복률" value={rec.scenario_coverage_ratio !== undefined ? `${(rec.scenario_coverage_ratio * 100).toFixed(1)}%` : '-'} />
                      <Metric label="분석 수요" value={`${rec.demand.toLocaleString('ko-KR')}건`} />
                      <Metric label="주변 병원" value={`${rec.nearby_count}곳`} />
                      <Metric label="평균 전문의" value={`${rec.resource_gap.avg_doctors_nearby}명`} />
                      <Metric label="보강 추정" value={`${rec.resource_gap.doctors_needed}명`} />
                      <Metric label="MRI 커버" value={`${Math.round(rec.resource_gap.mri_coverage_ratio * 100)}%`} />
                    </div>

                    <p className="mt-4 text-xs font-medium leading-relaxed text-slate-700">{rec.recommendation}</p>
                    <p className="mt-3 border-t border-slate-100 pt-3 text-[11px] leading-relaxed text-slate-400">
                      {rec.disclaimer ?? '정책 검토용 참고 자료이며 실제 정책 결정에는 별도 검증이 필요합니다.'}
                    </p>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
      <p className="text-[10px] font-bold text-slate-400">{label}</p>
      <p className="mt-0.5 font-extrabold text-slate-700">{value}</p>
    </div>
  );
}
