interface DegradedDataBannerProps {
  message?: string;
  onRetry?: () => void;
  compact?: boolean;
  isRetrying?: boolean;
}

const DEFAULT_MESSAGE =
  '실시간 병상 정보를 확인하지 못했습니다. 거리·전화·길찾기만 참고해 주세요.';

/** 서킷 브레이커·오프라인 폴백 시 시민·정책 공통 안내 */
export function DegradedDataBanner({
  message = DEFAULT_MESSAGE,
  onRetry,
  compact = false,
  isRetrying = false,
}: DegradedDataBannerProps) {
  return (
    <div
      role="status"
      className={`flex shrink-0 flex-wrap items-center justify-center gap-2 border-b border-amber-200/90 bg-amber-50/95 text-amber-950 ${
        compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'
      }`}
    >
      <span className="font-medium leading-snug">{message}</span>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          aria-busy={isRetrying}
          className={`shrink-0 rounded-full bg-amber-700 font-semibold text-white hover:bg-amber-800 ${
            compact ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm'
          } ${isRetrying ? 'cursor-not-allowed opacity-70' : ''}`}
        >
          {isRetrying ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border border-white/50 border-t-white" />
              다시 시도 중…
            </span>
          ) : (
            '다시 시도'
          )}
        </button>
      ) : null}
    </div>
  );
}
