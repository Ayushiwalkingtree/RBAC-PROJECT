import { alpha, createTheme } from '@mui/material/styles';
import type { Shadows } from '@mui/material/styles';
import { getThemePreset } from '@/shared/theme/theme.constants';
import type { ThemeMode } from '@/shared/types/theme.types';

const shadows = [
  'none',
  '0 1px 2px rgba(24, 36, 51, 0.04)',
  '0 2px 8px rgba(24, 36, 51, 0.06)',
  '0 4px 16px rgba(24, 36, 51, 0.08)',
  ...Array(21).fill('0 8px 24px rgba(24, 36, 51, 0.10)'),
] as Shadows;

export const createAppTheme = (mode: ThemeMode) => {
  const preset = getThemePreset(mode);
  const isDark = preset.mode === 'dark';

  return createTheme({
    palette: {
      mode: preset.mode,
      primary: {
        main: preset.primary,
        dark: preset.primary,
        light: preset.primaryLight,
        contrastText: '#ffffff',
      },
      secondary: {
        main: preset.primary,
        contrastText: '#ffffff',
      },
      success: { main: '#2fb344' },
      warning: { main: '#f59f00' },
      error: { main: '#d63939' },
      info: { main: isDark ? '#60a5fa' : '#4299e1' },
      background: {
        default: preset.pageBg,
        paper: preset.cardBg,
      },
      text: {
        primary: preset.text,
        secondary: preset.muted,
      },
      divider: preset.border,
    },
    shape: {
      borderRadius: 8,
    },
    shadows,
    typography: {
      fontFamily: ['Inter', 'system-ui', 'Arial', 'sans-serif'].join(','),
      h1: { fontWeight: 700, letterSpacing: 0 },
      h2: { fontWeight: 700, letterSpacing: 0 },
      h3: { fontWeight: 700, letterSpacing: 0 },
      h4: { fontWeight: 700, fontSize: '1.75rem', letterSpacing: 0 },
      h5: { fontWeight: 700, fontSize: '1.25rem', letterSpacing: 0 },
      h6: { fontWeight: 700, fontSize: '1rem', letterSpacing: 0 },
      subtitle1: { fontWeight: 700 },
      body1: { fontSize: '0.9375rem' },
      body2: { fontSize: '0.875rem' },
      button: { textTransform: 'none', fontWeight: 700, letterSpacing: 0 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: preset.pageBg,
            color: preset.text,
          },
        },
      },
      MuiButton: {
        defaultProps: {
          variant: 'contained',
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            minHeight: 36,
            borderRadius: 6,
            padding: '7px 14px',
            boxShadow: 'none',
            textTransform: 'none',
            '&:hover': {
              boxShadow: 'none',
            },
          },
          containedPrimary: {
            backgroundColor: preset.primary,
            '&:hover': {
              backgroundColor: preset.primary,
              filter: 'brightness(1.06)',
            },
          },
          outlined: {
            borderColor: preset.border,
            backgroundColor: preset.cardBg,
            '&:hover': {
              borderColor: preset.primary,
              backgroundColor: preset.primaryLight,
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            borderRadius: 8,
            backgroundColor: preset.cardBg,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            border: `1px solid ${preset.border}`,
            borderRadius: 8,
            backgroundColor: preset.cardBg,
            boxShadow: isDark ? 'none' : '0 1px 2px rgba(24, 36, 51, 0.04)',
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 8,
            border: `1px solid ${preset.border}`,
            backgroundColor: preset.cardBg,
            boxShadow: isDark ? '0 18px 45px rgba(0,0,0,0.35)' : '0 18px 45px rgba(24, 36, 51, 0.16)',
          },
        },
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: {
            padding: '18px 20px 10px',
          },
        },
      },
      MuiDialogContent: {
        styleOverrides: {
          root: {
            padding: '16px 20px 20px',
          },
        },
      },
      MuiDialogActions: {
        styleOverrides: {
          root: {
            padding: '14px 20px 18px',
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          size: 'small',
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            minHeight: 38,
            borderRadius: 6,
            backgroundColor: preset.cardBg,
            color: preset.text,
            '& fieldset': {
              borderColor: preset.border,
            },
            '&:hover fieldset': {
              borderColor: alpha(preset.primary, 0.55),
            },
            '&.Mui-focused fieldset': {
              borderColor: preset.primary,
              boxShadow: `0 0 0 3px ${alpha(preset.primary, 0.14)}`,
            },
          },
          input: {
            paddingTop: 8,
            paddingBottom: 8,
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            color: preset.muted,
            fontSize: '0.875rem',
          },
        },
      },
      MuiTableContainer: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottomColor: preset.border,
            padding: '10px 14px',
          },
          head: {
            backgroundColor: preset.tableHead,
            color: preset.muted,
            fontSize: '0.75rem',
            fontWeight: 800,
            textTransform: 'uppercase',
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            border: `1px solid ${preset.border}`,
            borderRadius: 8,
            backgroundColor: preset.cardBg,
            boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.35)' : '0 10px 30px rgba(24, 36, 51, 0.12)',
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: {
            backgroundColor: preset.primary,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            fontWeight: 700,
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            border: `1px solid ${preset.border}`,
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            borderRadius: 6,
            fontSize: '0.75rem',
          },
        },
      },
    },
  });
};
