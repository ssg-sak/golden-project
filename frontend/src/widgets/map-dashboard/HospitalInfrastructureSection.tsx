import type { HospitalRecord } from '../../shared/types/hospital';
import { isMoonlightHospital } from '../../shared/types/hospital';
import { HospitalMoonlightInfo } from './HospitalMoonlightInfo';

interface HospitalInfrastructureSectionProps {
  hospital: HospitalRecord;
  variant: 'citizen' | 'admin';
}

export function HospitalInfrastructureSection({
  hospital,
  variant,
}: HospitalInfrastructureSectionProps) {
  const isMoonlight = isMoonlightHospital(hospital);

  if (!isMoonlight) return null;

  return <HospitalMoonlightInfo hospital={hospital} variant={variant} />;
}
