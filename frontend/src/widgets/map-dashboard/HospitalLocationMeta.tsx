import {
  formatHospitalCoordinates,
  kakaoMapPointUrl,
} from '../../shared/lib/kakao-navigation';
import {
  hospitalDisplayAddress,
  hospitalDisplayName,
} from '../../shared/types/hospital';
import type { HospitalRecord } from '../../shared/types/hospital';

interface HospitalLocationMetaProps {
  hospital: HospitalRecord;
  variant?: 'default' | 'compact';
}

export function HospitalLocationMeta({ hospital, variant = 'default' }: HospitalLocationMetaProps) {
  const isCompact = variant === 'compact';

  return (
    <section className={`rounded-2xl bg-white/80 ring-1 ring-slate-100 ${isCompact ? 'p-3' : 'p-4'}`}>
      <p className="text-xs font-bold text-indigo-600">위치</p>
      <p className={`mt-1.5 leading-relaxed text-slate-800 ${isCompact ? 'text-sm' : 'text-sm'}`}>
        {hospitalDisplayAddress(hospital)}
      </p>
      {!isCompact ? (
        <p className="mt-2 font-mono text-[11px] text-slate-500">
          {formatHospitalCoordinates(hospital.lat, hospital.lng)}
        </p>
      ) : null}
      <a
        href={kakaoMapPointUrl(hospital.lat, hospital.lng)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex text-xs font-semibold text-indigo-600 underline underline-offset-2 hover:text-indigo-800"
      >
        카카오맵에서 정확한 위치 보기
      </a>
      {!isCompact ? (
        <p className="mt-1 text-[10px] text-slate-400">
          {hospitalDisplayName(hospital)} · WGS84 좌표
        </p>
      ) : null}
    </section>
  );
}
