import type { HospitalRecord } from '../../shared/types/hospital';
import {
  hospitalAvailableBeds,
  hospitalDisplayName,
  hospitalTierBadge,
} from '../../shared/types/hospital';
import { HOSPITAL_TIER_VISUAL } from '../../shared/lib/hospital-tier-visual';
import { useAppModeStore } from '../../shared/store/appModeStore';

import { HospitalActionButtons } from './HospitalActionButtons';
import { HospitalLocationMeta } from './HospitalLocationMeta';
import { TierBadge } from './TierBadge';
import { AvailableBedsBadge } from './AvailableBedsBadge';
import { HospitalHiraInfo } from './HospitalHiraInfo';
import { HospitalRadarChart } from './HospitalRadarChart';
import { HospitalMoonlightInfo } from './HospitalMoonlightInfo';
import { HospitalGranularBeds } from './HospitalGranularBeds';

const PANEL_SHELL =
  'flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-[#fcfdff] shadow-[0_1px_0_rgba(15,23,42,0.03)]';

const TIER_HEADER: Record<1 | 2 | 3, string> = {
  1: HOSPITAL_TIER_VISUAL[1].panelHeaderClass,
  2: HOSPITAL_TIER_VISUAL[2].panelHeaderClass,
  3: HOSPITAL_TIER_VISUAL[3].panelHeaderClass,
};

export function HospitalDetailView({ hospital }: { hospital: HospitalRecord }) {
  const viewMode = useAppModeStore((state) => state.viewMode);
  const tierLabel = hospitalTierBadge(hospital.tier);
  const availableBeds = hospitalAvailableBeds(hospital);

  return (
    <aside className={PANEL_SHELL}>
      <div className={`shrink-0 border-b px-5 py-4 ${TIER_HEADER[hospital.tier]} bg-[#f7faff]`}>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
          선택된 병원
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <TierBadge tier={hospital.tier} />
          <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold text-slate-600 ring-1 ring-slate-200">
            {tierLabel}
          </span>
          <AvailableBedsBadge availableBeds={availableBeds} size="md" />
        </div>
        <h2 className="mt-2 text-xl font-extrabold leading-snug text-slate-900">
          {hospitalDisplayName(hospital)}
        </h2>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
        <HospitalLocationMeta hospital={hospital} />

        {viewMode === 'admin' ? (
          <>
            {hospital.tier === 3 ? <HospitalMoonlightInfo hospital={hospital} variant="admin" /> : null}
            <HospitalRadarChart hospital={hospital} />
          </>
        ) : null}

        {hospital.tier !== 3 ? (
          availableBeds !== undefined ? (
            <HospitalGranularBeds hospital={hospital} />
          ) : (
            <section className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <p className="text-xs font-bold text-slate-600">실시간 병상 정보 없음</p>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                현재 병상 정보가 충분하지 않습니다. 실제 사용 가능 여부는 병원에 전화로 다시 확인해 주세요.
              </p>
            </section>
          )
        ) : null}

        {hospital.realtime_messages && hospital.realtime_messages.length > 0 ? (
          <section className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
            <p className="mb-2 text-xs font-bold text-amber-800">실시간 안내사항</p>
            <ul className="space-y-1">
              {hospital.realtime_messages.map((msg, i) => (
                <li key={i} className="text-xs leading-relaxed text-amber-900">
                  {msg}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {viewMode !== 'admin' ? (
          hospital.tier === 3 ? (
            <HospitalMoonlightInfo hospital={hospital} variant="citizen" />
          ) : (
            <HospitalHiraInfo hospital={hospital} />
          )
        ) : null}

        <section className="rounded-2xl bg-[#f4f8ff] p-4 ring-1 ring-blue-200/60">
          <p className="mb-3 text-xs font-bold text-[#2457c5]">빠른 액션</p>
          <HospitalActionButtons hospitalName={hospital.name} lat={hospital.lat} lng={hospital.lng} />
        </section>

        <p className="text-[10px] leading-relaxed text-slate-400">
          실시간 상황은 119 또는 1339를 우선 확인해 주세요. 병원 운영 시간도 함께 확인하는 것이 안전합니다.
        </p>
      </div>
    </aside>
  );
}
