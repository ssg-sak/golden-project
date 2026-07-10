import { LocateMeButton } from './LocateMeButton';

interface MapHudProps {
  onLocate: () => void;
  locating: boolean;
}

/** 지도 위에 남기는 최소 컨트롤 — 내 위치만 */
export function MapHud({ onLocate, locating }: MapHudProps) {
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-[800]">
      <div className="pointer-events-auto">
        <LocateMeButton onClick={onLocate} loading={locating} />
      </div>
    </div>
  );
}
