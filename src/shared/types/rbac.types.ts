import type { ActionKey, ResourceKey } from '@/shared/constants/permission.constants';

export type Permission = {
  id: string;
  resource: ResourceKey;
  action: ActionKey;
  description: string;
};

export type Role = {
  id: string;
  orgId: string;
  code: string;
  name: string;
  description: string;
  permissionIds: string[];
  isSystem?: boolean;
};

export type Resource = {
  id: ResourceKey;
  label: string;
  description: string;
  group: string;
};

export type PermissionRequirement = {
  resource: ResourceKey;
  action: ActionKey;
};

export type PermissionIndex = Record<ResourceKey, Partial<Record<ActionKey, boolean>>>;
