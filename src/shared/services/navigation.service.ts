import { PERMISSION_KEYS, RESOURCE_TYPES } from '@/shared/constants/permission.constants';
import { canAccess } from '@/shared/utils/rbac';
import type { EffectivePermissions, ResourceRecord } from '@/shared/types/rbac.types';
import type { NavigationItem } from '@/shared/types/navigation.types';

const fallbackPathForResource = (resource: ResourceRecord): string => {
  const key = resource.resourceKey.toUpperCase();
  if (key.includes('DASH')) return '/dashboard';
  if (key.includes('USER')) return '/users';
  if (key.includes('ROLE') || key === 'ADMIN_MENU') return '/roles';
  if (key.includes('PERM')) return '/permissions';
  if (key.includes('RESOURCE')) return '/resource-registry';
  if (key.includes('NAV_PREVIEW')) return '/nav-preview';
  if (key.includes('REPORT')) return '/reports';
  if (key.includes('LOAN') || key.includes('TICKET')) return '/tickets';
  if (key.includes('SETTING')) return '/settings';
  return '/dashboard';
};

const fallbackIconForResource = (resource: ResourceRecord): string => {
  const key = resource.resourceKey.toUpperCase();
  if (key.includes('USER')) return 'users';
  if (key.includes('ROLE') || key === 'ADMIN_MENU') return 'roles';
  if (key.includes('PERM')) return 'permissions';
  if (key.includes('RESOURCE')) return 'resources';
  if (key.includes('REPORT')) return 'reports';
  if (key.includes('LOAN') || key.includes('TICKET')) return 'tickets';
  if (key.includes('SETTING')) return 'settings';
  if (key.includes('NAV_PREVIEW')) return 'preview';
  return 'dashboard';
};

const navigableTypes = new Set<string>([
  RESOURCE_TYPES.menu,
  RESOURCE_TYPES.page,
  RESOURCE_TYPES.dashboard,
  RESOURCE_TYPES.report,
]);

export const navigationService = {
  buildNavigation: (
    resources: ResourceRecord[],
    permissions: EffectivePermissions,
    orgCode?: string,
  ): NavigationItem[] => {
    const visibleResources = resources
      .filter(
        (resource) =>
          resource.isActive &&
          resource.isUiVisible &&
          navigableTypes.has(resource.resourceType) &&
          canAccess(permissions, resource.resourceKey, PERMISSION_KEYS.view) &&
          (resource.resourceKey !== 'RESOURCE_REGISTRY_MENU' ||
            orgCode === 'PLATFORM' ||
            canAccess(permissions, 'RESOURCE_MANAGE_API', PERMISSION_KEYS.create) ||
            canAccess(permissions, 'RESOURCE_MANAGE_API', PERMISSION_KEYS.update) ||
            canAccess(permissions, 'RESOURCE_MANAGE_API', PERMISSION_KEYS.delete)),
      )
      .sort((current, next) => (current.sequenceNo ?? 9999) - (next.sequenceNo ?? 9999));

    const items = visibleResources.map<NavigationItem>((resource) => ({
      id: resource.id,
      label: resource.resourceName,
      path: resource.uiPath ?? fallbackPathForResource(resource),
      icon: resource.icon ?? fallbackIconForResource(resource),
      order: resource.sequenceNo ?? 9999,
      resourceKey: resource.resourceKey,
      parentResourceKey: resource.parentResourceKey,
      children: [],
    }));

    const itemByResourceKey = new Map(items.map((item) => [item.resourceKey, item]));
    const roots: NavigationItem[] = [];

    items.forEach((item) => {
      if (item.parentResourceKey && itemByResourceKey.has(item.parentResourceKey)) {
        itemByResourceKey.get(item.parentResourceKey)?.children?.push(item);
        return;
      }

      roots.push(item);
    });

    return roots;
  },
};
