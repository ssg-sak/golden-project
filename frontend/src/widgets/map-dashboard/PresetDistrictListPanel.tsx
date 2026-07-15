import { useVulnerabilityStore } from '../../shared/store/vulnerabilityStore';

import { usePresetStore } from './lib/usePresetStore';

const PANEL_SHELL =
  'flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-[#fcfdff] shadow-[0_1px_0_rgba(15,23,42,0.03)]';

interface PresetDistrictListPanelProps {
  onDistrictSelect: (admNm: string) => void;
  selectedDistrict: string | null;
}

function simplifyDistrictName(admNm: string): string {
  return admNm.replace(/^대구광역시\s*/, '').trim();
}

function formatScore(value?: number): string {
  if (value === undefined || Number.isNaN(value)) return '-';
  return Math.round(value).toLocaleString('ko-KR');
}

export function PresetDistrictListPanel({
  onDistrictSelect,
  selectedDistrict,
}: PresetDistrictListPanelProps) {
  const activePreset = usePresetStore((state) => state.activePreset);
  const presetData = usePresetStore((state) => state.presetData);
  const records = useVulnerabilityStore((state) => state.records);

  const presetMeta =
    activePreset === 'highRiskTop10'
      ? {
          title: '응급 접근성 위험 지역',
          description: '병원까지 멀고 보호 필요 인구가 많아 먼저 살펴볼 동네입니다.',
        }
      : activePreset === 'pediatricPriority'
        ? {
            title: '소아 야간·휴일 취약 지역',
            description: '가까운 기관이 달빛어린이병원 성격인지 함께 봐야 하는 동네입니다.',
          }
        : activePreset === 'generalPriority'
          ? {
              title: '응급기관 접근 취약 지역',
              description: '권역·대형 또는 준종합 응급기관 접근성이 상대적으로 낮은 동네입니다.',
            }
          : {
              title: '빠른 지역 조회',
              description: '상단의 빠른 조회 버튼을 선택해 주세요.',
            };

  return (
    <aside className={PANEL_SHELL}>
      <div className="shrink-0 border-b border-slate-200 bg-rose-50 px-5 py-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-rose-600">빠른 지역 조회</p>
        <h2 className="mt-1 text-xl font-extrabold leading-tight text-slate-900">{presetMeta.title}</h2>
        <p className="mt-1 text-xs leading-5 text-slate-600">{presetMeta.description}</p>
        <p className="mt-2 text-[11px] font-semibold text-rose-700">
          위험 점수는 먼저 볼 지역을 좁히는 참고값입니다.
        </p>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto p-4">
        <ul className="space-y-2">
          {presetData.map((admNm, index) => {
            const isSelected =
              selectedDistrict === admNm ||
              simplifyDistrictName(selectedDistrict ?? '') === admNm ||
              selectedDistrict === `대구광역시 ${admNm}`;
            const record = records.find((row) => simplifyDistrictName(row.adm_nm) === admNm);

            return (
              <li key={admNm}>
                <button
                  type="button"
                  onClick={() => onDistrictSelect(admNm)}
                  className={`flex w-full flex-col gap-2 rounded-xl px-4 py-3 text-left ring-1 transition-all ${
                    isSelected
                      ? 'bg-rose-600 text-white shadow-md ring-rose-600'
                      : 'bg-white text-slate-700 ring-slate-200 hover:bg-rose-50 hover:ring-rose-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {index + 1}
                      </span>
                      <span className="truncate font-bold">{admNm}</span>
                    </div>
                    <span className={`shrink-0 text-xs font-semibold ${isSelected ? 'text-rose-100' : 'text-slate-500'}`}>
                      위험 {formatScore(record?.vdi_log)}
                    </span>
                  </div>

                  {record ? (
                    <div className={`grid grid-cols-2 gap-2 text-[11px] ${isSelected ? 'text-rose-50' : 'text-slate-500'}`}>
                      <span>비교 {record.vdi_norm.toFixed(1)}점</span>
                      <span>보호 필요 {record.vulnerable_pop.toLocaleString('ko-KR')}명</span>
                      <span>최근접 {record.min_dist_to_hospital.toFixed(2)}km</span>
                      <span className="truncate">{record.nearest_hospital_name ?? '최근접 병원 확인 중'}</span>
                    </div>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
