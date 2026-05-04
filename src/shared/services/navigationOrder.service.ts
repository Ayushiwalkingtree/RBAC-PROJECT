import { mockDbService } from '@/mock/services/mockDb.service';
import { apiClient, unwrapApiData, useMocks, type ApiEnvelope } from '@/shared/api/apiClient';
import { RESOURCE_TYPES } from '@/shared/constants/permission.constants';
import type { NavigationItem } from '@/shared/types/navigation.types';
import type { ResourceRecord } from '@/shared/types/rbac.types';

const navigableTypes = new Set<string>([
  RESOURCE_TYPES.menu,
  RESOURCE_TYPES.page,
  RESOURCE_TYPES.report,
  RESOURCE_TYPES.dashboard,
]);

const sortBySequence = (current: ResourceRecord, next: ResourceRecord): number =>
  (current.sequenceNo ?? 9999) - (next.sequenceNo ?? 9999) ||
  current.resourceName.localeCompare(next.resourceName);

const flattenNavigation = (items: NavigationItem[]): NavigationItem[] =>
  items.flatMap((item) => [item, ...flattenNavigation(item.children ?? [])]);

type BackendNavigationItem = {
  id: number | string;
  resource_key: string;
  label: string;
  path: string;
  parent_resource_key?: string | null;
  sequence_no?: number | null;
  icon?: string | null;
  type?: string | null;
  children?: BackendNavigationItem[];
};

const fallbackIconForResourceKey = (resourceKey: string): string => {
  const key = resourceKey.toUpperCase();
  if (key.includes('USER')) return 'users';
  if (key.includes('ROLE') || key.includes('ADMIN')) return 'roles';
  if (key.includes('PERM')) return 'permissions';
  if (key.includes('RESOURCE')) return 'resources';
  if (key.includes('REPORT') || key.includes('AUDIT')) return 'reports';
  if (key.includes('SETTING')) return 'settings';
  if (key.includes('TICKET')) return 'tickets';
  return 'dashboard';
};

const mapBackendNavigation = (items: BackendNavigationItem[]): NavigationItem[] =>
  items.map((item) => ({
    id: String(item.id),
    label: item.label,
    path: item.path || '/dashboard',
    icon: item.icon ?? fallbackIconForResourceKey(item.resource_key),
    type: (item.type ?? 'MENU') as NavigationItem['type'],
    sequenceNo: item.sequence_no ?? 9999,
    order: item.sequence_no ?? 9999,
    resourceKey: item.resource_key,
    parentResourceKey: item.parent_resource_key ?? undefined,
    children: mapBackendNavigation(item.children ?? []),
  }));

const collectSequenceUpdates = (
  items: NavigationItem[],
  parentResourceKey?: string,
): Array<Pick<ResourceRecord, 'id' | 'parentResourceKey' | 'sequenceNo'>> =>
  items.flatMap((item, index) => [
    {
      id: item.id,
      parentResourceKey,
      sequenceNo: (index + 1) * 10,
    },
    ...collectSequenceUpdates(item.children ?? [], item.resourceKey),
  ]);

const toNavigationOrderPayload = (navTree: NavigationItem[]) => {
  const itemById = new Map(flattenNavigation(navTree).map((item) => [item.id, item]));
  return {
    items: collectSequenceUpdates(navTree)
      .map((update) => ({
        resource_key: itemById.get(update.id)?.resourceKey,
        parent_resource_key: update.parentResourceKey ?? null,
        sequence_no: update.sequenceNo,
      }))
      .filter((item) => item.resource_key),
  };
};

