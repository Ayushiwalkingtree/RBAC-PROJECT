import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '@/shared/constants/storage.constants';
import type { ThemeMode } from '@/shared/types/theme.types';

type ThemeState = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  cycleMode: () => void;
};

const themeOrder: ThemeMode[] = ['light1', 'light2', 'dark'];

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'light1',
      setMode: (mode) => set({ mode }),
      cycleMode: () => {
        const currentIndex = themeOrder.indexOf(get().mode);
        const nextMode = themeOrder[(currentIndex + 1) % themeOrder.length];
        set({ mode: nextMode });
      },
    }),
    {
      name: STORAGE_KEYS.theme,
    },
  ),
);
