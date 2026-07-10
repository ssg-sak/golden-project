import type { HospitalRecord } from '../../shared/types/hospital';
import {
  hospitalAvailableBeds,
  hospitalDisplayName,
  hospitalTierBadge,
  hospitalTotalBeds,
  hospitalTotalBedsIsInvalid,
} from '../../shared/types/hospital';
import { HOSPITAL_TIER_VISUAL } from '../../shared/lib/hospital-tier-visual';

import { HospitalActionButtons } from './HospitalActionButtons';
import { HospitalLocationMeta } from './HospitalLocationMeta';
import { TierBadge } from './TierBadge';
import { AvailableBedsBadge } from './AvailableBedsBadge';
import { HospitalHiraInfo } from './HospitalHiraInfo';

const PANEL_SHELL =
  'flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-[#fcfdff] shadow-[0_1px_0_rgba(15,23,42,0.03)]';

const TIER_HEADER: Record<1 | 2 | 3, string> = {
  1: HOSPITAL_TIER_VISUAL[1].panelHeaderClass,
  2: HOSPITAL_TIER_VISUAL[2].panelHeaderClass,
  3: HOSPITAL_TIER_VISUAL[3].panelHeaderClass,
};

export function HospitalDetailView({ hospital }: { hospital: HospitalRecord }) {
  const tierLabel = hospitalTierBadge(hospital.tier);
  const availableBeds = hospitalAvailableBeds(hospital);
  const totalBeds = hospitalTotalBeds(hospital);
  const totalBedsInvalid = hospitalTotalBedsIsInvalid(hospital);

  return (
    <aside className={PANEL_SHELL}>
      <div className={`shrink-0 border-b px-5 py-4 ${TIER_HEADER[hospital.tier]} bg-[#f7faff]`}>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
          선택 병원
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

        {availableBeds !== undefined ? (
          <section className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            <p className="mb-3 text-xs font-bold text-slate-600">실시간 응급 병상</p>
            <div className="flex items-baseline gap-1.5">
              {/* 현재 가용 병상 — 분수 형태(N/M)는 만석 오독 위험이 있어 사용하지 않음 */}
              <span
                className={`text-3xl font-black leading-none ${
                  availableBeds <= 0 ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                {availableBeds}
              </span>
              <span className="text-sm font-semibold text-slate-400">개 가용</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              {totalBeds !== undefined
                ? `전체 ${totalBeds}개 중 현재 비어있는 병상`
                : '현재 비어있는 응급 병상 수'}
            </p>
            {totalBedsInvalid ? (
              <p className="mt-1 text-[10px] text-amber-600">
                ※ 총 병상 데이터 불일치 (가용 &gt; 총) — 총 병상 미표시
              </p>
            ) : null}
            {hospital.realtime_source === 'mock' ? (
              <p className="mt-2 text-[10px] text-slate-400">※ Mock 데이터 (API 승인 전)</p>
            ) : null}
          </section>
        ) : null}

        {hospital.realtime_messages && hospital.realtime_messages.length > 0 ? (
          <section className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
            <p className="mb-2 text-xs font-bold text-amber-800">⚠ 응급실 특이사항</p>
            <ul className="space-y-1">
              {hospital.realtime_messages.map((msg, i) => (
                <li key={i} className="text-xs leading-relaxed text-amber-900">
                  {msg}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <HospitalHiraInfo hospital={hospital} />

        <section className="rounded-2xl bg-[#f4f8ff] p-4 ring-1 ring-blue-200/60">
          <p className="mb-3 text-xs font-bold text-[#2457c5]">빠른 액션</p>
          <HospitalActionButtons
            hospitalName={hospital.name}
            lat={hospital.lat}
            lng={hospital.lng}
          />
        </section>

        <p className="text-[10px] leading-relaxed text-slate-400">
          응급·위급 상황은 119 또는 1339를 이용하세요. 방문 전 운영 시간을 확인해 주세요.
        </p>
      </div>
    </aside>
  );
}
