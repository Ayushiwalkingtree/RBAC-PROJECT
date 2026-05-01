import type { PermissionKey, ResourceKey, ResourceType } from '@/shared/constants/permission.constants';

export type ResourcePermissionDefinition = {
  key: PermissionKey;
  label: string;
};

export type ResourceRecord = {
  id: string;
  resourceKey: ResourceKey;
  resourceName: string;
  resourceType: ResourceType;
  resourceGroup: string;
  description: string;
  allowedPermissions: ResourcePermissionDefinition[];
  sequenceNo?: number;
  parentResourceKey?: ResourceKey;
  httpMethod?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  apiPath?: string;
  microservice?: string;
  isUiVisible: boolean;
  isActive: boolean;
  uiPath?: string;
  icon?: string;
};

export type RolePermissionGrants = Record<ResourceKey, PermissionKey[]>;

export type Role = {
  id: string;
  orgId: string;
  code: string;
  name: string;
  description: string;
  permissions: RolePermissionGrants;
  isSystem?: boolean;
};

export type PermissionRequirement = {
  resource: ResourceKey;
  permission: PermissionKey;
};

export type EffectivePermissions = RolePermissionGrants;
