import { Button, CircularProgress } from '@mui/material';
import type { ButtonProps } from '@mui/material';

type AppButtonProps = ButtonProps & {
  loading?: boolean;
};

export const AppButton = ({ loading = false, disabled, children, sx, ...props }: AppButtonProps) => (
  <Button
    disabled={disabled || loading}
    sx={{
      transition: 'transform 160ms ease, box-shadow 160ms ease, background-color 160ms ease',
      '&:hover': {
        transform: disabled || loading ? 'none' : 'translateY(-1px)',
        boxShadow: disabled || loading ? 'none' : 3,
      },
      '&:active': {
        transform: disabled || loading ? 'none' : 'scale(0.98)',
      },
      ...sx,
    }}
    {...props}
  >
    {loading && <CircularProgress color="inherit" size={16} sx={{ mr: 1 }} />}
    {children}
  </Button>
);
