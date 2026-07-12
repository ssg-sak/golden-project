import type { HospitalRecord } from '../../../shared/types/hospital';

export interface InfrastructureMetric {
  label: string;
  value: number;
}

const clampScore = (value: number) => Math.max(0, Math.min(100, value));

export function calculateInfrastructureMetrics(hospital: HospitalRecord): InfrastructureMetric[] {
  const equipment = Object.values(hospital.equipment_status ?? {});
  const availableBeds = (hospital.hvec ?? 0) + (hospital.hvoc ?? 0);
  const doctorScore = clampScore(((hospital.doctors_count ?? 0) / 50) * 100);
  const equipmentScore = equipment.length
    ? clampScore((equipment.filter(Boolean).length / equipment.length) * 100)
    : 0;
  const capacityScore = clampScore((availableBeds / 20) * 100);
  const tierScore = hospital.tier === 1 ? 100 : hospital.tier === 2 ? 70 : 50;

  return [
    { label: '의료진', value: doctorScore },
    { label: '장비', value: equipmentScore },
    { label: '수용력', value: capacityScore },
    { label: '기관 등급', value: tierScore },
  ];
}

export function hasSufficientInfrastructureData(hospital: HospitalRecord): boolean {
  const hasDoctors = typeof hospital.doctors_count === 'number';
  const hasEquipment = Object.keys(hospital.equipment_status ?? {}).length > 0;
  const hasBeds = typeof hospital.hvec === 'number' || typeof hospital.hvoc === 'number';
  return hasDoctors && hasEquipment && hasBeds;
}
