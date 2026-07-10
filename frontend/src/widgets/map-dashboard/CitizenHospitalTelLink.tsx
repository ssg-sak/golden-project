import {
  formatHospitalTelDisplay,
  resolveHospitalTel,
  toTelHref,
} from '../../shared/lib/hospital-tel';
import type { HospitalRecord } from '../../shared/types/hospital';

interface CitizenHospitalTelLinkProps {
  hospital: HospitalRecord;
  inverted?: boolean;
}

/** 시민 사이드바·리스트용 즉시 전화 걸기 링크 */
export function CitizenHospitalTelLink({
  hospital,
  inverted = false,
}: CitizenHospitalTelLinkProps) {
  const tel = resolveHospitalTel(hospital);
  if (!tel) return null;

  const href = toTelHref(tel);
  if (!href) return null;

  const display = formatHospitalTelDisplay(tel);

  return (
    <a
      href={href}
      onClick={(event) => event.stopPropagation()}
      className={`inline-flex w-fit items-center gap-1.5 text-sm font-semibold underline-offset-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${
        inverted
          ? 'text-indigo-100 hover:text-white hover:underline focus-visible:ring-white'
          : 'text-indigo-700 hover:text-indigo-900 hover:underline focus-visible:ring-indigo-400'
      }`}
      aria-label={`${hospital.name} 응급실 전화 ${display}`}
    >
      <span aria-hidden className="text-base leading-none">
        📞
      </span>
      <span className="tabular-nums">{display}</span>
    </a>
  );
}
