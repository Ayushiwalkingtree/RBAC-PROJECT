import { ACTION_KEYS } from '@/shared/constants/permission.constants';
import type { ActionKey, ResourceKey } from '@/shared/constants/permission.constants';
import type { NavigationItem } from '@/shared/types/navigation.types';
import type { Permission, PermissionIndex } from '@/shared/types/rbac.types';

export const createPermissionIndex = (permissions: Permission[]): PermissionIndex =>
  permissions.reduce((index, permission) => {
    return {
      ...index,
      [permission.resource]: {
        ...index[permission.resource],
        [permission.action]: true,
      },
    };
  }, {} as PermissionIndex);

export const hasPermission = (
  permissions: Permission[],
  resource: ResourceKey,
  action: ActionKey,
): boolean => {
  const permissionIndex = createPermissionIndex(permissions);
  return Boolean(permissionIndex[resource]?.[action] || permissionIndex[resource]?.[ACTION_KEYS.manage]);
};

export const filterNavigationByPermissions = (
  navigation: NavigationItem[],
  permissions: Permission[],
): NavigationItem[] =>
  navigation
    .filter((item) =>
      hasPermission(
        permissions,
        item.requiredPermission.resource,
        item.requiredPermission.action,
      ),
    )
    .sort((current, next) => current.order - next.order);
