import { HOSPITALS_LOADING_MESSAGE } from '../../shared/constants/loading-messages';
import { formatDistanceKm } from '../../shared/lib/distance';
import { hospitalRecommendationReason } from '../../shared/lib/hospital-recommendation';
import type { UserLocation } from '../../shared/hooks/useUserLocation';
import type { HospitalRecord } from '../../shared/types/hospital';

import { CitizenBedLabel } from './CitizenBedLabel';
import { CitizenHospitalTelLink } from './CitizenHospitalTelLink';
import { CitizenKakaoNavLink } from './CitizenKakaoNavLink';
import { useEtaController } from './lib/useEtaController';

interface HospitalSidebarListProps {
  sortedHospitals: (HospitalRecord & { distanceKm: number })[];
  selectedHospital: HospitalRecord | null;
  onHospitalSelect: (hospital: HospitalRecord | null) => void;
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
    <div className="flex flex-1 flex-col overflow-hidden lg:min-h-0">
      <ul className="flex-1 divide-y divide-slate-200 overflow-y-auto border-t border-slate-200 bg-white pb-6 lg:pb-3">
        {!loading && userLocation ? (
          <li className="bg-amber-50 px-4 py-2 text-xs leading-relaxed text-amber-900">
            길찾기는 일반 차량 경로입니다. 긴급 이송 병원과 경로는 119 및 의료기관의 수용 확인을 따르세요.
          </li>
        ) : null}
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
                  className={`flex w-full flex-col gap-2 px-4 py-4 text-left transition-colors ${
                    isActive
                      ? 'border-l-4 border-teal-800 bg-teal-50'
                      : 'border-l-4 border-transparent bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-500">{String(index + 1).padStart(2, '0')}</span>
                      {index === 0 ? (
                        <span className="border border-teal-200 bg-teal-50 px-1.5 py-0.5 text-[10px] font-bold text-teal-800">
                          병상 여유 우선 추천
                        </span>
                      ) : null}
                    </div>
                    <span
                      className="text-lg font-extrabold tabular-nums tracking-tight text-teal-800"
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
                      <div className="flex w-fit items-center gap-1.5 border-l-2 border-slate-400 pl-2 text-sm font-bold text-slate-700">
                        <span>차량 약 {mins}분</span>
                      </div>
                    );
                  })()}

                  <div className="flex justify-between gap-2">
                    <CitizenBedLabel hospital={hospital} />
                  </div>
                  {index === 0 ? (
                    <p className="rounded-md bg-teal-50 px-2 py-1.5 text-xs font-semibold leading-relaxed text-teal-900">
                      {hospitalRecommendationReason(hospital)} 실제 수용 여부는 출발 전 확인하세요.
                    </p>
                  ) : null}
                  <span
                    className="text-base font-bold leading-snug text-slate-900"
                  >
                    {hospital.name}
                  </span>
                  <div className="flex items-end justify-between gap-2">
                    <CitizenHospitalTelLink hospital={hospital} />
                    <CitizenKakaoNavLink
                      hospitalName={hospital.name}
                      lat={hospital.lat}
                      lng={hospital.lng}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => onHospitalSelect(hospital)}
                    className="mt-1 flex min-h-11 w-full items-center justify-center rounded-lg border border-teal-800 bg-teal-50 px-4 text-sm font-extrabold text-teal-900 transition-colors hover:bg-teal-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                    aria-label={`${hospital.name} 상세 정보 보기`}
                  >
                    상세 보기
                  </button>
                </div>
              </li>
            );
          })}
      </ul>
    </div>
  );
}
