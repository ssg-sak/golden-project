import { useState, useEffect } from 'react';
import { useAppModeStore } from '../../shared/store/appModeStore';

export function DemoNoticeModal() {
  const isSimulationMode = useAppModeStore((state) => state.isSimulationMode);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasSeenNotice = sessionStorage.getItem('hasSeenDemoNotice');
    if (isSimulationMode && !hasSeenNotice) {
      setIsOpen(true);
    }
  }, [isSimulationMode]);

  const handleClose = () => {
    sessionStorage.setItem('hasSeenDemoNotice', 'true');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm transition-opacity">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5">
        <div className="bg-rose-600 px-6 py-4 text-white">
          <div className="flex items-center gap-2">
            <span className="text-2xl animate-pulse" aria-hidden>🚨</span>
            <h2 className="text-lg font-extrabold leading-tight">
              [안내] 포트폴리오 시연 전용
            </h2>
          </div>
        </div>
        
        <div className="px-6 py-5 text-sm text-slate-700">
          <p className="mb-4 font-semibold text-slate-900">
            본 페이지는 기획 및 프론트엔드 UI/UX 시연을 위한 <span className="text-rose-600">목업(Mock-up) 데모</span>입니다.
          </p>
          <p className="mb-3 leading-relaxed font-bold text-slate-800">
            현재 백엔드 라이브 서버와 연동되어 있지 않으며, 아래와 같은 기능적 제약이 존재합니다:
          </p>
          <ul className="mb-6 space-y-3 rounded-xl bg-slate-50 p-4 text-xs leading-relaxed ring-1 ring-slate-200">
            <li className="flex gap-2">
              <span className="font-bold text-rose-500">1.</span>
              <span><strong className="text-slate-800">좌표 및 길찾기 오류:</strong> 하드코딩된 더미 데이터 특성 상, 병원의 위경도 좌표가 실제와 달라 카카오내비 연동 시 오차가 발생합니다.</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-rose-500">2.</span>
              <span><strong className="text-slate-800">필터 오작동:</strong> 정적 데이터의 한계로 인해 '진료 가능한 병원만 보기' 등 필터 적용 시, 응급실 목록 전체가 일시적으로 숨겨질 수 있습니다.</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-rose-500">3.</span>
              <span><strong className="text-slate-800">가상 시뮬레이션:</strong> 표시되는 병상 수 및 도착 예상 시간(ETA)은 실제 상황이 아닌 특정 시나리오의 가상 렌더링입니다.</span>
            </li>
          </ul>
        </div>
        
        <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 flex flex-col gap-2">
          <button
            onClick={handleClose}
            className="w-full rounded-xl bg-rose-600 py-3.5 text-sm font-extrabold text-white shadow-md transition-all hover:bg-rose-700 active:scale-95"
          >
            위 한계점을 모두 인지하였으며, 확인했습니다
          </button>
        </div>
      </div>
    </div>
  );
}
