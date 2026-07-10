import { Link } from 'react-router-dom';

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 shrink-0 border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">
            대구 골든타임
          </p>
          <h1 className="truncate text-lg font-bold text-slate-900 sm:text-xl">
            가장 가까운 응급실 찾기
          </h1>
        </div>
        <Link
          to="/map"
          className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        >
          지도 보기
        </Link>
      </div>

      <div className="border-t border-rose-100 bg-rose-50 px-4 py-2 text-center text-xs font-medium text-rose-900 sm:text-sm">
        응급·위급 상황이면 즉시 <span className="font-bold">119</span> 또는{' '}
        <span className="font-bold">1339</span>를 이용해 주세요
      </div>
    </header>
  );
}
