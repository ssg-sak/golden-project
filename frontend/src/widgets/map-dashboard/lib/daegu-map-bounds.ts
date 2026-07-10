import { clampToDaeguBounds } from '../../../shared/lib/daegu-bounds';

export {
  clampToDaeguBounds,
  DAEGU_NE,
  DAEGU_SW,
  isInsideDaeguBounds,
} from '../../../shared/lib/daegu-bounds';

/** 지도 중심이 대구 경계 밖이면 안쪽으로 보정 */
export function enforceDaeguMapBounds(map: kakao.maps.Map): void {
  const center = map.getCenter();
  const clamped = clampToDaeguBounds(center.getLat(), center.getLng());

  if (clamped.lat !== center.getLat() || clamped.lng !== center.getLng()) {
    map.panTo(new kakao.maps.LatLng(clamped.lat, clamped.lng));
  }
}
