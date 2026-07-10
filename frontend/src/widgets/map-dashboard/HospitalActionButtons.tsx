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
  'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-medium shadow-md transition hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';

export function HospitalActionButtons({
  hospitalName,
  lat,
  lng,
}: HospitalActionButtonsProps) {
  return (
    <div className="flex shrink-0 gap-2">
      <button
        type="button"
        className={`${actionBtnClass} bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-emerald-400/50 ring-2 ring-white/40 hover:shadow-lg hover:shadow-emerald-500/30 focus-visible:ring-emerald-400`}
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
        className={`${actionBtnClass} bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-indigo-300/40 hover:shadow-lg focus-visible:ring-indigo-400`}
        aria-label={`${hospitalName} 카카오맵 길찾기`}
        title="카카오맵 길찾기"
      >
        <span aria-hidden>🗺️</span>
      </a>
    </div>
  );
}
