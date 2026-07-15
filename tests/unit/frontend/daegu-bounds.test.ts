import { describe, expect, it } from 'vitest';
import { clampToDaeguBounds, isInsideDaeguBounds } from '../../../frontend/src/shared/lib/daegu-bounds';

describe('daegu bounds', () => {
  it('군위군 권역을 대구광역시 지도 이동 범위 안에 포함한다', () => {
    const gunwiCountyOffice = { lat: 36.2429, lng: 128.5728 };

    expect(isInsideDaeguBounds(gunwiCountyOffice.lat, gunwiCountyOffice.lng)).toBe(true);
    expect(clampToDaeguBounds(gunwiCountyOffice.lat, gunwiCountyOffice.lng)).toEqual(gunwiCountyOffice);
  });
});
