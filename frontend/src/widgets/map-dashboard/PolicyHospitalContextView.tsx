import type { HospitalRecord } from '../../shared/types/hospital';
import {
  hospitalDisplayAddress,
  hospitalTierBadge,
  isMoonlightHospital,
} from '../../shared/types/hospital';
import { HOSPITAL_TIER_VISUAL, hospitalTierBasisLabel } from '../../shared/lib/hospital-tier-visual';
import type { DistrictVulnerabilityRecord } from '../../shared/types/vulnerability';

const PANEL_SHELL =
  'flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-[#fcfdff] shadow-[0_1px_0_rgba(15,23,42,0.03)]';

const POLICY_ROLE: Record<HospitalRecord['tier'], { title: string; body: string }> = {
  1: {
    title: '중증 응급 거점',
    body: '중증 응급환자 대응을 우선 확인하는 대형 응급 거점입니다. 분석에서는 주요 응급 공급 지점과 접근성 비교의 기준으로 사용합니다.',
  },
  2: {
    title: '일반 응급기관',
    body: '지역 단위 응급의료 접근성을 살피는 기관입니다. 행정동별 거리와 도로 이동시간을 비교할 때 응급 관련 공급 지점으로 포함합니다.',
  },
  3: {
    title: '소아 야간·휴일',
    body: '달빛어린이병원 등 야간·휴일 소아진료 자원입니다. 일반 응급기관과 같은 의미가 아니라 소아 접근성의 보완 자원으로 따로 봅니다.',
  },
};

/** 정책 화면에서 기관을 시민용 병원 상세가 아닌 공급·분석 기준으로 설명한다. */
export function PolicyHospitalContextView({
  hospital,
  vulnerabilityRecords,
  riskThreshold,
}: {
  hospital: HospitalRecord;
  vulnerabilityRecords: DistrictVulnerabilityRecord[];
  riskThreshold?: number;
}) {
  const isMoonlight = isMoonlightHospital(hospital);
  const tierVisual = HOSPITAL_TIER_VISUAL[hospital.tier];
  const policyRole = POLICY_ROLE[hospital.tier];
  const linkedDistricts = vulnerabilityRecords.filter(
    (record) => record.nearest_hospital_name === hospital.name,
  );
  const linkedHighRiskDistricts = linkedDistricts.filter(
    (record) => riskThreshold !== undefined && record.vdi_log >= riskThreshold,
  );
  const linkedVulnerablePopulation = linkedDistricts.reduce(
    (total, record) => total + record.vulnerable_pop,
    0,
  );

  return (
    <aside className={PANEL_SHELL}>
      <header className="shrink-0 border-b border-teal-200 bg-teal-50 px-5 py-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-teal-800">분석 기준 기관</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ring-1 ${tierVisual.chipClass} ${tierVisual.chipTextClass}`}>
            {hospitalTierBadge(hospital.tier)}
          </span>
          {isMoonlight ? (
            <span className="rounded-full bg-cyan-100 px-2.5 py-1 text-[10px] font-extrabold text-cyan-900 ring-1 ring-cyan-200">
              야간·휴일 소아진료 기준
            </span>
          ) : null}
        </div>
        <h2 className="mt-3 text-xl font-extrabold leading-snug text-slate-900">{hospital.name}</h2>
        <p className="mt-2 text-[11px] font-semibold text-teal-800">
          {hospitalTierBasisLabel(hospital.tier)} · 프로젝트 분석 역할
        </p>
        <p className="mt-2 text-xs leading-5 text-slate-600">
          이 기관은 정책 분석에서 응급의료 공급과 접근성을 비교하기 위한 기준점입니다.
        </p>
      </header>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-bold text-teal-800">기관 역할</p>
          <p className="mt-2 text-sm font-extrabold text-slate-900">{policyRole.title}</p>
          <p className="mt-2 text-xs leading-5 text-slate-600">{policyRole.body}</p>
        </section>

        <section className="rounded-xl border border-blue-200 bg-blue-50/60 p-4">
          <p className="text-xs font-bold text-blue-800">연결된 행정동 요약</p>
          <p className="mt-2 text-xs leading-5 text-slate-600">
            행정동 중심점에서 이 기관이 가장 가까운 응급 관련 기관으로 기록된 경우를 집계합니다. 기관의 진료 가능 여부나 이용량을 뜻하지 않습니다.
          </p>
          <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-white p-2 ring-1 ring-blue-100">
              <dt className="text-[10px] text-slate-500">연결 동네</dt>
              <dd className="mt-1 text-lg font-extrabold text-slate-900">{linkedDistricts.length}</dd>
            </div>
            <div className="rounded-lg bg-white p-2 ring-1 ring-blue-100">
              <dt className="text-[10px] text-slate-500">상위 위험</dt>
              <dd className="mt-1 text-lg font-extrabold text-slate-900">{linkedHighRiskDistricts.length}</dd>
            </div>
            <div className="rounded-lg bg-white p-2 ring-1 ring-blue-100">
              <dt className="text-[10px] text-slate-500">취약인구 합계</dt>
              <dd className="mt-1 text-lg font-extrabold text-slate-900">{linkedVulnerablePopulation.toLocaleString('ko-KR')}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-bold text-teal-800">위치 기준</p>
          <p className="mt-2 text-sm leading-6 text-slate-800">{hospitalDisplayAddress(hospital)}</p>
          <p className="mt-2 text-[11px] leading-5 text-slate-500">
            좌표 {hospital.lat.toFixed(6)}, {hospital.lng.toFixed(6)}
          </p>
        </section>

        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-bold text-amber-900">정책 화면에서의 주의</p>
          <p className="mt-2 text-xs leading-5 text-amber-900">
            이 화면은 설치·이전 또는 진료 가능 여부를 결정하지 않습니다. 후보지와 접근성 결과는 현장 조사와 전문가 검토 전에 우선순위를 좁히는 참고 자료입니다.
          </p>
        </section>

        <p className="text-[10px] leading-relaxed text-slate-400">
          병상·전화·길찾기는 시민용 응급의료 화면에서 확인하세요. 정책 분석의 기관 수와 결과는 공개된 기준 릴리스에 따릅니다.
        </p>
      </div>
    </aside>
  );
}
