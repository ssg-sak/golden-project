/** 행정동 1건 — mock_medical_data.json records 항목 */
export interface DistrictMedicalRecord {
  adm_nm: string;
  /** 행정동 폴리곤 중심 (GeoJSON 기반) */
  center_lat: number;
  center_lng: number;
  /** 권역·대형(중증) 응급 최근접 기관 */
  nearest_tier1_er: string;
  tier1_er_lat: number;
  tier1_er_lng: number;
  distance_tier1: number;
  /** 준종합(일반) 응급 최근접 기관 */
  nearest_tier2_er: string;
  tier2_er_lat: number;
  tier2_er_lng: number;
  distance_tier2: number;
  /** 달빛어린이병원(소아 응급) 최근접 기관 */
  nearest_pediatric_er: string;
  pediatric_er_lat: number;
  pediatric_er_lng: number;
  /** 달빛어린이병원(소아 응급)까지 직선거리 km */
  pediatric_er_distance_km: number;
  is_golden_time_missed: boolean;
  bed_shortage_index: number;
}

/** 10km 초과 시 소아응급 공백 경고 (기획서 기준) */
export const PEDIATRIC_ER_GAP_KM = 10;

export interface MockMedicalDataMeta {
  version: string;
  region: string;
  record_count: number;
  golden_time_minutes: number;
  fields: Record<string, string>;
}

export interface MockMedicalData {
  meta: MockMedicalDataMeta;
  records: DistrictMedicalRecord[];
}

/** GeoJSON adm_nm "대구광역시 수성구 범어1동" → "수성구 범어1동" */
export function toAdmNmKey(fullAdmNm: string): string {
  return fullAdmNm.replace(/^대구광역시\s+/, '').trim();
}

export function buildMedicalRecordMap(
  records: DistrictMedicalRecord[],
): Map<string, DistrictMedicalRecord> {
  return new Map(records.map((row) => [row.adm_nm, row]));
}
