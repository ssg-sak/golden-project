import { HOSPITAL_ER_TEL_BY_NAME } from '../data/hospital-er-tel';
import type { HospitalRecord } from '../types/hospital';

/** tel: 링크용 숫자만 (하이픈·공백 제거) */
export function toTelHref(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, '');
  return digits ? `tel:${digits}` : '';
}

/** 화면 표시용 — 이미 하이픈 형식이면 그대로 */
export function formatHospitalTelDisplay(phone: string): string {
  return phone.trim();
}

export function resolveHospitalTel(hospital: Pick<HospitalRecord, 'name' | 'tel'>): string | null {
  const fromRecord = hospital.tel?.trim();
  if (fromRecord) return fromRecord;

  const fromLookup = HOSPITAL_ER_TEL_BY_NAME[hospital.name];
  return fromLookup ?? null;
}
