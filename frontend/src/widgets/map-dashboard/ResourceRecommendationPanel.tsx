import { useEffect, useState } from 'react';

export interface ResourceRecommendation {
  pipeline: 'pediatric' | 'senior';
  cluster_id: number;
  location: { lat: number; lng: number };
  demand: number;
  nearby_hospitals: string[];
  nearby_count: number;
  resource_gap: {
    doctors_needed: number;
    mri_needed: boolean;
    ct_needed: boolean;
    avg_doctors_nearby: number;
    mri_coverage_ratio: number;
    priority_level: 'HIGH' | 'MEDIUM' | 'LOW';
  };
  recommendation: string;
}

export function ResourceRecommendationPanel() {
  const [recommendations, setRecommendations] = useState<ResourceRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}data/resource_recommendations.json`);
        if (!res.ok) throw new Error('데이터를 불러오지 못했습니다.');
        const data = await res.json();
        setRecommendations(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : '알 수 없는 오류');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) return null;
  if (error) return null; // 에러 시 조용히 숨김 (안전성 최우선)
  if (recommendations.length === 0) return null;

  return (
    <div className="mt-4 flex flex-col gap-3">
      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 pl-1">
        AI 인프라 확충 시뮬레이션 결과
      </h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        {recommendations.map((rec, idx) => {
          const isHigh = rec.resource_gap.priority_level === 'HIGH';
          
          return (
            <div 
              key={`${rec.pipeline}-${rec.cluster_id}-${idx}`}
              className="group relative overflow-hidden rounded-2xl bg-white/70 p-4 ring-1 ring-slate-200/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:bg-slate-900/60 dark:ring-slate-800"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none dark:from-white/5" />
              
              <div className="relative flex items-center justify-between mb-3">
                <span className="flex items-center gap-2">
                  <span className={`inline-flex h-2 w-2 rounded-full ${isHigh ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                  <span className="text-xs font-black tracking-tight text-slate-600 dark:text-slate-300">
                    {rec.pipeline === 'pediatric' ? '소아응급 거점' : '어르신 거점'} #{rec.cluster_id}
                  </span>
                </span>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-extrabold tracking-wide ${
                  isHigh 
                    ? 'bg-rose-100 text-rose-700 ring-1 ring-rose-300/50 dark:bg-rose-900/30 dark:text-rose-400 dark:ring-rose-800/50' 
                    : 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300/50 dark:bg-emerald-900/30 dark:text-emerald-400 dark:ring-emerald-800/50'
                }`}>
                  {rec.resource_gap.priority_level}
                </span>
              </div>

              <div className="relative space-y-2">
                {rec.recommendation.split('|').slice(1).map((text, lineIdx) => (
                  <p key={lineIdx} className="text-xs font-medium leading-relaxed text-slate-700 dark:text-slate-300">
                    {text.trim()}
                  </p>
                ))}
              </div>
              
              <div className="relative mt-4 flex items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                  수요 지수: {rec.demand}
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                  인접 병원: {rec.nearby_count}개소
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
