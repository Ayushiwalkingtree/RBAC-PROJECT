import type { ThemeMode, ThemeOption, ThemePreset } from '@/shared/types/theme.types';

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'default',
    label: 'Default',
    primary: '#0054a6',
    sidebar: '#182433',
    pageBg: '#f3f6f9',
    cardBg: '#ffffff',
    text: '#182433',
    muted: '#667085',
    border: '#dce3ea',
    tableHead: '#f8fafc',
    primaryLight: '#eef6ff',
    mode: 'light',
  },
  {
    id: 'ocean',
    label: 'Ocean',
    primary: '#0f9ab5',
    sidebar: '#0f5673',
    pageBg: '#eefaff',
    cardBg: '#ffffff',
    text: '#182433',
    muted: '#667085',
    border: '#cfe8ef',
    tableHead: '#f0fbff',
    primaryLight: '#e6f8fb',
    mode: 'light',
  },
  {
    id: 'forest',
    label: 'Forest',
    primary: '#0f9f6e',
    sidebar: '#063d20',
    pageBg: '#effdf6',
    cardBg: '#ffffff',
    text: '#182433',
    muted: '#667085',
    border: '#cdecdc',
    tableHead: '#f3fdf8',
    primaryLight: '#e8fbf2',
    mode: 'light',
  },
  {
    id: 'royal',
    label: 'Royal',
    primary: '#7c3aed',
    sidebar: '#2e1065',
    pageBg: '#fbf5ff',
    cardBg: '#ffffff',
    text: '#182433',
    muted: '#667085',
    border: '#e7d7fb',
    tableHead: '#fdf8ff',
    primaryLight: '#f3e8ff',
    mode: 'light',
  },
  {
    id: 'dark',
    label: 'Dark',
    primary: '#3b82f6',
    sidebar: '#0f172a',
    pageBg: '#111827',
    cardBg: '#1f2937',
    text: '#f9fafb',
    muted: '#94a3b8',
    border: '#334155',
    tableHead: '#162033',
    primaryLight: '#1e3a5f',
    mode: 'dark',
  },
];

export const THEME_OPTIONS: ThemeOption[] = THEME_PRESETS.map(({ id, label }) => ({ id, label }));

export const THEME_PRESET_MAP = THEME_PRESETS.reduce<Record<ThemeMode, ThemePreset>>(
  (presets, preset) => ({
    ...presets,
    [preset.id]: preset,
  }),
  {} as Record<ThemeMode, ThemePreset>,
);

export const getThemePreset = (mode: ThemeMode | string): ThemePreset =>
  THEME_PRESET_MAP[mode as ThemeMode] ?? THEME_PRESET_MAP.default;
