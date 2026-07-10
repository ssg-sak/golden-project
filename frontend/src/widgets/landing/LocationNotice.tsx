import { DAEGU_CITY_HALL } from '../../shared/constants/daegu';
import type { LocationErrorReason, LocationSource } from '../../shared/hooks/useUserLocation';

interface LocationNoticeProps {
  isLocating: boolean;
  source: LocationSource | null;
  errorReason: LocationErrorReason | null;
  onRetry?: () => void;
  /** GPS 로딩 중 표시 문구 (시민 모드 등) */
  locatingMessage?: string;
  /** 사이드바 등 좁은 영역 — 패딩·글자 축소 */
  compact?: boolean;
}

export function LocationNotice({
  isLocating,
  source,
  errorReason,
  onRetry,
  locatingMessage = '현재 위치를 확인하고 있습니다. 잠시만 기다려 주세요.',
  compact = false,
}: LocationNoticeProps) {
  const boxClass = compact
    ? 'rounded-lg border px-3 py-2 text-sm'
    : 'rounded-xl border px-4 py-3 text-base';

  if (isLocating) {
    return (
      <div
        role="status"
        className={`flex items-start gap-2.5 ${boxClass} border-sky-200 bg-sky-50 text-sky-900`}
      >
        <span
          className={`${compact ? 'mt-0.5 h-4 w-4' : 'mt-1 h-5 w-5'} inline-block shrink-0 animate-spin rounded-full border-2 border-sky-200 border-t-sky-600`}
        />
        <p className="leading-relaxed">{locatingMessage}</p>
      </div>
    );
  }

  if (source === 'fallback') {
    return (
      <div
        role="status"
        className={`${boxClass} leading-relaxed border-amber-200 bg-amber-50 text-amber-950`}
      >
        <p className="font-semibold">위치를 확인할 수 없습니다.</p>
        <p className="mt-1">
          {errorReason === 'denied'
            ? '위치 권한이 허용되지 않아 '
            : errorReason === 'timeout'
              ? '위치 확인에 시간이 걸려 '
              : errorReason === 'outside'
                ? '대구광역시 밖에서 접속해 '
                : '기기에서 위치를 찾지 못해 '}
          <span className="font-medium">{DAEGU_CITY_HALL.label}</span>을 기준으로 정보를
          보여드립니다.
        </p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 text-sm font-semibold text-amber-900 underline underline-offset-2 hover:text-amber-950"
          >
            위치 다시 확인하기
          </button>
        ) : null}
      </div>
    );
  }

  return null;
}
