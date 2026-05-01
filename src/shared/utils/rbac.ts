import { PERMISSION_KEYS } from '@/shared/constants/permission.constants';
import type { PermissionKey, ResourceKey } from '@/shared/constants/permission.constants';
import type { EffectivePermissions, Role } from '@/shared/types/rbac.types';

export const normalizePermissionKey = (permission: PermissionKey): string =>
  permission.trim().toUpperCase();

export const normalizeResourceKey = (resource: ResourceKey): string => resource.trim().toUpperCase();

export const mergeRolePermissions = (roles: Role[]): EffectivePermissions =>
  roles.reduce<EffectivePermissions>((merged, role) => {
    Object.entries(role.permissions).forEach(([resourceKey, permissionKeys]) => {
      const normalizedResourceKey = normalizeResourceKey(resourceKey);
      const currentPermissions = new Set(merged[normalizedResourceKey] ?? []);
      permissionKeys.forEach((permissionKey) => {
        currentPermissions.add(normalizePermissionKey(permissionKey));
      });
      merged[normalizedResourceKey] = [...currentPermissions].sort();
    });

    return merged;
  }, {});

export const canAccess = (
  permissions: EffectivePermissions,
  resource: ResourceKey,
  permission: PermissionKey,
): boolean => {
  const resourcePermissions = permissions[normalizeResourceKey(resource)] ?? [];
  const normalizedPermission = normalizePermissionKey(permission);
  return (
    resourcePermissions.includes(normalizedPermission) ||
    (normalizedPermission === PERMISSION_KEYS.view && resourcePermissions.includes(PERMISSION_KEYS.read)) ||
    (normalizedPermission === PERMISSION_KEYS.read && resourcePermissions.includes(PERMISSION_KEYS.view))
  );
};

export const canAny = (
  permissions: EffectivePermissions,
  requirements: ReadonlyArray<{ resource: ResourceKey; permission: PermissionKey }>,
): boolean => requirements.some((requirement) => canAccess(permissions, requirement.resource, requirement.permission));

export const canAll = (
  permissions: EffectivePermissions,
  requirements: ReadonlyArray<{ resource: ResourceKey; permission: PermissionKey }>,
): boolean => requirements.every((requirement) => canAccess(permissions, requirement.resource, requirement.permission));
