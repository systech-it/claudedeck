import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'dark' | 'light';

interface ThemeState {
  theme: Theme;
  toggle: () => void;
}

function applyTheme(theme: Theme) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      toggle: () => {
        const next: Theme = get().theme === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        set({ theme: next });
      },
    }),
    {
      name: 'claudedeck-theme',
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme);
      },
    }
  )
);

// Apply theme on initial load before React renders
const stored = localStorage.getItem('claudedeck-theme');
if (stored) {
  try {
    const { state } = JSON.parse(stored) as { state: { theme: Theme } };
    applyTheme(state.theme);
  } catch { applyTheme('dark'); }
} else {
  applyTheme('dark');
}
