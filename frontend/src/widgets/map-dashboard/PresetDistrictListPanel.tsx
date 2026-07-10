import { usePresetStore } from './lib/usePresetStore';
import { useVulnerabilityStore } from '../../shared/store/vulnerabilityStore';

const PANEL_SHELL =
  'flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-[#fcfdff] shadow-[0_1px_0_rgba(15,23,42,0.03)]';

interface PresetDistrictListPanelProps {
  onDistrictSelect: (admNm: string) => void;
  selectedDistrict: string | null;
}

export function PresetDistrictListPanel({
  onDistrictSelect,
  selectedDistrict,
}: PresetDistrictListPanelProps) {
  const activePreset = usePresetStore((state) => state.activePreset);
  const presetData = usePresetStore((state) => state.presetData);
  const records = useVulnerabilityStore((state) => state.records);

  const presetName =
    activePreset === 'highRiskTop10'
      ? '고위험 Top 10'
      : activePreset === 'pediatricPriority'
        ? '소아 취약 우선'
        : activePreset === 'generalPriority'
          ? '일반 응급 우선'
          : '프리셋';

  return (
    <aside className={PANEL_SHELL}>
      <div className="shrink-0 border-b border-slate-200 bg-rose-50 px-5 py-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-rose-600">활성 프리셋</p>
        <h2 className="mt-1 text-xl font-extrabold leading-tight text-slate-900">{presetName}</h2>
        <p className="mt-1 text-xs text-slate-500">
          해당 지역들을 순서대로 확인해 보세요.
        </p>
      </div>
      <div className="flex flex-1 flex-col overflow-y-auto p-4">
        <ul className="space-y-2">
          {presetData.map((admNm, index) => {
            const isSelected = selectedDistrict === admNm;
            const record = records.find(r => r.adm_nm.includes(admNm) || admNm.includes(r.adm_nm) || r.dong_name === admNm);
            const score = record?.vulnerability_index ?? 0;
            
            return (
              <li key={admNm}>
                <button
                  type="button"
                  onClick={() => onDistrictSelect(admNm)}
                  className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left ring-1 transition-all ${
                    isSelected
                      ? 'bg-rose-500 text-white ring-rose-500 shadow-md'
                      : 'bg-white text-slate-700 ring-slate-200 hover:bg-rose-50 hover:ring-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {index + 1}
                    </span>
                    <span className="font-bold">{admNm}</span>
                  </div>
                  {score > 0 && (
                    <span className={`text-xs font-semibold ${
                      isSelected ? 'text-rose-100' : 'text-slate-500'
                    }`}>
                      VDI: {Math.round(score).toLocaleString()}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
