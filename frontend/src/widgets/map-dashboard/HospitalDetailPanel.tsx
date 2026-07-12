import { kakaoDirectionsUrl } from '../../shared/lib/kakao-navigation';
import { resolveBedStatus } from '../../shared/lib/bed-status';
import { hospitalTierLabel } from '../../shared/lib/hospital-tier-visual';
import {
  hospitalDisplayName,
} from '../../shared/types/hospital';
import type { HospitalRecord } from '../../shared/types/hospital';

import { CitizenBedLabel } from './CitizenBedLabel';
import { CitizenHospitalTelLink } from './CitizenHospitalTelLink';
import { HospitalLocationMeta } from './HospitalLocationMeta';
import { HospitalMoonlightInfo } from './HospitalMoonlightInfo';
import { HospitalGranularBeds } from './HospitalGranularBeds';

const PANEL_SHELL =
  'glass-panel-strong flex h-full min-h-0 flex-col overflow-hidden';

interface HospitalDetailPanelProps {
  hospital: HospitalRecord | null;
}

function EmptyPanel() {
  return (
    <aside className={`${PANEL_SHELL} justify-center bg-white relative`}>
      {/* 모바일 바텀 시트 드래그 핸들 */}
      <div className="absolute top-0 left-0 right-0 flex w-full items-center justify-center pt-3 pb-2 lg:hidden cursor-grab active:cursor-grabbing">
        <div className="h-1.5 w-12 rounded-full bg-slate-200" />
      </div>
      <div className="px-6 py-10 text-center">
        <p className="text-4xl" aria-hidden>
          🏥
        </p>
        <p className="mt-4 text-base font-bold text-slate-900">병원을 선택해 주세요</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          왼쪽 목록 또는 지도 마커를 누르면
          <br />
          병상 현황과 길찾기가 표시됩니다.
        </p>
        <p className="mt-6 text-xs font-medium text-rose-600">
          응급·위급 상황이면 즉시 119 또는 1339
        </p>
      </div>
    </aside>
  );
}

function HospitalDetailContent({ hospital }: { hospital: HospitalRecord }) {
  const bedStatus = resolveBedStatus(hospital);
  return (
    <aside className={PANEL_SHELL}>
      {/* 모바일 바텀 시트 드래그 핸들 */}
      <div className="flex w-full items-center justify-center pt-3 pb-2 lg:hidden cursor-grab active:cursor-grabbing bg-white/50 backdrop-blur-md">
        <div className="h-1.5 w-12 rounded-full bg-slate-300" />
      </div>
      <div
        className={`shrink-0 border-b px-5 py-5 ${
          bedStatus.status === 'unavailable'
            ? 'border-rose-300 bg-rose-50'
            : 'border-teal-300 bg-teal-50'
        }`}
      >
        <CitizenBedLabel hospital={hospital} size="detail" />
        <h2 className="mt-3 text-xl font-extrabold leading-snug text-slate-900">
          {hospitalDisplayName(hospital)}
        </h2>
        <p className="mt-1 text-sm text-slate-600">{hospitalTierLabel(hospital.tier)}</p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
        <HospitalLocationMeta hospital={hospital} variant="compact" />

        <section className="border border-teal-300 bg-teal-50 p-4">
          <p className="text-xs font-bold text-teal-900">1. 출발 전 병원에 전화 확인</p>
          <div className="mt-2">
            <CitizenHospitalTelLink hospital={hospital} />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            응급·위급 시 119 · 응급의료 정보센터 1339
          </p>
        </section>

        {hospital.tier === 3 ? (
          <HospitalMoonlightInfo hospital={hospital} variant="citizen" />
        ) : null}

        {hospital.tier !== 3 && (hospital.realtime_source === 'unavailable' ||
        hospital.realtime_source === 'mock' ||
        hospital.available_beds === null) ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 ring-1 ring-amber-200">
            병상 수치는 실시간 확인되지 않았습니다. 도착 전 119·1339·병원으로 재확인하세요.
          </p>
        ) : null}

        {/* 의료 인프라 현황 (심평원 데이터) */}
        {hospital.tier !== 3 && (typeof hospital.doctors_count === 'number' || hospital.equipment_status) && (
          <section className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl" aria-hidden>🏥</span>
              <p className="text-xs font-bold text-slate-800">의료 인프라 현황 (HIRA 데이터)</p>
            </div>
            <p className="text-[11px] font-medium text-slate-500 mb-3 leading-relaxed">
              본 정보는 심평원 정적 인프라 데이터입니다. 실시간 상황과 다를 수 있으므로 방문 전 진료 가능 여부를 확인 바랍니다.
            </p>
            <div className="flex flex-col gap-2 text-xs text-slate-700 font-medium">
              {typeof hospital.doctors_count === 'number' && (
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <span className="flex items-center gap-1.5"><span aria-hidden>👨‍⚕️</span>전문의 보유 현황</span>
                  <span className="font-extrabold text-slate-900">{hospital.doctors_count}명</span>
                </div>
              )}
              {hospital.equipment_status && Object.keys(hospital.equipment_status).length > 0 && (
                <div className="flex flex-col gap-1.5 pt-1">
                  <span className="flex items-center gap-1.5"><span aria-hidden>⚙️</span>주요 의료장비 보유</span>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(hospital.equipment_status).map(([eqName, hasEq]) => 
                      hasEq ? (
                        <span key={eqName} className="inline-flex items-center rounded-md bg-teal-50 px-2 py-1 text-[11px] font-bold text-teal-700 ring-1 ring-teal-200">
                          {eqName} 보유
                        </span>
                      ) : null
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {hospital.tier !== 3 ? (
          <HospitalGranularBeds hospital={hospital} />
        ) : null}

        {hospital.realtime_messages && hospital.realtime_messages.length > 0 ? (
          <section className="rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200">
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

        <a
          href={kakaoDirectionsUrl(hospital.name, hospital.lat, hospital.lng)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 border border-teal-900 bg-teal-800 px-4 py-4 text-lg font-extrabold text-white transition hover:bg-teal-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
        >
          <span aria-hidden>🚑</span>
          2. 전화 확인 후 길찾기
        </a>
      </div>
    </aside>
  );
}

export function HospitalDetailPanel({ hospital }: HospitalDetailPanelProps) {
  if (!hospital) {
    return <EmptyPanel />;
  }
  return <HospitalDetailContent hospital={hospital} />;
}
