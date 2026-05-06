import { Chip } from '@mui/material';
import type { ResourceType } from '@/shared/constants/permission.constants';

const colorByType: Record<string, 'default' | 'primary' | 'secondary' | 'success' | 'info' | 'warning'> = {
  MENU: 'primary',
  PAGE: 'info',
  API: 'secondary',
  BUTTON: 'success',
  ACTION: 'warning',
  REPORT: 'info',
  DASHBOARD: 'default',
};

type ResourceTypeBadgeProps = {
  type: ResourceType;
};

export const ResourceTypeBadge = ({ type }: ResourceTypeBadgeProps) => (
  <Chip
    label={type}
    size="small"
    color={colorByType[type] ?? 'default'}
    variant="outlined"
    sx={{
      height: 24,
      borderRadius: 999,
      fontSize: '0.7rem',
      fontWeight: 800,
      bgcolor: 'background.paper',
    }}
  />
);
