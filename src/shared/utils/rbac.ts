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
  const resourcePermissions = permissionIndex[resource];
  const readViewFallback =
    (action === ACTION_KEYS.view && resourcePermissions?.[ACTION_KEYS.read]) ||
    (action === ACTION_KEYS.read && resourcePermissions?.[ACTION_KEYS.view]);

  return Boolean(
    resourcePermissions?.[action] ||
      resourcePermissions?.[ACTION_KEYS.manage] ||
      readViewFallback,
  );
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
