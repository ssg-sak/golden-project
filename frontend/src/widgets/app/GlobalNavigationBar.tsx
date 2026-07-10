import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { useAppModeStore, type ViewMode } from '../../shared/store/appModeStore';

const NAV_ITEMS: { id: ViewMode; label: string; shortLabel: string }[] = [
  { id: 'citizen', label: '시민 구조망 (응급)', shortLabel: '시민 구조망' },
  { id: 'admin', label: '정책·분석 모니터링', shortLabel: '정책·분석' },
];

function formatHeaderDate(date: Date): string {
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
}

function PortalLogoMark() {
  return (
    <svg
      className="h-9 w-9 shrink-0"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-hidden
    >
      <rect width="40" height="40" rx="10" className="fill-blue-600" />
      <circle cx="20" cy="20" r="11" stroke="white" strokeWidth="1.5" opacity="0.35" />
      <path
        d="M20 9a11 11 0 0 1 9.52 5.5"
        stroke="#fbbf24"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <line x1="20" y1="20" x2="20" y2="13" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="20" y1="20" x2="25" y2="20" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="20" cy="20" r="1.5" fill="white" />
    </svg>
  );
}

export function GlobalNavigationBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const viewMode = useAppModeStore((state) => state.viewMode);
  const setViewMode = useAppModeStore((state) => state.setViewMode);
  const [now, setNow] = useState(() => new Date());

  const isListPage = location.pathname === '/list';
  const isAboutPage = location.pathname === '/about';
  const showBackButton = isListPage || isAboutPage;
  const activeMode: ViewMode = showBackButton ? 'citizen' : viewMode;

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  function handleNavClick(mode: ViewMode) {
    setViewMode(mode);
    if (location.pathname !== '/') {
      navigate('/');
    }
  }

  return (
    <header className="sticky top-0 z-50 shrink-0 border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto flex h-14 max-w-[1800px] items-center justify-between gap-4 px-4 md:px-8">
        <Link
          to="/"
          onClick={() => setViewMode('citizen')}
          className="flex min-w-0 items-center gap-2.5 rounded-lg transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <PortalLogoMark />
          <div className="min-w-0">
            <p className="truncate text-[10px] font-bold uppercase tracking-widest text-blue-600">
              응급의료 거버넌스 플랫폼
            </p>
            <p className="truncate text-base font-extrabold leading-tight text-slate-900 md:text-lg">
              대구 골든타임
            </p>
          </div>
        </Link>

        <div className="flex shrink-0 items-center gap-4">
          <time
            className="hidden text-right text-xs text-slate-500 sm:block"
            dateTime={now.toISOString()}
          >
            {formatHeaderDate(now)}
          </time>
        </div>
      </div>

      <nav
        className="border-t border-slate-100 bg-white"
        aria-label="서비스 메뉴"
      >
        <div className="mx-auto flex max-w-[1800px] items-stretch gap-1 px-2 sm:gap-2 sm:px-6 md:px-8">
          {NAV_ITEMS.map((item) => {
            const isActive = activeMode === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => handleNavClick(item.id)}
                className={`relative px-3 py-3 text-sm font-semibold transition-colors duration-200 sm:px-5 sm:text-[15px] ${
                  isActive
                    ? 'text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className="hidden sm:inline">{item.label}</span>
                <span className="sm:hidden">{item.shortLabel}</span>
                <span
                  className={`absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-blue-600 transition-all duration-200 sm:inset-x-4 ${
                    isActive ? 'opacity-100' : 'opacity-0'
                  }`}
                  aria-hidden
                />
              </button>
            );
          })}

          <div className="ml-auto flex items-center gap-2">
            {showBackButton ? (
              <Link
                to="/"
                onClick={() => setViewMode('citizen')}
                className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-xs font-semibold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-50 sm:text-sm"
              >
                <span aria-hidden>←</span>
                <span className="hidden sm:inline">메인으로 돌아가기</span>
                <span className="sm:hidden">돌아가기</span>
              </Link>
            ) : (
              <>
                <Link
                  to="/about"
                  className="rounded-md px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-50 sm:text-sm"
                >
                  공식 소개
                </Link>
                <Link
                  to="/list"
                  onClick={() => setViewMode('citizen')}
                  className="rounded-md px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 sm:text-sm"
                >
                  가까운 응급실
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

    </header>
  );
}
