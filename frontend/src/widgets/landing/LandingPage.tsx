import { useCallback } from 'react';
import { Link } from 'react-router-dom';

import { HOSPITALS_LOADING_MESSAGE } from '../../shared/constants/loading-messages';
import { useSortedHospitalsByDistance } from '../../shared/hooks/useSortedHospitalsByDistance';
import { useUserLocation } from '../../shared/hooks/useUserLocation';
import { useAppModeStore } from '../../shared/store/appModeStore';
import { useHospitalStore } from '../../shared/store/hospitalStore';
import { GlobalNavigationBar } from '../app/GlobalNavigationBar';
import { DisclaimerBanner } from '../shared/DisclaimerBanner';
import { GovernanceFooter } from '../shared/GovernanceFooter';
import { DegradedDataBanner } from '../shared/DegradedDataBanner';
import { DemoWarningBanner } from '../shared/DemoWarningBanner';

import { HospitalListItem } from './HospitalListItem';
import { LocationNotice } from './LocationNotice';

function HospitalsLoadingState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
      <span className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
      <p className="max-w-sm text-base font-semibold leading-relaxed text-slate-800">
        {HOSPITALS_LOADING_MESSAGE}
      </p>
    </div>
  );
}

export function LandingPage() {
  const setViewMode = useAppModeStore((state) => state.setViewMode);
  const hospitals = useHospitalStore((state) => state.hospitals);
  const isLoading = useHospitalStore((state) => state.isLoading);
  const error = useHospitalStore((state) => state.error);
  const isDegraded = useHospitalStore((state) => state.isDegraded);
  const fetchHospitals = useHospitalStore((state) => state.fetchHospitals);

  const { location, isLocating, errorReason, retry } = useUserLocation();

  const handleRetry = useCallback(() => {
    void fetchHospitals();
  }, [fetchHospitals]);

  const sortedHospitals = useSortedHospitalsByDistance(
    hospitals,
    location?.lat,
    location?.lng,
    { sortMode: 'recommendation' },
  );

  const showList = !isLoading && !error && location !== null;

  return (
    <div className="flex min-h-dvh flex-col bg-slate-100">
      <DemoWarningBanner />
      <GlobalNavigationBar />
      <DisclaimerBanner />

      <div className="shrink-0 border-b border-rose-100 bg-rose-50 px-4 py-2 text-center text-xs font-medium text-rose-900 sm:text-sm">
        응급·위급 상황이면 즉시 <span className="font-bold">119</span> 또는{' '}
        <span className="font-bold">1339</span>를 이용해 주세요
      </div>

      {isDegraded ? <DegradedDataBanner onRetry={handleRetry} /> : null}

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-4 sm:px-6 sm:py-6">
        <div className="mb-4 flex flex-col gap-3">
          <Link
            to="/"
            onClick={() => setViewMode('citizen')}
            className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <span aria-hidden className="text-base leading-none">
              ←
            </span>
            시민 구조망으로 돌아가기
          </Link>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">응급실 병상 여유 추천</h1>
            <p className="mt-1 text-sm text-slate-600">병상 상태를 먼저 보고, 같은 상태에서는 가까운 병원을 우선 안내합니다.</p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
        <LocationNotice
          isLocating={isLocating}
          source={location?.source ?? null}
          errorReason={errorReason}
          onRetry={retry}
        />

        {isLoading ? <HospitalsLoadingState /> : null}

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-8 text-center">
            <p className="text-base font-semibold text-rose-900">지금은 병원 정보를 불러올 수 없습니다</p>
            <p className="mt-2 text-sm leading-relaxed text-rose-700">
              잠시 후 다시 시도해 주세요.
              <br />
              응급·위급 상황이면 <span className="font-bold">119</span> 또는{' '}
              <span className="font-bold">1339</span>를 이용해 주세요.
            </p>
            <button
              type="button"
              onClick={handleRetry}
              className="mt-4 rounded-full bg-rose-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700"
            >
              다시 시도
            </button>
          </div>
        ) : null}

        {showList ? (
          <section aria-label="응급실 병상 여유 추천 목록" className="space-y-3">
            <p className="px-1 text-sm text-slate-600">
              {location?.source === 'device'
                ? '일반응급실 병상 여유를 우선하고 같은 상태에서는 현재 위치와 가까운 순으로 정렬했습니다.'
                : `${sortedHospitals.length}곳을 병상 상태와 거리 기준으로 보여드립니다.`}
            </p>
            <p className="px-1 text-xs leading-relaxed text-slate-500">
              표시 상태는 가용 병상 비율을 이용한 추정이며 실제 대기시간이나 수용 확정을 뜻하지 않습니다.
            </p>
            <ul className="space-y-3">
              {sortedHospitals.map((hospital, index) => (
                <li key={`${hospital.name}-${hospital.lat}`}>
                  <HospitalListItem hospital={hospital} rank={index + 1} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        </div>
      </main>

      <GovernanceFooter />
    </div>
  );
}
