import type { GeoJsonFeature, GeoJsonGeometry } from '../../../shared/types/geojson';

export interface KakaoLatLng {
  lat: number;
  lng: number;
}

/** 카카오 Polygon path — 단일 링 또는 홀 포함 다중 링 */
export type KakaoPolygonPath = KakaoLatLng[] | KakaoLatLng[][];

export interface DistrictPolygonShape {
  id: string;
  admNm: string;
  path: KakaoPolygonPath;
}

/** GeoJSON [lng, lat] → 카카오 { lat, lng } */
export function ringToKakaoPath(ring: number[][]): KakaoLatLng[] {
  return ring.map(([lng, lat]) => ({ lat, lng }));
}

function geometryToShapes(admNm: string, geometry: GeoJsonGeometry, baseId: string): DistrictPolygonShape[] {
  if (geometry.type === 'Polygon') {
    const path: KakaoPolygonPath =
      geometry.coordinates.length === 1
        ? ringToKakaoPath(geometry.coordinates[0])
        : geometry.coordinates.map(ringToKakaoPath);

    return [{ id: baseId, admNm, path }];
  }

  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.map((polygonRings, index) => {
      const path: KakaoPolygonPath =
        polygonRings.length === 1
          ? ringToKakaoPath(polygonRings[0])
          : polygonRings.map(ringToKakaoPath);

      return { id: `${baseId}-${index}`, admNm, path };
    });
  }

  return [];
}

export function parseDistrictShapes(features: GeoJsonFeature[]): DistrictPolygonShape[] {
  return features.flatMap((feature, featureIndex) =>
    geometryToShapes(feature.properties.adm_nm, feature.geometry, `dong-${featureIndex}`),
  );
}
