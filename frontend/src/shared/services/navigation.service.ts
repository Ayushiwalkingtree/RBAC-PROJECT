import { PERMISSION_KEYS, RESOURCE_TYPES } from '@/shared/constants/permission.constants';
import type { EffectivePermissions, ResourceRecord } from '@/shared/types/rbac.types';
import type { NavigationItem } from '@/shared/types/navigation.types';

export const slugifyResourceName = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-|-$/gu, '');

export const pathForResource = (resource: ResourceRecord): string => {
  if (resource.uiPath) return resource.uiPath;

  const slug = slugifyResourceName(resource.displayName ?? resource.resourceName);
  if (resource.resourceType === RESOURCE_TYPES.report) return `/reports/${slug || resource.resourceKey.toLowerCase()}`;
  if (resource.resourceType === RESOURCE_TYPES.dashboard) return `/dashboard/${slug || resource.resourceKey.toLowerCase()}`;
  if (resource.resourceType === RESOURCE_TYPES.menu || resource.resourceType === RESOURCE_TYPES.page) {
    return `/${slug || resource.resourceKey.toLowerCase()}`;
  }

  const key = resource.resourceKey.toUpperCase();
  if (key.includes('DASH')) return '/dashboard';
  if (key.includes('USER')) return '/users';
  if (key.includes('ROLE') || key === 'ADMIN_MENU') return '/roles';
  if (key.includes('PERM')) return '/permissions';
  if (key.includes('RESOURCE')) return '/resource-registry';
  if (key.includes('COMPONENT')) return '/components';
  if (key.includes('TENANT_ADMIN_ACCESS')) return '/tenant-admin-access';
  if (key.includes('AUDIT')) return '/audit-logs';
  if (key.includes('NAV_PREVIEW')) return '/nav-preview';
  if (key.includes('NAV_ORDER')) return '/navigation-order';
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
  if (key.includes('COMPONENT')) return 'widgets';
  if (key.includes('AUDIT')) return 'reports';
  if (key.includes('REPORT')) return 'reports';
  if (key.includes('LOAN') || key.includes('TICKET')) return 'tickets';
  if (key.includes('SETTING')) return 'settings';
  if (key.includes('NAV_PREVIEW')) return 'preview';
  if (key.includes('NAV_ORDER')) return 'preview';
  return 'dashboard';
};

const navigableTypes = new Set<string>([
  RESOURCE_TYPES.menu,
  RESOURCE_TYPES.page,
  RESOURCE_TYPES.dashboard,
  RESOURCE_TYPES.report,
]);

const bySequence = (current: NavigationItem, next: NavigationItem): number =>
  current.sequenceNo - next.sequenceNo;

const toNavigationItem = (resource: ResourceRecord): NavigationItem => ({
  id: resource.id,
  label: resource.displayName ?? resource.resourceName,
  path: pathForResource(resource),
  icon: resource.icon ?? fallbackIconForResource(resource),
  type: resource.resourceType,
  sequenceNo: resource.sequenceNo ?? 9999,
  order: resource.sequenceNo ?? 9999,
  resourceKey: resource.resourceKey,
  parentResourceKey: resource.parentResourceKey,
  children: [],
});

export const navigationService = {
  buildNavigation: (
    resources: ResourceRecord[],
    permissions: EffectivePermissions,
  ): NavigationItem[] => {
    const navigableResources = resources.filter(
      (resource) =>
        resource.isActive &&
        resource.isUiVisible &&
        navigableTypes.has(resource.resourceType),
    );
    const resourcesByKey = new Map(navigableResources.map((resource) => [resource.resourceKey, resource]));
    const visibleResourceKeys = new Set<string>();

    navigableResources.forEach((resource) => {
      if ((permissions[resource.resourceKey.toUpperCase()] ?? []).includes(PERMISSION_KEYS.view)) {
        visibleResourceKeys.add(resource.resourceKey);
        let parentKey = resource.parentResourceKey;
        while (parentKey && resourcesByKey.has(parentKey)) {
          visibleResourceKeys.add(parentKey);
          parentKey = resourcesByKey.get(parentKey)?.parentResourceKey;
        }
      }
    });

    const items = navigableResources
      .filter((resource) => visibleResourceKeys.has(resource.resourceKey))
      .map(toNavigationItem);

    const itemByResourceKey = new Map(items.map((item) => [item.resourceKey, item]));
    const roots: NavigationItem[] = [];

    items.forEach((item) => {
      if (item.parentResourceKey && itemByResourceKey.has(item.parentResourceKey)) {
        itemByResourceKey.get(item.parentResourceKey)?.children?.push(item);
        return;
      }

      roots.push(item);
    });

    const sortTree = (itemsToSort: NavigationItem[]): NavigationItem[] =>
      itemsToSort.sort(bySequence).map((item) => ({
        ...item,
        children: item.children ? sortTree(item.children) : [],
      }));

    return sortTree(roots);
  },
};
