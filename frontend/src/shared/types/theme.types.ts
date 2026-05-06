export type ThemeMode = 'default' | 'ocean' | 'forest' | 'royal' | 'dark';

export type ThemeOption = {
  id: ThemeMode;
  label: string;
};

export type ThemePreset = ThemeOption & {
  primary: string;
  sidebar: string;
  pageBg: string;
  cardBg: string;
  text: string;
  muted: string;
  border: string;
  tableHead: string;
  primaryLight: string;
  mode: 'light' | 'dark';
};
