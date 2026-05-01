import { mockDbService } from '@/mock/services/mockDb.service';
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

export const navigationOrderService = {
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
