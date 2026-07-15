import { kakaoDirectionsUrl } from '../../shared/lib/kakao-navigation';

interface KakaoNavButtonProps {
  hospitalName: string;
  lat: number;
  lng: number;
}

export function KakaoNavButton({ hospitalName, lat, lng }: KakaoNavButtonProps) {
  return (
    <a
      href={kakaoDirectionsUrl(hospitalName, lat, lng)}
      target="_blank"
      rel="noopener noreferrer"
      title="일반 차량용 카카오맵 경로입니다. 긴급차량 경로는 119 관제 지시를 따르세요."
      aria-label={`${hospitalName} 일반 차량 길찾기 열기`}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3.5 text-base font-bold text-white shadow-md transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
    >
      <svg
        className="h-5 w-5 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden
      >
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
        <circle cx="12" cy="9" r="2.5" />
      </svg>
      길찾기 (내비게이션 연결)
    </a>
  );
}
