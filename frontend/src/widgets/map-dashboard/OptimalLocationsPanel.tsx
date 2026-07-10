import { useMemo } from 'react';
import { useOptimalLocationsStore, type OptimalLocation } from './lib/useOptimalLocationsStore';
import { useReverseGeocode } from './lib/useReverseGeocode';
import { DASHBOARD_SIDEBAR_PANEL_CLASS } from '../../shared/constants/dashboard-layout';

// -----------------------------------------------------------------------------
// Presentational (View) Components
// -----------------------------------------------------------------------------

export type InsightType = 'highest' | 'lowest' | 'normal';

interface LocationCardViewProps {
  location: OptimalLocation;
  address: string;
  loading: boolean;
  insightType: InsightType;
  maxDemand: number;
  currentMode: string;
}

function LocationCardView({ location, address, loading, insightType, maxDemand, currentMode }: LocationCardViewProps) {
  // 인구 대비 게이지 계산 (UI용)
  const percent = maxDemand > 0 ? Math.round((location.demand / maxDemand) * 100) : 0;
  
  let badgeColor = "bg-slate-100 text-slate-700 dark:text-slate-300 ring-slate-200";
  let badgeText = "📍 지역 밀착형 거점";
  let cardBorder = "ring-slate-200";
  let gaugeColor = "bg-slate-50 dark:bg-slate-7000";
  let shadow = "hover:shadow-md";

  if (insightType === 'highest') {
    badgeColor = "bg-rose-100 text-rose-700 ring-rose-200";
    badgeText = "🚨 최우선 확충 권역 (최대 수요)";
    cardBorder = "ring-rose-200 shadow-rose-100";
    gaugeColor = "bg-rose-500";
    shadow = "hover:shadow-lg hover:shadow-rose-100/50";
  } else if (insightType === 'lowest') {
    badgeColor = "bg-indigo-100 text-indigo-700 ring-indigo-200";
    badgeText = "💎 VDI 정책 발굴 거점 (극소외 지역)";
    cardBorder = "ring-indigo-200 shadow-indigo-100";
    gaugeColor = "bg-indigo-500";
    shadow = "hover:shadow-lg hover:shadow-indigo-100/50";
  }

  return (
    <div className={`flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 transition-all ${cardBorder} ${shadow} dark:bg-slate-800 dark:ring-slate-700`}>
      {/* Insight Badge */}
      <div className="flex w-full items-center justify-between">
        <span className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-bold ring-1 ring-inset ${badgeColor}`}>
          {badgeText}
        </span>
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 dark:text-slate-300">
          #{location.id}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
          AI 추천 거점 좌표 (K={currentMode === 'senior' ? '3' : '4'})
        </h4>
        <div className="flex items-start gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="mt-0.5 h-3.5 w-3.5 shrink-0">
            <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
          {loading ? (
            <span className="animate-pulse">주소 분석 중...</span>
          ) : (
            <span className="leading-snug">{address}</span>
          )}
        </div>
      </div>
      
      {/* Coverage Gauge */}
      <div className="mt-1 flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-slate-500 dark:text-slate-400">배후 사각지대 수요</span>
          <span className="font-bold text-slate-700 dark:text-slate-300">{location.demand}개소</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div 
            className={`h-full rounded-full ${gaugeColor} transition-all duration-1000 ease-out`} 
            style={{ width: `${Math.max(percent, 5)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

interface OptimalLocationsViewProps {
  locations: OptimalLocation[];
  maxDemand: number;
  highestId: number | null;
  lowestId: number | null;
  currentMode: string;
  onClose: () => void;
}

function OptimalLocationsView({ locations, maxDemand, highestId, lowestId, currentMode, onClose }: OptimalLocationsViewProps) {
  return (
    <aside className={DASHBOARD_SIDEBAR_PANEL_CLASS}>
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-100 px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-white">
              <path fillRule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813a3.75 3.75 0 002.576-2.576l.813-2.846A.75.75 0 019 4.5zM18 1.5a.75.75 0 01.728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 010 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 01-1.456 0l-.258-1.036a2.625 2.625 0 00-1.91-1.91l-1.036-.258a.75.75 0 010-1.456l1.036-.258a2.625 2.625 0 001.91-1.91l.258-1.036A.75.75 0 0118 1.5zM16.5 15a.75.75 0 01.712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 010 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 01-1.422 0l-.395-1.183a1.5 1.5 0 00-.948-.948l-1.183-.395a.75.75 0 010-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0116.5 15z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
            정책 분석 리포트
          </h2>
        </div>
        <button
          onClick={onClose}
          className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:text-slate-300"
          title="닫기"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-700/50 p-4">
        {/* Premium Banner for VDI Insights */}
        <div className="mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-900 p-4 text-white shadow-lg ring-1 ring-white/10 relative">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 blur-xl dark:bg-slate-50 dark:bg-slate-7000/10"></div>
          <div className="relative z-10">
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-purple-200 uppercase backdrop-blur-md dark:bg-purple-900/30">
                AI Pipeline
              </span>
              <span className="text-xs font-medium text-indigo-200">VDI 파인튜닝 적용됨</span>
            </div>
            <h3 className="mb-1 text-sm font-bold leading-snug">
              단순 밀집도(K=2)를 넘어선<br/>
              취약성 포용 최적 거점 (K={currentMode === 'senior' ? '3' : '4'})
            </h3>
            <p className="text-[11px] text-indigo-200/80 leading-relaxed">
              수요량뿐 아니라 지역별 소외 지수(VDI)를 정규화(Mean Normalization)하여 
              지리적으로 고립된 극소외 {currentMode === 'senior' ? '어르신' : '소아'} 거점 지역을 발굴한 AI 클러스터링 결과입니다.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {locations.map((loc) => {
            let insight: InsightType = 'normal';
            if (loc.id === highestId) insight = 'highest';
            if (loc.id === lowestId) insight = 'lowest';

            return (
              <LocationCardContainer 
                key={loc.id} 
                location={loc} 
                insightType={insight}
                maxDemand={maxDemand}
                currentMode={currentMode}
              />
            );
          })}
          
          {locations.length === 0 && (
            <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:text-slate-400">
              데이터가 없습니다.
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

// -----------------------------------------------------------------------------
// Container Components
// -----------------------------------------------------------------------------

function LocationCardContainer({ 
  location, 
  insightType,
  maxDemand,
  currentMode
}: { 
  location: OptimalLocation; 
  insightType: InsightType;
  maxDemand: number;
  currentMode: string;
}) {
  // 컴포넌트 밖의 훅(useReverseGeocode)을 통해 외부 API 호출 상태(State) 관리
  const { address, loading } = useReverseGeocode(location.lat, location.lng);
  
  // 상태 연산 후 View에 넘김
  return (
    <LocationCardView 
      location={location} 
      address={address} 
      loading={loading} 
      insightType={insightType} 
      maxDemand={maxDemand}
      currentMode={currentMode}
    />
  );
}

export function OptimalLocationsPanel() {
  const locations = useOptimalLocationsStore((state) => state.locations);
  const currentMode = useOptimalLocationsStore((state) => state.currentMode);
  const toggleLocations = useOptimalLocationsStore((state) => state.toggleLocations);

  // 컨테이너 레이어 연산: 최대/최소 수요 거점 발굴 (VDI 파인튜닝 인사이트 동적 부여)
  const { maxDemand, highestId, lowestId } = useMemo(() => {
    if (!locations || locations.length === 0) {
      return { maxDemand: 0, highestId: null, lowestId: null };
    }
    
    let maxD = -1;
    let minD = Infinity;
    let hId: number | null = null;
    let lId: number | null = null;

    locations.forEach(loc => {
      if (loc.demand > maxD) {
        maxD = loc.demand;
        hId = loc.id;
      }
      if (loc.demand < minD) {
        minD = loc.demand;
        lId = loc.id;
      }
    });

    return { maxDemand: maxD, highestId: hId, lowestId: lId };
  }, [locations]);

  return (
    <OptimalLocationsView 
      locations={locations} 
      maxDemand={maxDemand}
      highestId={highestId}
      lowestId={lowestId}
      currentMode={currentMode}
      onClose={toggleLocations} 
    />
  );
}
