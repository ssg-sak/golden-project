export interface DongGeoProperties {
  adm_nm: string;
  temp?: string;
  sggnm?: string;
}

export interface GeoJsonFeature {
  type: 'Feature';
  properties: DongGeoProperties;
  geometry: GeoJsonGeometry;
}

export interface GeoJsonFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
}

export type GeoJsonGeometry =
  | { type: 'Polygon'; coordinates: number[][][] }
  | { type: 'MultiPolygon'; coordinates: number[][][][] };

export type LngLat = [number, number];
