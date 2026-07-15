import type { HospitalRecord } from '../../shared/types/hospital';
import { isMoonlightHospital } from '../../shared/types/hospital';
import { HospitalHiraInfo } from './HospitalHiraInfo';
import { HospitalMoonlightInfo } from './HospitalMoonlightInfo';
import { HospitalRadarChart } from './HospitalRadarChart';

interface HospitalInfrastructureSectionProps {
  hospital: HospitalRecord;
  variant: 'citizen' | 'admin';
}

export function HospitalInfrastructureSection({
  hospital,
  variant,
}: HospitalInfrastructureSectionProps) {
  const isMoonlight = isMoonlightHospital(hospital);

  if (variant === 'admin') {
    return isMoonlight ? (
      <HospitalMoonlightInfo hospital={hospital} variant="admin" />
    ) : (
      <HospitalRadarChart hospital={hospital} />
    );
  }

  return isMoonlight ? (
    <HospitalMoonlightInfo hospital={hospital} variant="citizen" />
  ) : (
    <HospitalHiraInfo hospital={hospital} />
  );
}
