import type { HospitalRecord } from '../../../shared/types/hospital';

export interface InfrastructureMetric {
  label: string;
  value: number | null;
  detail: string;
}

const clampScore = (value: number) => Math.max(0, Math.min(100, value));

function doctorReference(hospital: HospitalRecord): number {
  if (hospital.tier === 1) return 400;
  if (hospital.tier === 2) return 100;
  return 30;
}

function specialBedScore(hospital: HospitalRecord): InfrastructureMetric {
  const entries = Object.values(hospital.special_beds ?? {});
  const known = entries.filter(
    (item) => typeof item.is_available === 'boolean' || typeof item.available === 'number',
  );
  if (known.length === 0) {
    return { label: '특수병상 대응', value: null, detail: '공식 원천 미제공' };
  }
  const available = known.filter((item) => item.is_available ?? ((item.available ?? 0) > 0)).length;
  return {
    label: '특수병상 대응',
    value: clampScore((available / known.length) * 100),
    detail: `${available}/${known.length}개 유형 가용`,
  };
}

export function calculateInfrastructureMetrics(hospital: HospitalRecord): InfrastructureMetric[] {
  const emergencyEquipment = Object.values(hospital.emergency_equipment_status ?? {});
  const ownershipEquipment = Object.values(hospital.equipment_status ?? {});
  const equipment = emergencyEquipment.length ? emergencyEquipment : ownershipEquipment;
  const doctorLimit = doctorReference(hospital);
  const doctorScore = typeof hospital.doctors_count === 'number'
    ? clampScore((hospital.doctors_count / doctorLimit) * 100)
    : null;
  const equipmentScore = equipment.length
    ? clampScore((equipment.filter(Boolean).length / equipment.length) * 100)
    : null;
  const capacityScore =
    typeof hospital.hvec === 'number' && typeof hospital.total_hvec === 'number' && hospital.total_hvec > 0
      ? clampScore((hospital.hvec / hospital.total_hvec) * 100)
      : null;

  return [
    {
      label: '의료인력 기반',
      value: doctorScore,
      detail: typeof hospital.doctors_count === 'number'
        ? `등록 의사 ${hospital.doctors_count}명 · 역할 기준 ${doctorLimit}명`
        : '심평원 원천 미제공',
    },
    {
      label: '핵심장비 확인',
      value: equipmentScore,
      detail: equipment.length
        ? emergencyEquipment.length
          ? `응급장비 ${equipment.filter(Boolean).length}/${equipment.length}개 현재 가용`
          : `확인 항목 ${equipment.filter(Boolean).length}/${equipment.length}개 보유`
        : '심평원 원천 미제공',
    },
    {
      label: '일반응급실 여력',
      value: capacityScore,
      detail:
        typeof hospital.hvec === 'number' && typeof hospital.total_hvec === 'number'
          ? `${hospital.hvec}/${hospital.total_hvec}병상 가용`
          : '국립중앙의료원 원천 미제공',
    },
    specialBedScore(hospital),
  ];
}

export function hasSufficientInfrastructureData(hospital: HospitalRecord): boolean {
  return calculateInfrastructureMetrics(hospital).some(({ value }) => value !== null);
}
