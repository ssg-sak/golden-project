/** useKakaoLoader로 로드되는 카카오맵 SDK (최소 타입) */
declare namespace kakao.maps {
  class LatLng {
    constructor(lat: number, lng: number);
    getLat(): number;
    getLng(): number;
  }

  class LatLngBounds {
    extend(latlng: LatLng): void;
  }

  interface Map {
    panTo(latlng: LatLng): void;
    setCenter(latlng: LatLng): void;
    setLevel(level: number, options?: { animate?: boolean }): void;
    getCenter(): LatLng;
    getLevel(): number;
    relayout(): void;
    setDraggable(draggable: boolean): void;
    setZoomable(zoomable: boolean): void;
    setMinLevel(minLevel: number): void;
    setMaxLevel(maxLevel: number): void;
  }

  enum ControlPosition {
    RIGHT = 3,
  }

  interface MouseEvent {
    latLng: LatLng;
    stop(): void;
  }
}

declare const kakao: {
  maps: typeof kakao.maps & {
    Map: new (container: HTMLElement, options: Record<string, unknown>) => kakao.maps.Map;
    LatLng: typeof kakao.maps.LatLng;
    LatLngBounds: typeof kakao.maps.LatLngBounds;
  };
};

interface Window {
  kakao: typeof kakao;
}
