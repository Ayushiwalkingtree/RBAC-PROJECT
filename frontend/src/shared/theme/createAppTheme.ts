import { createTheme } from '@mui/material/styles';
import type { ThemeMode } from '@/shared/types/theme.types';

const palettes = {
  light1: {
    mode: 'light',
    primary: { main: '#2158a6' },
    secondary: { main: '#00856f' },
    background: { default: '#f6f8fb', paper: '#ffffff' },
  },
  light2: {
    mode: 'light',
    primary: { main: '#6b4eff' },
    secondary: { main: '#c65032' },
    background: { default: '#f7f4ef', paper: '#fffdf8' },
  },
  dark: {
    mode: 'dark',
    primary: { main: '#78a6ff' },
    secondary: { main: '#48d6b5' },
    background: { default: '#111827', paper: '#1f2937' },
  },
} as const;

export const createAppTheme = (mode: ThemeMode) =>
  createTheme({
    palette: palettes[mode],
    shape: {
      borderRadius: 8,
    },
    typography: {
      fontFamily: ['Inter', 'Roboto', 'Arial', 'sans-serif'].join(','),
      h4: { fontWeight: 700 },
      h5: { fontWeight: 700 },
      h6: { fontWeight: 700 },
      button: { textTransform: 'none', fontWeight: 700 },
    },
    components: {
      MuiButton: {
        defaultProps: {
          variant: 'contained',
          disableElevation: true,
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          size: 'small',
        },
      },
    },
  });
