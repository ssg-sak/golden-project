import { create } from 'zustand';

export type PresetType = 'highRiskTop10' | 'pediatricPriority' | 'generalPriority' | null;

interface PresetStore {
  activePreset: PresetType;
  presetData: string[];
  setActivePreset: (preset: PresetType, data?: string[]) => void;
  clearPreset: () => void;
}

export const usePresetStore = create<PresetStore>((set) => ({
  activePreset: null,
  presetData: [],
  setActivePreset: (activePreset, presetData = []) => set({ activePreset, presetData }),
  clearPreset: () => set({ activePreset: null, presetData: [] }),
}));
