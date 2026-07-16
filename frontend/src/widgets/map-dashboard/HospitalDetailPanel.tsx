import { useEffect, useRef } from 'react';

import { kakaoDirectionsUrl } from '../../shared/lib/kakao-navigation';
import { resolveBedStatus } from '../../shared/lib/bed-status';
import { hospitalTierLabel } from '../../shared/lib/hospital-tier-visual';
import {
  severeConditionOption,
  severeConditionStatus,
  severeConditionSummary,
  type SevereConditionId,
} from '../../shared/lib/severe-condition';
import {
  hospitalDisplayName,
  isMoonlightHospital,
} from '../../shared/types/hospital';
import type { HospitalRecord } from '../../shared/types/hospital';

import { CitizenBedLabel } from './CitizenBedLabel';
import { CitizenHospitalTelLink } from './CitizenHospitalTelLink';
import { HospitalLocationMeta } from './HospitalLocationMeta';
import { HospitalGranularBeds } from './HospitalGranularBeds';
import { HospitalInfrastructureSection } from './HospitalInfrastructureSection';

const PANEL_SHELL =
  'glass-panel-strong flex h-full min-h-0 flex-col overflow-hidden bg-white';
/** 부모가 스크롤할 때: 높이 고정·내부 스크롤 없이 본문만 흐르게 */
const PANEL_SHELL_PAGE = 'glass-panel-strong flex flex-col bg-white';

interface HospitalDetailPanelProps {
  hospital: HospitalRecord | null;
  severeCondition?: SevereConditionId;
  /**
   * panel: 사이드/임베드 — 내부 overflow-y-auto
   * page: 모바일 전체 상세 — 부모 스크롤 (높이 체인 깨짐 방지)
   */
  layout?: 'panel' | 'page';
  /** 모바일 상세+지도: 핸들 숨김·헤더 패딩 축소 */
  compact?: boolean;
}

function EmptyPanel() {
  return (
    <aside className={`${PANEL_SHELL} justify-center bg-white relative`}>
      <div className="absolute top-0 left-0 right-0 flex w-full items-center justify-center bg-white pt-3 pb-2 lg:hidden cursor-grab active:cursor-grabbing">
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

function HospitalDetailContent({
  hospital,
  severeCondition = 'all',
  layout = 'panel',
  compact = false,
}: {
  hospital: HospitalRecord;
  severeCondition?: SevereConditionId;
  layout?: 'panel' | 'page';
  compact?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const isPage = layout === 'page';
  const bedStatus = resolveBedStatus(hospital);
  const isMoonlight = isMoonlightHospital(hospital);
  const selectedCondition = severeConditionOption(severeCondition);
  const selectedConditionStatus = severeConditionStatus(hospital, severeCondition);
  const headerClass = isMoonlight
    ? 'border-cyan-300 bg-cyan-50'
    : bedStatus.status === 'unavailable'
      ? 'border-rose-300 bg-rose-50'
      : 'border-teal-300 bg-teal-50';

  useEffect(() => {
    if (isPage) return;
    const frame = window.requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = 0;
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [hospital.name, isPage]);

  return (
    <aside className={isPage ? PANEL_SHELL_PAGE : PANEL_SHELL}>
      {!isPage && !compact ? (
        <div className="flex w-full shrink-0 cursor-grab items-center justify-center bg-white pt-3 pb-2 active:cursor-grabbing lg:hidden">
          <div className="h-1.5 w-12 rounded-full bg-slate-300" />
        </div>
      ) : null}
      <div
        className={`shrink-0 border-b ${compact ? 'px-4 py-3' : 'px-5 py-5'} ${headerClass}`}
      >
        <CitizenBedLabel hospital={hospital} size="detail" />
        <h2
          className={`mt-2 font-extrabold leading-snug text-slate-900 ${
            compact ? 'text-lg' : 'mt-3 text-xl'
          }`}
        >
          {hospitalDisplayName(hospital)}
        </h2>
        <p className="mt-1 text-sm text-slate-600">{hospitalTierLabel(hospital.tier)}</p>
      </div>

      <div
        ref={isPage ? undefined : scrollRef}
        className={
          isPage
            ? 'space-y-4 p-5 pb-8'
            : 'min-h-0 flex-1 space-y-4 overflow-y-scroll overscroll-contain p-4 pb-10 [-webkit-overflow-scrolling:touch] touch-pan-y'
        }
        style={isPage ? undefined : { WebkitOverflowScrolling: 'touch' }}
      >
        <section className="border border-teal-300 bg-teal-50 p-4">
          <p className="text-xs font-bold text-teal-900">1. 출발 전 병원에 전화 확인</p>
          <div className="mt-2">
            <CitizenHospitalTelLink hospital={hospital} />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            응급·위급 시 119 · 응급의료 정보센터 1339
          </p>
        </section>

        {!isMoonlight ? <HospitalGranularBeds hospital={hospital} /> : null}

        <HospitalLocationMeta hospital={hospital} variant="compact" />

        {isMoonlight ? (
          <p className="rounded-lg bg-cyan-50 px-3 py-2 text-xs font-bold leading-relaxed text-cyan-900 ring-1 ring-cyan-200">
            소아 응급 접근성은 야간·휴일 소아진료 가능성을 중심으로 해석합니다.
          </p>
        ) : null}

        {severeCondition !== 'all' ? (
          <section
            className={`rounded-lg border px-3 py-3 text-xs leading-relaxed ${
              selectedConditionStatus === 'available'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : selectedConditionStatus === 'unavailable'
                  ? 'border-rose-200 bg-rose-50 text-rose-900'
                  : 'border-slate-200 bg-slate-50 text-slate-700'
            }`}
          >
            <p className="font-extrabold">{selectedCondition.label}</p>
            <p className="mt-1 font-semibold">{severeConditionSummary(hospital, severeCondition)}</p>
            <p className="mt-2 text-[11px]">
              중증질환 수용 가능 여부는 중앙응급의료센터 공식 데이터 기준의 참고값입니다.
              출발 전 119, 1339 또는 병원에 반드시 확인하세요.
            </p>
          </section>
        ) : null}

        {isMoonlight ? <HospitalInfrastructureSection hospital={hospital} variant="citizen" /> : null}

        {!isMoonlight && (hospital.realtime_source === 'unavailable' ||
        hospital.realtime_source === 'mock' ||
        hospital.available_beds === null) ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 ring-1 ring-amber-200">
            병상 수치는 실시간 확인되지 않았습니다. 도착 전 119·1339·병원으로 재확인하세요.
          </p>
        ) : null}

        {!isMoonlight ? <HospitalInfrastructureSection hospital={hospital} variant="citizen" /> : null}

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

export function HospitalDetailPanel({
  hospital,
  severeCondition = 'all',
  layout = 'panel',
  compact = false,
}: HospitalDetailPanelProps) {
  if (!hospital) {
    return <EmptyPanel />;
  }
  return (
    <HospitalDetailContent
      hospital={hospital}
      severeCondition={severeCondition}
      layout={layout}
      compact={compact}
    />
  );
}
