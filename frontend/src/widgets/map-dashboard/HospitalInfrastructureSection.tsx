import type { HospitalRecord } from '../../shared/types/hospital';
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
  if (variant === 'admin') {
    return (
      <>
        {hospital.tier === 3 ? <HospitalMoonlightInfo hospital={hospital} variant="admin" /> : null}
        <HospitalRadarChart hospital={hospital} />
      </>
    );
  }

  return hospital.tier === 3 ? (
    <HospitalMoonlightInfo hospital={hospital} variant="citizen" />
  ) : (
    <HospitalHiraInfo hospital={hospital} />
  );
}
