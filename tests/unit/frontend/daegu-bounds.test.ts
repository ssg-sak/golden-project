import { describe, expect, it } from 'vitest';
import {
  clampToDaeguBounds,
  DAEGU_NE,
  DAEGU_SW,
  isInsideDaeguBounds,
} from '../../../frontend/src/shared/lib/daegu-bounds';

describe('daegu bounds', () => {
  it.each([
    { name: '달성군 구지면', lat: 35.657148, lng: 128.402549 },
    { name: '군위군 소보면', lat: 36.262623, lng: 128.47715 },
    { name: '군위군청', lat: 36.2429, lng: 128.5728 },
  ])('$name 좌표를 대구광역시 지도 이동 범위 안에 포함한다', ({ lat, lng }) => {
    const location = { lat, lng };

    expect(isInsideDaeguBounds(lat, lng)).toBe(true);
    expect(clampToDaeguBounds(lat, lng)).toEqual(location);
  });

  it('명백한 대구 외부 좌표는 거부하고 지도 이동 좌표만 안전 경계로 보정한다', () => {
    const busanCityHall = { lat: 35.1796, lng: 129.0756 };

    expect(isInsideDaeguBounds(busanCityHall.lat, busanCityHall.lng)).toBe(false);
    expect(clampToDaeguBounds(busanCityHall.lat, busanCityHall.lng)).toEqual({
      lat: DAEGU_SW.lat,
      lng: DAEGU_NE.lng,
    });
  });
});
