/**
 * 모바일 내부 스크롤 공통 클래스.
 * - 갤럭시(Chrome): min-h-0 + overflow-y-auto 가 핵심
 * - 아이폰(Safari): -webkit-overflow-scrolling + touch-pan-y 가 추가로 필요
 * body/html 전체를 잠글 때는 이 클래스가 붙은 컨테이너만 스크롤되어야 한다.
 */
export const MOBILE_SCROLL_Y_CLASS =
  'min-h-0 overflow-y-auto overscroll-y-contain touch-pan-y [-webkit-overflow-scrolling:touch]';

export function isAppleTouchDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/iP(hone|ad|od)/i.test(ua)) return true;
  // iPadOS 13+ 는 Mac처럼 보이지만 터치 포인트가 있다.
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}
