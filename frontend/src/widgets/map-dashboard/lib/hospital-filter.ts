import type { HospitalRecord, HospitalTier } from '../../../shared/types/hospital';
import { isEmergencyRelevantHospital, isMoonlightHospital } from '../../../shared/types/hospital';
import {
  hospitalMatchesSevereCondition,
  type SevereConditionId,
} from '../../../shared/lib/severe-condition';
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
    return 'bg-slate-800 text-white shadow-sm ring-slate-500';
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
  severeCondition: SevereConditionId = 'all',
): HospitalRecord[] {
  const emergencyHospitals = hospitals.filter(isEmergencyRelevantHospital);
  const conditionFiltered = emergencyHospitals.filter((hospital) =>
    hospitalMatchesSevereCondition(hospital, severeCondition),
  );
  if (careTarget === 'all') return conditionFiltered;

  return conditionFiltered.filter((hospital) => {
    if (careTarget === 'adult') {
      return !isMoonlightHospital(hospital);
    }
    if (careTarget === 'pediatric') {
      return isMoonlightHospital(hospital);
    }
    if (careTarget === 'senior') {
      if (hospital.tier === 1) return true;
      if (hospital.tier === 2) {
        const name = hospital.name.replace(/\s+/g, '');
        return /보훈|요양|재활|기독|파티마|더블유|구병원|나사렛|보건|보강/.test(name);
      }
      return false;
    }
    return true;
  });
}
