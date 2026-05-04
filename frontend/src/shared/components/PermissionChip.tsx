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
      fontWeight: 700,
      transition: 'transform 140ms ease',
      '&:hover': { transform: 'translateY(-1px)' },
      '&:active': { transform: 'scale(0.96)' },
      ...sx,
    }}
    {...props}
  />
);
