import { Button, CircularProgress } from '@mui/material';
import type { ButtonProps } from '@mui/material';

type AppButtonProps = ButtonProps & {
  loading?: boolean;
};

export const AppButton = ({ loading = false, disabled, children, sx, ...props }: AppButtonProps) => (
  <Button
    disabled={disabled || loading}
    sx={{
      minHeight: 36,
      borderRadius: 1,
      fontWeight: 700,
      transition: 'background-color 160ms ease, border-color 160ms ease, color 160ms ease',
      '&:hover': {
        boxShadow: 'none',
      },
      ...sx,
    }}
    {...props}
  >
    {loading && <CircularProgress color="inherit" size={16} sx={{ mr: 1 }} />}
    {children}
  </Button>
);
