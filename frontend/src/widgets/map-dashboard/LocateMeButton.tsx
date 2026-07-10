interface LocateMeButtonProps {
  onClick: () => void;
  loading?: boolean;
}

export function LocateMeButton({ onClick, loading }: LocateMeButtonProps) {
  return (
    <button
      type="button"
      className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/95 text-slate-700 shadow-md ring-1 ring-slate-200/90 backdrop-blur-sm transition hover:bg-white hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-1 disabled:cursor-wait disabled:opacity-70"
      onClick={onClick}
      disabled={loading}
      aria-label="내 위치 찾기"
      title="내 위치 찾기"
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
      ) : (
        <svg
          className="h-5 w-5 text-indigo-600"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}