export const navigationOrderService = {
  getNavigationTree: async (): Promise<NavigationItem[]> => {
    if (!useMocks) {
      const response = await apiClient.get<ApiEnvelope<BackendNavigationItem[]>>('/navigation/order');
      return mapBackendNavigation(unwrapApiData(response.data));
    }

    const resources = await navigationOrderService.getNavigationResources();
    const byKey = new Map(resources.map((resource) => [resource.resourceKey, resource]));
    const items: NavigationItem[] = resources.map((resource): NavigationItem => ({
      id: resource.id,
      label: resource.displayName ?? resource.resourceName,
      path: resource.uiPath ?? '/dashboard',
      icon: resource.icon ?? 'dashboard',
      type: resource.resourceType,
      sequenceNo: resource.sequenceNo ?? 9999,
      order: resource.sequenceNo ?? 9999,
      resourceKey: resource.resourceKey,
      parentResourceKey: resource.parentResourceKey,
      children: [],
    }));
    const itemByKey = new Map(items.map((item) => [item.resourceKey, item]));
    const roots: NavigationItem[] = [];
    items.forEach((item) => {
      if (item.parentResourceKey && byKey.has(item.parentResourceKey) && itemByKey.has(item.parentResourceKey)) {
        itemByKey.get(item.parentResourceKey)?.children?.push(item);
        return;
      }
      roots.push(item);
    });
    const sortTree = (tree: NavigationItem[]): NavigationItem[] =>
      tree.sort((a, b) => a.sequenceNo - b.sequenceNo).map((item) => ({ ...item, children: sortTree(item.children ?? []) }));
    return sortTree(roots);
  },

  getUserNavigationTree: async (userId: string): Promise<NavigationItem[]> => {
    if (!useMocks) {
      const response = await apiClient.get<ApiEnvelope<BackendNavigationItem[]>>(`/users/${userId}/navigation/order`);
      return mapBackendNavigation(unwrapApiData(response.data));
    }

    return navigationOrderService.getNavigationTree();
  },

  getNavigationResources: async (): Promise<ResourceRecord[]> => {
    const database = await mockDbService.getDatabase();
    return navigationOrderService.normalizeSequenceNumbers(
      database.resources.filter(
        (resource) =>
          resource.isActive &&
          resource.isUiVisible &&
          navigableTypes.has(resource.resourceType),
      ),
    );
  },

  reorderSiblings: (
    parentResourceKey: string | undefined,
    orderedResourceKeys: string[],
    resources: ResourceRecord[],
  ): ResourceRecord[] => {
    const sequenceByResourceKey = new Map(
      orderedResourceKeys.map((resourceKey, index) => [resourceKey, (index + 1) * 10]),
    );

    return resources.map((resource) => {
      if ((resource.parentResourceKey ?? '') !== (parentResourceKey ?? '')) {
        return resource;
      }

      const sequenceNo = sequenceByResourceKey.get(resource.resourceKey);
      return sequenceNo ? { ...resource, sequenceNo } : resource;
    });
  },

  updateNavigationOrder: (
    resources: ResourceRecord[],
    navTree: NavigationItem[],
  ): ResourceRecord[] => {
    const updatesById = new Map(
      collectSequenceUpdates(navTree).map((update) => [update.id, update]),
    );

    return resources.map((resource) => {
      const update = updatesById.get(resource.id);
      if (!update) {
        return resource;
      }

      return {
        ...resource,
        parentResourceKey: update.parentResourceKey,
        sequenceNo: update.sequenceNo,
      };
    });
  },

  persistNavigationOrder: async (navTree: NavigationItem[]): Promise<ResourceRecord[]> => {
    const updates = collectSequenceUpdates(navTree);
    if (!useMocks) {
      await apiClient.put('/navigation/order', toNavigationOrderPayload(navTree));
      return [];
    }
    const updateById = new Map(updates.map((update) => [update.id, update]));
    const database = await mockDbService.updateDatabase((currentDatabase) => ({
      ...currentDatabase,
      resources: currentDatabase.resources.map((resource) => {
        const update = updateById.get(resource.id);
        if (!update || !navigableTypes.has(resource.resourceType)) {
          return resource;
        }

        return {
          ...resource,
          parentResourceKey: update.parentResourceKey || undefined,
          sequenceNo: update.sequenceNo,
        };
      }),
    }));

    return database.resources;
  },

  persistUserNavigationOrder: async (userId: string, navTree: NavigationItem[]): Promise<ResourceRecord[]> => {
    if (!useMocks) {
      await apiClient.put(`/users/${userId}/navigation/order`, toNavigationOrderPayload(navTree));
      return [];
    }

    window.localStorage.setItem(`mock_user_nav_order_${userId}`, JSON.stringify(toNavigationOrderPayload(navTree)));
    return [];
  },

  normalizeSequenceNumbers: (resources: ResourceRecord[]): ResourceRecord[] => {
    const grouped = resources.reduce<Record<string, ResourceRecord[]>>((groups, resource) => {
      const parentKey = resource.parentResourceKey ?? '';
      return {
        ...groups,
        [parentKey]: [...(groups[parentKey] ?? []), resource],
      };
    }, {});
    const sequenceById = new Map<string, number>();

    Object.values(grouped).forEach((siblings) => {
      siblings.sort(sortBySequence).forEach((resource, index) => {
        sequenceById.set(resource.id, resource.sequenceNo ?? (index + 1) * 10);
      });
    });

    return resources.map((resource) => ({
      ...resource,
      sequenceNo: sequenceById.get(resource.id) ?? resource.sequenceNo ?? 9999,
    }));
  },

  flattenNavigation,
};
