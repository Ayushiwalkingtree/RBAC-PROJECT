import { PERMISSION_KEYS, RESOURCE_KEYS } from '@/shared/constants/permission.constants';
import type { NavigationItem } from '@/shared/types/navigation.types';
import type { EffectivePermissions } from '@/shared/types/rbac.types';
import { canAccess } from '@/shared/utils/rbac';

const hasPermissionMatrixAccess = (permissions: EffectivePermissions): boolean =>
  canAccess(permissions, RESOURCE_KEYS.permissionGrantApi, PERMISSION_KEYS.read);

const canShowNavigationItem = (item: NavigationItem, permissions: EffectivePermissions): boolean => {
  if (item.resourceKey === RESOURCE_KEYS.permissionsMenu) {
    return hasPermissionMatrixAccess(permissions);
  }

  return true;
};

export const filterNavigationByEffectivePermissions = (
  items: NavigationItem[],
  permissions: EffectivePermissions,
): NavigationItem[] =>
  items.reduce<NavigationItem[]>((visibleItems, item) => {
      const children = filterNavigationByEffectivePermissions(item.children ?? [], permissions);
      const hadChildren = Boolean(item.children?.length);

      if (!canShowNavigationItem(item, permissions)) {
        return visibleItems;
      }

      if (item.resourceKey === RESOURCE_KEYS.adminMenu && hadChildren && children.length === 0) {
        return visibleItems;
      }

      visibleItems.push({
        ...item,
        children,
      });
      return visibleItems;
    }, []);
