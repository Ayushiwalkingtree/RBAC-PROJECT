import { CssBaseline } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { useMemo, type PropsWithChildren } from 'react';
import { createAppTheme } from '@/shared/theme/createAppTheme';
import { useThemeStore } from '@/shared/theme/theme.store';
import { AppSnackbarProvider } from '@/shared/components/AppSnackbar';

export const AppProviders = ({ children }: PropsWithChildren) => {
  const mode = useThemeStore((state) => state.mode);
  const theme = useMemo(() => createAppTheme(mode), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppSnackbarProvider>{children}</AppSnackbarProvider>
    </ThemeProvider>
  );
};
