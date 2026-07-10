import { HOSPITAL_TIER_ORDER, HOSPITAL_TIER_VISUAL } from '../../shared/lib/hospital-tier-visual';
import { TierIcon } from './TierIcon';

const PANEL_SHELL =
  'flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-[#fcfdff] shadow-[0_1px_0_rgba(15,23,42,0.03)]';

export function HospitalEmptyPanel() {
  return (
    <aside className={`${PANEL_SHELL} justify-between`}>
      <div className="border-b border-slate-200 bg-[#f4f8ff] px-5 py-4">
        <h2 className="text-lg font-extrabold text-slate-900">응급의료기관</h2>
        <p className="mt-1 text-xs font-medium text-indigo-600">지도에서 병원 마커를 선택하세요</p>
      </div>

      <div className="flex flex-1 flex-col justify-center gap-4 px-5 py-6">
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#2b63d9] text-3xl shadow-lg shadow-blue-200/50">
            🏥
          </div>
          <p className="mt-3 text-base font-bold text-slate-900">
            지도에서 병원을 선택해 주세요.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            지도의 병원 마커를 클릭하거나
            <br />
            행정동을 선택하면 상세 정보가 표시됩니다.
          </p>
        </div>

        <ul className="space-y-2.5 text-xs font-medium text-slate-600">
          {HOSPITAL_TIER_ORDER.map((tier) => {
            const visual = HOSPITAL_TIER_VISUAL[tier];
            return (
              <li
                key={tier}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2 ring-1 ${visual.chipClass}`}
              >
                <TierIcon tier={tier} size="sm" />
                <span>
                  <span className="font-semibold text-slate-800">{visual.label}</span>
                  <span className="text-slate-500"> — {visual.description}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="border-t border-slate-100 px-5 py-3 text-[10px] text-slate-400">
        응급·위급 상황은 119 또는 1339를 이용하세요.
      </p>
    </aside>
  );
}
