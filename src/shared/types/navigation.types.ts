import type { PermissionRequirement } from '@/shared/types/rbac.types';

export type NavigationItem = {
  id: string;
  label: string;
  path: string;
  icon: string;
  order: number;
  requiredPermission: PermissionRequirement;
};
