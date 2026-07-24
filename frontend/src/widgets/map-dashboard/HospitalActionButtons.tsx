interface HospitalActionButtonsProps {
  hospitalName: string;
  lat?: number;
  lng?: number;
}

function kakaoDirectionsUrl(hospitalName: string, lat?: number, lng?: number): string {
  if (lat != null && lng != null) {
    return `https://map.kakao.com/link/to/${encodeURIComponent(hospitalName)},${lat},${lng}`;
  }
  return `https://map.kakao.com/link/search/${encodeURIComponent(`${hospitalName} 대구`)}`;
}

const actionBtnClass =
  'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-sm text-sm font-medium shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';

export function HospitalActionButtons({
  hospitalName,
  lat,
  lng,
}: HospitalActionButtonsProps) {
  return (
    <div className="flex shrink-0 gap-2">
      <button
        type="button"
        className={`${actionBtnClass} bg-emerald-700 text-white hover:bg-emerald-800 focus-visible:ring-emerald-400`}
        aria-label={`${hospitalName} 전화 걸기`}
        title="전화 걸기 (준비 중)"
        onClick={() => alert('전화 연결 기능 준비 중')}
      >
        <span aria-hidden>📞</span>
      </button>
      <a
        href={kakaoDirectionsUrl(hospitalName, lat, lng)}
        target="_blank"
        rel="noopener noreferrer"
        className={`${actionBtnClass} bg-blue-700 text-white hover:bg-blue-800 focus-visible:ring-indigo-400`}
        aria-label={`${hospitalName} 카카오맵 길찾기`}
        title="카카오맵 길찾기"
      >
        <span aria-hidden>🗺️</span>
      </a>
    </div>
  );
}
