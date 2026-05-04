import { apiClient, unwrapApiData, type ApiEnvelope } from '@/shared/api/apiClient';
import type { NavigationItem } from '@/shared/types/navigation.types';
import type { ResourceRecord } from '@/shared/types/rbac.types';

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
    const response = await apiClient.get<ApiEnvelope<BackendNavigationItem[]>>('/navigation/order');
    return mapBackendNavigation(unwrapApiData(response.data));
  },

  getUserNavigationTree: async (userId: string): Promise<NavigationItem[]> => {
    const response = await apiClient.get<ApiEnvelope<BackendNavigationItem[]>>(`/users/${userId}/navigation/order`);
    return mapBackendNavigation(unwrapApiData(response.data));
  },

  persistNavigationOrder: async (navTree: NavigationItem[]): Promise<ResourceRecord[]> => {
    await apiClient.put('/navigation/order', toNavigationOrderPayload(navTree));
    return [];
  },

  persistUserNavigationOrder: async (userId: string, navTree: NavigationItem[]): Promise<ResourceRecord[]> => {
    await apiClient.put(`/users/${userId}/navigation/order`, toNavigationOrderPayload(navTree));
    return [];
  },

  flattenNavigation,
};
