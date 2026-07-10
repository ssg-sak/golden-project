import { CustomOverlayMap } from 'react-kakao-maps-sdk';

interface SelectedHospitalPinProps {
  lat: number;
  lng: number;
  label?: string;
}

/** 선택 병원의 실제 좌표(WGS84)를 지도에 정확히 표시 */
export function SelectedHospitalPin({ lat, lng, label }: SelectedHospitalPinProps) {
  return (
    <CustomOverlayMap position={{ lat, lng }} xAnchor={0.5} yAnchor={1} zIndex={12}>
      <div className="pointer-events-none flex flex-col items-center" aria-hidden>
        <div className="relative flex h-10 w-10 items-center justify-center">
          <span className="absolute inline-flex h-10 w-10 animate-ping rounded-full bg-blue-400 opacity-40" />
          <span className="relative h-4 w-4 rounded-full border-2 border-white bg-blue-600 shadow-lg ring-2 ring-blue-200" />
        </div>
        <span className="h-5 w-0.5 bg-blue-600" />
        {label ? (
          <span className="mt-1 max-w-[10rem] truncate rounded-md bg-slate-900/90 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
            {label}
          </span>
        ) : null}
      </div>
    </CustomOverlayMap>
  );
}
