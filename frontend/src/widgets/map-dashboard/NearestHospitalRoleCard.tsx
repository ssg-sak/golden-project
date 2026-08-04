import type { HospitalRecord } from '../../shared/types/hospital';
import {
  hospitalAvailableBeds,
  hospitalDisplayAddress,
  hospitalTierBadge,
} from '../../shared/types/hospital';
import type { NearestHospitalRoleRoute } from '../../shared/types/vulnerability';

import { AvailableBedsBadge } from './AvailableBedsBadge';
import { HospitalActionButtons } from './HospitalActionButtons';
import { TierBadge } from './TierBadge';

interface NearestHospitalRoleCardProps {
  role: 'general' | 'pediatric';
  route: NearestHospitalRoleRoute;
  hospital: HospitalRecord | null;
}

const ROLE_CONTENT = {
  general: {
    title: '일반 응급기관',
    description: '응급실 진료와 중증 응급 대응을 확인하는 기관입니다.',
    labelClass: 'border-blue-200 bg-blue-50 text-blue-900',
  },
  pediatric: {
    title: '야간·휴일 소아진료',
    description: '일반 응급실과 역할이 다른 소아 야간·휴일 진료 자원입니다.',
    labelClass: 'border-cyan-200 bg-cyan-50 text-cyan-900',
  },
} as const;

export function NearestHospitalRoleCard({
  role,
  route,
  hospital,
}: NearestHospitalRoleCardProps) {
  const content = ROLE_CONTENT[role];

  return (
    <article className="border border-slate-200 bg-white p-4">
      <div className={`inline-flex border px-2.5 py-1 text-[11px] font-extrabold ${content.labelClass}`}>
        {content.title}
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-slate-600">{content.description}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <TierBadge tier={route.tier} />
        <span className="border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-700">
          {hospitalTierBadge(route.tier)}
        </span>
      </div>

      <p className="mt-2 text-base font-extrabold leading-snug text-slate-900">{route.name}</p>
      {hospital ? (
        <p className="mt-1 text-xs leading-relaxed text-slate-600">
          {hospitalDisplayAddress(hospital)}
        </p>
      ) : null}

      <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-xs">
        <div>
          <dt className="text-slate-500">도로 이동시간</dt>
          <dd className="mt-0.5 font-extrabold text-slate-900">약 {route.eta_minutes.toFixed(1)}분</dd>
        </div>
        <div>
          <dt className="text-slate-500">도로 거리</dt>
          <dd className="mt-0.5 font-extrabold text-slate-900">약 {route.road_distance_km.toFixed(1)}km</dd>
        </div>
      </dl>

      {role === 'general' && hospital ? (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <AvailableBedsBadge
            availableBeds={hospitalAvailableBeds(hospital)}
            totalBeds={hospital.total_hvec}
            size="md"
          />
        </div>
      ) : null}

      {role === 'pediatric' ? (
        <p className="mt-3 border border-cyan-100 bg-cyan-50 px-3 py-2 text-[10px] leading-relaxed text-cyan-900">
          응급실 병상 수보다 현재 운영시간과 소아 진료 가능 여부를 전화로 먼저 확인하세요.
        </p>
      ) : null}

      {hospital ? (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <HospitalActionButtons
            hospitalName={hospital.name}
            lat={hospital.lat}
            lng={hospital.lng}
          />
        </div>
      ) : null}
    </article>
  );
}
