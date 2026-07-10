import { useAppModeStore } from '../../shared/store/appModeStore';

export function SimulationBanner() {
  const isSimulationMode = useAppModeStore((state) => state.isSimulationMode);

  if (!isSimulationMode) return null;

  return (
    <div className="flex items-center justify-center bg-red-600 px-4 py-2 text-center text-xs font-bold text-white shadow-md sm:text-sm">
      <span className="mr-2 animate-pulse">⚠️</span>
      [홍보·데모 전용] 포트폴리오 시연을 위해 과거 재난 상황의 스냅샷 데이터를 재생 중입니다. 실제 서버(라이브 서비스) 환경과 차이가 있을 수 있습니다.
    </div>
  );
}
