import type { HospitalRecord, HospitalTier } from '../../../shared/types/hospital';
import { isEmergencyRelevantHospital, isMoonlightHospital } from '../../../shared/types/hospital';
import {
  HOSPITAL_TIER_VISUAL,
  hospitalTierLabel,
} from '../../../shared/lib/hospital-tier-visual';

export type HospitalFilter = 'all' | 'tier1' | 'tier2' | 'tier3';

export interface HospitalFilterOption {
  id: HospitalFilter;
  label: string;
  tier?: HospitalTier;
}

export const HOSPITAL_FILTER_OPTIONS: HospitalFilterOption[] = [
  { id: 'all', label: '전체' },
  { id: 'tier1', label: hospitalTierLabel(1), tier: 1 },
  { id: 'tier2', label: hospitalTierLabel(2), tier: 2 },
  { id: 'tier3', label: hospitalTierLabel(3), tier: 3 },
];

const FILTER_TIER: Record<Exclude<HospitalFilter, 'all'>, HospitalRecord['tier']> = {
  tier1: 1,
  tier2: 2,
  tier3: 3,
};

export function filterActiveStyle(filter: HospitalFilter): string {
  if (filter === 'all') {
    return 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-300/40 ring-indigo-300';
  }
  return HOSPITAL_TIER_VISUAL[FILTER_TIER[filter]].filterActiveClass;
}

export function filterHospitals(
  hospitals: HospitalRecord[],
  activeFilter: HospitalFilter,
): HospitalRecord[] {
  const emergencyHospitals = hospitals.filter(isEmergencyRelevantHospital);
  if (activeFilter === 'all') return emergencyHospitals;
  const tier = FILTER_TIER[activeFilter];
  return emergencyHospitals.filter((hospital) => hospital.tier === tier);
}

export function hospitalMatchesFilter(
  hospital: HospitalRecord,
  activeFilter: HospitalFilter,
): boolean {
  if (!isEmergencyRelevantHospital(hospital)) return false;
  if (activeFilter === 'all') return true;
  return hospital.tier === FILTER_TIER[activeFilter];
}

export function filterByCareTarget(
  hospitals: HospitalRecord[],
  careTarget: 'all' | 'adult' | 'pediatric' | 'senior',
): HospitalRecord[] {
  const emergencyHospitals = hospitals.filter(isEmergencyRelevantHospital);
  if (careTarget === 'all') return emergencyHospitals;
  
  return emergencyHospitals.filter((h) => {
    if (careTarget === 'adult') {
      // 일반 성인: 달빛어린이(Tier 3) 제외
      return !isMoonlightHospital(h);
    }
    if (careTarget === 'pediatric') {
      // 소아 응급: 야간·휴일 소아진료 거점만 표시
      return isMoonlightHospital(h);
    }
    if (careTarget === 'senior') {
      // 어르신: 중증 골든타임 대응 대형거점(Tier 1) 및 공공/노인 거점(Tier 2 중 일부)으로 선별
      if (h.tier === 1) return true;
      if (h.tier === 2) {
        const name = h.name.replace(/\s+/g, '');
        return /보훈|적십자|의료원|가톨릭|기독|파티마|더블유|굿모닝|나사렛|보건|보강/.test(name);
      }
      return false;
    }
    return true;
  });
}
