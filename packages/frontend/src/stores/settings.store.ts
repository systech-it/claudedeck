import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  defaultModel: string | undefined;
  defaultEffort: string | undefined;
  setDefaultModel: (m: string | undefined) => void;
  setDefaultEffort: (e: string | undefined) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      defaultModel: undefined,
      defaultEffort: undefined,
      setDefaultModel: (defaultModel) => set({ defaultModel }),
      setDefaultEffort: (defaultEffort) => set({ defaultEffort }),
    }),
    { name: 'claudedeck-settings' }
  )
);
