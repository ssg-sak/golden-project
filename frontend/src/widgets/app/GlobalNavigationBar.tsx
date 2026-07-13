import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { useAppModeStore, type ViewMode } from '../../shared/store/appModeStore';

const NAV_ITEMS: { id: ViewMode; label: string; shortLabel: string }[] = [
  { id: 'citizen', label: '시민 구조망', shortLabel: '시민' },
  { id: 'admin', label: '정책·분석 모니터링', shortLabel: '정책' },
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
      <rect width="40" height="40" rx="10" className="fill-teal-800" />
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

  const isAboutPage = location.pathname === '/about';
  const showBackButton = isAboutPage;
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
    <header className="shrink-0 border-b border-slate-200/50 bg-white/85 shadow-sm backdrop-blur-md lg:border-slate-200 lg:bg-white">
      <div className="mx-auto flex h-14 max-w-[1800px] items-center justify-between gap-4 px-4 md:px-8">
        <Link
          to="/"
          onClick={() => setViewMode('citizen')}
          className="flex min-w-0 items-center gap-2.5 rounded-lg transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
        >
          <PortalLogoMark />
          <div className="min-w-0">
            <p className="truncate text-[10px] font-bold uppercase tracking-widest text-teal-700">
              응급의료 거버넌스 플랫폼
            </p>
            <p className="truncate text-base font-extrabold leading-tight text-slate-900 md:text-lg">
              대구 골든타임
            </p>
          </div>
        </Link>

        <time
          className="hidden text-right text-xs text-slate-500 sm:block"
          dateTime={now.toISOString()}
        >
          {formatHeaderDate(now)}
        </time>
      </div>

      <nav
        className="border-t border-slate-100/50 bg-white/85 backdrop-blur-md lg:border-slate-100 lg:bg-white"
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
                    ? 'text-teal-800'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className="hidden sm:inline">{item.label}</span>
                <span className="sm:hidden">{item.shortLabel}</span>
                <span
                  className={`absolute inset-x-2 bottom-0 h-0.5 bg-teal-700 transition-all duration-200 sm:inset-x-4 ${
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
                className="inline-flex items-center gap-1 border border-teal-200 px-3 py-2 text-xs font-semibold text-teal-800 transition hover:bg-teal-50 sm:text-sm"
              >
                메인으로
              </Link>
            ) : (
              <>
                <Link
                  to="/about"
                  className="px-3 py-2 text-xs font-semibold text-teal-800 transition hover:bg-teal-50 sm:text-sm"
                >
                  공식 소개
                </Link>
                <Link
                  to="/"
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
