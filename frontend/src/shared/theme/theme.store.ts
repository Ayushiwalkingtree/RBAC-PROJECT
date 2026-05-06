import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '@/shared/constants/storage.constants';
import { THEME_OPTIONS } from '@/shared/theme/theme.constants';
import type { ThemeMode } from '@/shared/types/theme.types';

type ThemeState = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  cycleMode: () => void;
};

const themeOrder: ThemeMode[] = THEME_OPTIONS.map((option) => option.id);
const normalizeThemeMode = (mode: ThemeMode | string | undefined): ThemeMode => {
  if (mode === 'light1' || mode === 'light2') {
    return 'default';
  }
  return themeOrder.includes(mode as ThemeMode) ? (mode as ThemeMode) : 'default';
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'default',
      setMode: (mode) => set({ mode: normalizeThemeMode(mode) }),
      cycleMode: () => {
        const currentIndex = themeOrder.indexOf(normalizeThemeMode(get().mode));
        const nextMode = themeOrder[(currentIndex + 1) % themeOrder.length];
        set({ mode: nextMode });
      },
    }),
    {
      name: STORAGE_KEYS.theme,
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.mode = normalizeThemeMode(state.mode);
        }
      },
    },
  ),
);
