import { Chip } from '@mui/material';
import type { ResourceType } from '@/shared/constants/permission.constants';

const colorByType: Record<string, 'default' | 'primary' | 'secondary' | 'success' | 'info' | 'warning'> = {
  MENU: 'primary',
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
  <Chip label={type} size="small" color={colorByType[type] ?? 'default'} sx={{ fontWeight: 800 }} />
);
