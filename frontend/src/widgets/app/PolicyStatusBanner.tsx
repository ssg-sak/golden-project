interface PolicyStatusBannerProps {
  tone: 'danger' | 'warning' | 'info';
  message: string;
  actionLabel?: string;
  actionLoading?: boolean;
  onAction?: () => void;
}

export function PolicyStatusBanner({
  tone,
  message,
  actionLabel,
  actionLoading = false,
  onAction,
}: PolicyStatusBannerProps) {
  const toneClasses =
    tone === 'danger'
      ? 'border-rose-200/90 bg-rose-50/95 text-rose-900'
      : tone === 'warning'
        ? 'border-amber-200/90 bg-amber-50/95 text-amber-900'
        : 'border-blue-200/90 bg-blue-50/95 text-blue-900';

  return (
    <div
      className={`flex shrink-0 flex-wrap items-center justify-center gap-2 border-b px-4 py-1.5 text-center text-xs font-medium sm:px-6 ${toneClasses}`}
    >
      <span>{message}</span>
      {onAction && actionLabel ? (
        <button
          type="button"
          onClick={onAction}
          disabled={actionLoading}
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold text-white ${
            tone === 'danger'
              ? 'bg-rose-700 hover:bg-rose-800'
              : tone === 'warning'
                ? 'bg-amber-700 hover:bg-amber-800'
                : 'bg-[#2b63d9] hover:bg-[#2457c5]'
          } ${actionLoading ? 'cursor-not-allowed opacity-70' : ''}`}
        >
          {actionLoading ? `${actionLabel} 중` : actionLabel}
        </button>
      ) : null}
    </div>
  );
}
