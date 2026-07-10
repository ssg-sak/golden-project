import { useOptimalLocationsStore } from './lib/useOptimalLocationsStore';

export function PolicyWelcomePanel() {
  const currentMode = useOptimalLocationsStore((state) => state.currentMode);
  const isSenior = currentMode === 'senior';

  return (
    <div className="flex h-full flex-col bg-white p-6 shadow-sm border-l border-slate-200 overflow-y-auto">
      {/* 1. Header (공공 정책 보고서 스타일) */}
      <div className="mb-8 border-b-2 border-slate-800 pb-4 mt-2">
        <div className="mb-2 flex items-center gap-2">
          <div className="h-6 w-1.5 bg-[#004ea2]" />
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            데이터 기반 정책 의사결정 지원
          </h2>
        </div>
        <p className="mt-4 text-[15px] leading-relaxed text-slate-700 break-keep text-justify">
          막연한 민원 위주의 자원 배분에서 탈피하여, 
          <strong className="font-semibold text-slate-900"> 사각지대 지수(VDI)</strong> 및 
          <strong className="font-semibold text-slate-900"> AI 공간 분석(K-Means)</strong> 기반의 
          객관적이고 공정한 의료 거점 선정 기준을 제시합니다.
        </p>
      </div>

      {/* 2. ROI Section (공식 브리핑 자료 형태) */}
      <div className="mb-8 border border-slate-300 bg-[#f8fafc] p-5 rounded-sm">
        <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900 border-b border-slate-300 pb-2">
          <span className="text-[#004ea2] text-sm">■</span> 의료 안전망 확충 시뮬레이션 결과
        </h3>
        
        <div className="flex flex-col gap-px mb-5 bg-slate-300 border border-slate-300">
          <div className="flex items-center justify-between bg-white px-4 py-3">
            <span className="text-sm font-medium text-slate-600">
              [현재] {isSenior ? '취약계층 노인가구 커버리지 (3km 내)' : '보호 유치원 커버리지 (3km 내)'}
            </span>
            <span className="text-sm font-bold text-slate-700">
              {isSenior ? '74.5%' : '89.2%'} <span className="font-normal text-slate-500">{isSenior ? '(120/161개소)' : '(885/992개소)'}</span>
            </span>
          </div>
          
          <div className="flex items-center justify-between bg-[#f0f5fa] px-4 py-3">
            <span className="text-sm font-bold text-[#004ea2]">
              [개선] VDI 파인튜닝 거점 {isSenior ? '3곳' : '4곳'} 신설 시
            </span>
            <span className="text-sm font-bold text-[#004ea2]">
              100.0% <span className="font-normal opacity-80">{isSenior ? '(161/161개소)' : '(992/992개소)'}</span>
            </span>
          </div>
        </div>

        <div className="border-l-4 border-[#004ea2] bg-white px-4 py-3 shadow-sm">
          <p className="text-[14px] font-bold text-slate-800 leading-snug">
            기대 효과: <span className="text-[#004ea2]">K-Means (K={isSenior ? '3' : '4'}) 모바일 클리닉 투입으로 사각지대 100% 해소</span>
          </p>
          <ul className="mt-2 pt-2 border-t border-slate-100 flex flex-col gap-1.5 text-[13px] text-slate-600">
            {isSenior ? (
              <>
                <li className="flex items-center gap-1.5">
                  <span className="w-1 h-1 bg-slate-400 rounded-full" />
                  <span><strong>제1거점 (달성군 남부 수요권)</strong>: 다수 독거가구 커버 (최우선 인프라)</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-1 h-1 bg-slate-400 rounded-full" />
                  <span><strong>제2거점 (동구 외곽 취약권)</strong>: 교통 소외 노인가구 타겟팅</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
                  <span className="text-rose-700"><strong>제3거점 (군위군 북부권)</strong>: 초고령화 VDI 집중 타겟</span>
                </li>
              </>
            ) : (
              <>
                <li className="flex items-center gap-1.5">
                  <span className="w-1 h-1 bg-slate-400 rounded-full" />
                  <span><strong>제1거점 (동북부 거대 수요권)</strong>: 63개소 커버 (굳건한 최우선 인프라)</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-1 h-1 bg-slate-400 rounded-full" />
                  <span><strong>제2거점 (남서부 심해 취약권)</strong>: 21개소 커버 (정밀 타겟팅)</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-1 h-1 bg-slate-400 rounded-full" />
                  <span><strong>제3거점 (서부 도심 외곽권)</strong>: 20개소 커버 (신규 분리)</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
                  <span className="text-rose-700"><strong>제4거점 (북부 최북단)</strong>: 3개소 커버 (VDI 집중 타겟)</span>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>

      {/* 3. Call to Action (공지사항 및 안내 형태) */}
      <div className="mt-auto border border-slate-300 bg-[#f1f5f9] p-4 rounded-sm">
        <p className="flex items-start gap-2.5 text-[14px] font-medium leading-relaxed text-slate-700">
          <span className="text-[#004ea2] font-bold mt-[1px]">※</span>
          <span>
            좌측 지도의 <strong className="text-rose-700">붉은색 히트맵(고위험군)</strong> 지역을 클릭하여, 
            해당 행정동의 상세 사각지대 지수(VDI) 및 현황을 확인하시기 바랍니다.
          </span>
        </p>
      </div>
    </div>
  );
}
