import type { GeoJsonFeatureCollection } from '../../shared/types/geojson';

import daeguDongGeoUrl from '../../assets/daegu-dong.geojson?url';

export async function fetchDaeguDongGeo(): Promise<GeoJsonFeatureCollection> {
  const response = await fetch(daeguDongGeoUrl);

  if (!response.ok) {
    throw new Error(`GeoJSON 로드 실패: ${response.status}`);
  }

  return response.json();
}
