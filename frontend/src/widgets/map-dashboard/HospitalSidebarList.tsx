import { HOSPITALS_LOADING_MESSAGE } from '../../shared/constants/loading-messages';
import { formatDistanceKm } from '../../shared/lib/distance';
import type { UserLocation } from '../../shared/hooks/useUserLocation';
import type { HospitalRecord } from '../../shared/types/hospital';

import { CitizenBedLabel } from './CitizenBedLabel';
import { CitizenHospitalTelLink } from './CitizenHospitalTelLink';
import { CitizenKakaoNavLink } from './CitizenKakaoNavLink';
import { useEtaController } from './lib/useEtaController';

interface HospitalSidebarListProps {
  sortedHospitals: (HospitalRecord & { distanceKm: number })[];
  selectedHospital: HospitalRecord | null;
  onHospitalSelect: (hospital: HospitalRecord) => void;
  loading?: boolean;
  userLocation: UserLocation | null;
  isLocating: boolean;
  onRetryLocation?: () => void;
  showAvailableOnly: boolean;
  onShowAvailableOnlyChange: (value: boolean) => void;
  onCareTargetChange: (value: 'all' | 'adult' | 'pediatric') => void;
}

export function HospitalSidebarList({
  sortedHospitals,
  selectedHospital,
  onHospitalSelect,
  loading = false,
  userLocation,
  isLocating,
  onRetryLocation,
  showAvailableOnly,
  onShowAvailableOnlyChange,
  onCareTargetChange,
}: HospitalSidebarListProps) {
  const etas = useEtaController((state) => state.etas);

  return (
    <div className="flex flex-col lg:min-h-0 lg:flex-1">
      <ul className="space-y-1.5 px-2 py-2 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pb-3">
        {loading ? (
          <li className="px-2 py-8 text-center text-base leading-relaxed text-slate-500">
            {HOSPITALS_LOADING_MESSAGE}
          </li>
        ) : null}
        {!loading && isLocating ? (
          <li className="px-2 py-8 text-center text-base text-slate-500">
            시민님의 현재 위치를 파악하고 있습니다 📍
          </li>
        ) : null}
        {!loading && !isLocating && !userLocation ? (
          <li className="px-2 py-8 text-center">
            <p className="text-base text-slate-500">위치를 확인할 수 없습니다.</p>
            {onRetryLocation ? (
              <button
                type="button"
                onClick={onRetryLocation}
                className="mt-3 rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                위치 다시 시도
              </button>
            ) : null}
          </li>
        ) : null}
        {!loading &&
          !isLocating &&
          userLocation &&
          sortedHospitals.length === 0 ? (
            <li className="px-2 py-8 text-center">
              <p className="text-base text-slate-500">
                {showAvailableOnly
                  ? '진료 가능한 병원이 없습니다. 보기 설정을 끄고 다시 확인해 주세요.'
                  : '선택한 진료 대상 조건에 맞는 병원이 없습니다.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  onShowAvailableOnlyChange(false);
                  onCareTargetChange('all');
                }}
                className="mt-3 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                조건 초기화 후 전체 병원 보기
              </button>
            </li>
          ) : null}
        {!loading &&
          !isLocating &&
          userLocation &&
          sortedHospitals.map((hospital, index) => {
            const isActive = selectedHospital?.name === hospital.name;

            return (
              <li key={hospital.name}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onHospitalSelect(hospital)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onHospitalSelect(hospital);
                    }
                  }}
                  className={`flex w-full cursor-pointer flex-col gap-2.5 rounded-xl px-3 py-3 text-left transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400'
                      : 'bg-white ring-1 ring-slate-100 hover:bg-slate-50 hover:ring-emerald-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-xs font-bold ${
                        isActive ? 'text-indigo-200' : 'text-slate-400'
                      }`}
                    >
                      {index + 1}위
                    </span>
                    <span
                      className={`text-lg font-extrabold tabular-nums tracking-tight ${
                        isActive ? 'text-white' : 'text-indigo-600'
                      }`}
                    >
                      {formatDistanceKm(hospital.distanceKm)}
                    </span>
                  </div>
                  
                  {/* ETA 뱃지 표출 */}
                  {(() => {
                    const etaSeconds = etas[hospital.name]?.eta_seconds;
                    if (etaSeconds == null) return null;
                    const mins = Math.ceil(etaSeconds / 60);
                    return (
                      <div className="flex w-fit items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1 text-sm font-bold text-indigo-700 ring-1 ring-indigo-200">
                        <span>🚗</span>
                        <span>{mins}분 소요</span>
                      </div>
                    );
                  })()}

                  <div className="flex justify-between gap-2">
                    <CitizenBedLabel hospital={hospital} inverted={isActive} />
                  </div>
                  <span
                    className={`text-base font-bold leading-snug ${
                      isActive ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    {hospital.name}
                  </span>
                  <div className="flex items-end justify-between gap-2">
                    <CitizenHospitalTelLink hospital={hospital} inverted={isActive} />
                    <CitizenKakaoNavLink
                      hospitalName={hospital.name}
                      lat={hospital.lat}
                      lng={hospital.lng}
                      inverted={isActive}
                    />
                  </div>
                </div>
              </li>
            );
          })}
      </ul>
    </div>
  );
}
