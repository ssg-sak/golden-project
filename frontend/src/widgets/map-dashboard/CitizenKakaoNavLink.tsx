import { kakaoDirectionsUrl } from '../../shared/lib/kakao-navigation';

interface CitizenKakaoNavLinkProps {
  hospitalName: string;
  lat: number;
  lng: number;
  inverted?: boolean;
}

/** 시민 사이드바용 카카오맵 길찾기 딥링크 (새 탭) */
export function CitizenKakaoNavLink({
  hospitalName,
  lat,
  lng,
  inverted = false,
}: CitizenKakaoNavLinkProps) {
  return (
    <a
      href={kakaoDirectionsUrl(hospitalName, lat, lng)}
      target="_blank"
      rel="noopener noreferrer"
      title="일반 차량용 카카오맵 경로입니다. 긴급차량 경로는 119 관제 지시를 따르세요."
      aria-label={`${hospitalName} 일반 차량 길찾기 열기`}
      onClick={(event) => event.stopPropagation()}
      className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${
        inverted
          ? 'bg-white/20 text-white hover:bg-white/30 focus-visible:ring-white'
          : 'bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:ring-indigo-400'
      }`}
    >
      <span aria-hidden>🚑</span>
      길찾기
    </a>
  );
}
