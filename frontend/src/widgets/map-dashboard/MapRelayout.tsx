import { useEffect, type RefObject } from 'react';
import { useMap } from 'react-kakao-maps-sdk';

import { useAppModeStore } from '../../shared/store/appModeStore';

interface MapRelayoutProps {
  containerRef: RefObject<HTMLElement | null>;
}

/** 컨테이너 크기 변경 시 카카오맵 타일·컨트롤 재계산 */
export function MapRelayout({ containerRef }: MapRelayoutProps) {
  const map = useMap();
  const viewMode = useAppModeStore((state) => state.viewMode);

  useEffect(() => {
    if (!map) return;
    
    // 뷰 모드 전환 시 카카오맵 깨짐 및 좌표 틀어짐 방지
    const currentCenter = map.getCenter();
    map.relayout();
    map.setCenter(currentCenter);
  }, [map, viewMode]);

  useEffect(() => {
    let frame = 0;
    let timeout = 0;

    const relayout = () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
      frame = window.requestAnimationFrame(() => {
        timeout = window.setTimeout(() => map.relayout(), 80);
      });
    };

    relayout();
    window.addEventListener('resize', relayout);

    const container = containerRef?.current;
    const observer =
      container && typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(relayout)
        : null;
    if (container && observer) observer.observe(container);

    return () => {
      window.removeEventListener('resize', relayout);
      observer?.disconnect();
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [map, containerRef]);

  return null;
}
