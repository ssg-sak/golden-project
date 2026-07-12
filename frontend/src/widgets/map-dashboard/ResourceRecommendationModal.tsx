import { useResourceSimulation } from './lib/useResourceSimulation';

interface ResourceRecommendationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ResourceRecommendationModal({ isOpen, onClose }: ResourceRecommendationModalProps) {
  const { recommendations, loading, error } = useResourceSimulation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5 dark:bg-slate-900 dark:ring-white/10 max-h-[90vh]">
        
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              AI 인프라 확충 시뮬레이션 결과
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              취약 거점 반경 5km 내 의료 자원을 스캔하여 분석한 권고안입니다.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <span className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
            </div>
          ) : error ? (
            <div className="flex h-40 flex-col items-center justify-center text-center">
              <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">데이터를 불러오지 못했습니다.</p>
            </div>
          ) : recommendations.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-slate-500">
              시뮬레이션 결과가 없습니다.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {recommendations.map((rec, idx) => {
                const isHigh = rec.resource_gap.priority_level === 'HIGH';
                return (
                  <div 
                    key={`${rec.pipeline}-${rec.cluster_id}-${idx}`}
                    className="group relative overflow-hidden rounded-2xl bg-slate-50/50 p-5 ring-1 ring-slate-200/50 transition-all duration-300 hover:bg-white hover:shadow-lg dark:bg-slate-800/50 dark:ring-slate-700/50 dark:hover:bg-slate-800"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex h-2 w-2 rounded-full ${isHigh ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                          {rec.pipeline === 'pediatric' ? '소아응급' : '어르신'} 거점 #{rec.cluster_id}
                        </span>
                      </div>
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-black tracking-wide ${
                        isHigh 
                          ? 'bg-rose-100 text-rose-700 ring-1 ring-rose-300/50 dark:bg-rose-900/30 dark:text-rose-400' 
                          : 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300/50 dark:bg-emerald-900/30 dark:text-emerald-400'
                      }`}>
                        {rec.resource_gap.priority_level}
                      </span>
                    </div>

                    {rec.regionName && (
                      <div className="mb-3 inline-flex items-center gap-1.5 rounded-md bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {rec.regionName}
                      </div>
                    )}

                    <div className="space-y-2 mt-2">
                      {rec.recommendation.split('|').slice(1).map((text, lineIdx) => (
                        <p key={lineIdx} className="text-xs font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                          {text.trim()}
                        </p>
                      ))}
                    </div>
                    
                    <div className="mt-4 flex items-center gap-3 border-t border-slate-200/60 pt-3 dark:border-slate-700">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        수요: {rec.demand}개소
                      </span>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        인접 병원: {rec.nearby_count}개소
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
