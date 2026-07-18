import type { HospitalRecord } from '../types/hospital';

export type SevereConditionId =
  | 'all'
  | 'myocardial_infarction'
  | 'stroke_bleeding'
  | 'major_trauma'
  | 'amputation'
  | 'emergency_endoscopy'
  | 'severe_burn'
  | 'pediatric_night_holiday';

export interface SevereConditionOption {
  id: SevereConditionId;
  label: string;
  shortLabel: string;
  description: string;
  tyCodes: string[];
}

export const SEVERE_CONDITION_OPTIONS: SevereConditionOption[] = [
  {
    id: 'all',
    label: '전체 응급기관',
    shortLabel: '전체',
    description: '특정 질환 수용 가능 여부로 좁히지 않습니다.',
    tyCodes: [],
  },
  {
    id: 'myocardial_infarction',
    label: '심근경색 수용 가능',
    shortLabel: '심근경색',
    description: '공식 중증질환 수용 가능 정보에서 심근경색 항목을 확인합니다.',
    tyCodes: ['ty1'],
  },
  {
    id: 'stroke_bleeding',
    label: '뇌출혈 수술 가능',
    shortLabel: '뇌출혈',
    description: '공식 중증질환 수용 가능 정보에서 뇌출혈 수술 항목을 확인합니다.',
    tyCodes: ['ty3'],
  },
  {
    id: 'major_trauma',
    label: '외상/복부응급',
    shortLabel: '외상/복부',
    description: '추락, 중증 외상, 복부 응급 상황에서 확인할 수 있는 외상 관련 항목입니다.',
    tyCodes: ['ty5', 'ty9'],
  },
  {
    id: 'amputation',
    label: '절단 접합 가능',
    shortLabel: '절단',
    description: '사지 접합 또는 절단 접합 가능 여부를 확인합니다.',
    tyCodes: ['ty21'],
  },
  {
    id: 'emergency_endoscopy',
    label: '응급내시경 가능',
    shortLabel: '내시경',
    description: '성인 위장관, 기관지 응급내시경 가능 여부를 확인합니다.',
    tyCodes: ['ty11', 'ty13'],
  },
  {
    id: 'severe_burn',
    label: '중증화상 진료',
    shortLabel: '화상',
    description: '중증화상 전문치료 가능 여부를 확인합니다.',
    tyCodes: ['ty19'],
  },
  {
    id: 'pediatric_night_holiday',
    label: '야간·휴일 소아진료',
    shortLabel: '소아야간',
    description: '일반 소아과가 아니라 달빛어린이병원 등 야간·휴일 소아진료 자원만 봅니다.',
    tyCodes: [],
  },
];

export function severeConditionOption(id: SevereConditionId): SevereConditionOption {
  return SEVERE_CONDITION_OPTIONS.find((option) => option.id === id) ?? SEVERE_CONDITION_OPTIONS[0];
}

export function severeConditionStatus(
  hospital: HospitalRecord,
  conditionId: SevereConditionId,
): 'available' | 'unavailable' | 'unknown' | 'not_applicable' {
  const option = severeConditionOption(conditionId);
  if (conditionId === 'all' || conditionId === 'pediatric_night_holiday') {
    return 'not_applicable';
  }

  const severeConditions = hospital.severe_conditions;
  if (!severeConditions) return 'unknown';

  const statuses = option.tyCodes.map((code) => severeConditions[code]?.status ?? 'unknown');
  if (statuses.some((status) => status === 'available')) return 'available';
  if (statuses.length > 0 && statuses.every((status) => status === 'unavailable')) return 'unavailable';
  return 'unknown';
}

export function hospitalMatchesSevereCondition(
  hospital: HospitalRecord,
  conditionId: SevereConditionId,
): boolean {
  if (conditionId === 'all') return true;
  if (conditionId === 'pediatric_night_holiday') {
    return hospital.is_moonlight === true || hospital.tier === 3;
  }
  return severeConditionStatus(hospital, conditionId) === 'available';
}

export function severeConditionSummary(hospital: HospitalRecord, conditionId: SevereConditionId): string {
  const status = severeConditionStatus(hospital, conditionId);
  if (status === 'available') return '공식 데이터에 가능으로 보고됨';
  if (status === 'unavailable') return '공식 데이터에 불가로 보고됨';
  if (status === 'unknown') return '공식 데이터 미제공';
  return severeConditionOption(conditionId).description;
}
