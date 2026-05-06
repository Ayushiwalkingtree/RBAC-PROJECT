import { Chip } from '@mui/material';
import type { ChipProps } from '@mui/material';

type PermissionChipProps = ChipProps & {
  selected?: boolean;
};

export const PermissionChip = ({ selected = false, sx, ...props }: PermissionChipProps) => (
  <Chip
    color={selected ? 'primary' : 'default'}
    variant={selected ? 'filled' : 'outlined'}
    sx={{
      height: 26,
      borderRadius: 999,
      fontWeight: 700,
      borderColor: selected ? 'transparent' : 'divider',
      bgcolor: selected ? 'primary.main' : 'background.paper',
      color: selected ? 'primary.contrastText' : 'text.secondary',
      transition: 'background-color 140ms ease, border-color 140ms ease',
      '&:hover': {
        bgcolor: selected ? 'primary.dark' : 'primary.light',
        borderColor: selected ? 'transparent' : 'primary.main',
      },
      ...sx,
    }}
    {...props}
  />
);
