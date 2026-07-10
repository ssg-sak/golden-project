import { Fragment } from 'react';
import { CustomOverlayMap } from 'react-kakao-maps-sdk';
import { useOptimalLocationsStore } from './lib/useOptimalLocationsStore';

export function OptimalLocationMarkers() {
  const showOptimalLocations = useOptimalLocationsStore((state) => state.showLocations);
  const optimalLocations = useOptimalLocationsStore((state) => state.locations);

  if (!showOptimalLocations) return null;

  return (
    <>
      {optimalLocations.map((loc) => (
        <Fragment key={loc.id}>
          <CustomOverlayMap
            position={{ lat: loc.lat, lng: loc.lng }}
            zIndex={10}
          >
            <div className="relative group cursor-pointer flex flex-col items-center">
              <div className="absolute bottom-full mb-2 hidden w-max flex-col items-center group-hover:flex">
                <div className="rounded bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
                  AI 분석 거점 {loc.id}
                  <div className="mt-0.5 text-purple-200">배후 수요: {loc.demand}곳</div>
                </div>
                <div className="h-2 w-2 -mt-1 rotate-45 bg-gray-900" />
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600/90 shadow-xl ring-4 ring-purple-300/50 backdrop-blur-sm transition-transform hover:scale-110">
                <span className="text-lg">⭐</span>
              </div>
              <div className="mt-1 rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-extrabold text-purple-900 shadow">
                거점 {loc.id}
              </div>
            </div>
          </CustomOverlayMap>
        </Fragment>
      ))}
    </>
  );
}
