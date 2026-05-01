import { mockDbService } from '@/mock/services/mockDb.service';
import { createId } from '@/shared/utils/id';
import type { ResourceFormValues } from '@/features/resources/resource.schema';
import { normalizeResourceFormValues } from '@/features/resources/resourceForm.utils';
import { RESOURCE_TYPES } from '@/shared/constants/permission.constants';
import { slugifyResourceName } from '@/shared/services/navigation.service';
import type { ResourceRecord } from '@/shared/types/rbac.types';

const normalizeKey = (value: string): string => value.trim().toUpperCase();

const routeForResourceKey = (resourceKey: string): string | undefined => {
  if (resourceKey.includes('DASH')) return '/dashboard';
  if (resourceKey.includes('USER')) return '/users';
  if (resourceKey.includes('TICKET') || resourceKey.includes('LOAN')) return '/tickets';
  if (resourceKey.includes('REPORT')) return '/reports';
  if (resourceKey.includes('ROLE') || resourceKey === 'ADMIN_MENU') return '/roles';
  if (resourceKey.includes('PERM')) return '/permissions';
  if (resourceKey.includes('RESOURCE')) return '/resource-registry';
  return undefined;
};

const routeForResource = (resource: Pick<ResourceRecord, 'resourceType' | 'resourceKey' | 'resourceName' | 'displayName'>): string | undefined => {
  const slug = slugifyResourceName(resource.displayName ?? resource.resourceName);
  if (resource.resourceType === RESOURCE_TYPES.report) return `/reports/${slug || resource.resourceKey.toLowerCase()}`;
  if (resource.resourceType === RESOURCE_TYPES.dashboard) return `/dashboard/${slug || resource.resourceKey.toLowerCase()}`;
  if (resource.resourceType === RESOURCE_TYPES.page || resource.resourceType === RESOURCE_TYPES.menu) return `/${slug || resource.resourceKey.toLowerCase()}`;
  return routeForResourceKey(resource.resourceKey);
};

const toResourceRecord = (values: ResourceFormValues, existing?: ResourceRecord): ResourceRecord => {
  const normalizedValues = normalizeResourceFormValues(values);
  const resourceKey = normalizeKey(normalizedValues.resource_key ?? '');

  return {
    id: existing?.id ?? createId('res'),
    resourceKey,
    resourceName: normalizedValues.resource_name.trim(),
    resourceType: normalizedValues.resource_type,
    resourceGroup: normalizedValues.resource_group.trim(),
    description: normalizedValues.description?.trim() || `${normalizedValues.resource_name.trim()} access`,
    displayName: normalizedValues.resource_name.trim(),
    displayCategory: normalizedValues.resource_group.trim(),
    allowedPermissions: normalizedValues.allowed_permissions.map((permission) => ({
      key: normalizeKey(permission.key),
      label: permission.label.trim(),
    })),
    sequenceNo: normalizedValues.sequence_no,
    parentResourceKey: normalizedValues.parent_resource_key ? normalizeKey(normalizedValues.parent_resource_key) : undefined,
    httpMethod: normalizedValues.http_method || undefined,
    apiPath: normalizedValues.api_path?.trim() || undefined,
    microservice: normalizedValues.microservice?.trim() || undefined,
    isUiVisible: normalizedValues.is_ui_visible,
    isActive: normalizedValues.is_active,
    uiPath: existing?.uiPath ?? routeForResource({
      resourceKey,
      resourceName: normalizedValues.resource_name,
      resourceType: normalizedValues.resource_type,
      displayName: normalizedValues.resource_name,
    }),
    icon: existing?.icon,
  };
};

export const resourceService = {
  listResources: async (): Promise<ResourceRecord[]> => {
    const database = await mockDbService.getDatabase();
    return database.resources;
  },

  createResource: async (values: ResourceFormValues): Promise<ResourceRecord> => {
    let createdResource: ResourceRecord | null = null;
    await mockDbService.updateDatabase((database) => {
      const resourceKey = normalizeKey(normalizeResourceFormValues(values).resource_key ?? '');
      const duplicate = database.resources.some((resource) => resource.resourceKey === resourceKey);
      if (duplicate) {
        throw new Error('Resource key already exists.');
      }

      createdResource = toResourceRecord(values);
      return { ...database, resources: [...database.resources, createdResource] };
    });

    if (!createdResource) {
      throw new Error('Unable to create resource.');
    }

    return createdResource;
  },

  updateResource: async (resourceId: string, values: ResourceFormValues): Promise<ResourceRecord> => {
    let updatedResource: ResourceRecord | null = null;
    await mockDbService.updateDatabase((database) => {
      const resourceKey = normalizeKey(normalizeResourceFormValues(values).resource_key ?? '');
      const duplicate = database.resources.some(
        (resource) => resource.id !== resourceId && resource.resourceKey === resourceKey,
      );
      if (duplicate) {
        throw new Error('Resource key already exists.');
      }

      return {
        ...database,
        resources: database.resources.map((resource) => {
          if (resource.id !== resourceId) {
            return resource;
          }

          updatedResource = toResourceRecord(values, resource);
          return updatedResource;
        }),
      };
    });

    if (!updatedResource) {
      throw new Error('Resource was not found.');
    }

    return updatedResource;
  },

  deleteResource: async (resourceId: string): Promise<void> => {
    await mockDbService.updateDatabase((database) => {
      const resource = database.resources.find((candidate) => candidate.id === resourceId);
      if (!resource) {
        throw new Error('Resource was not found.');
      }

      return {
        ...database,
        resources: database.resources.filter((candidate) => candidate.id !== resourceId),
        roles: database.roles.map((role) => {
          const nextPermissions = { ...role.permissions };
          delete nextPermissions[resource.resourceKey];
          return { ...role, permissions: nextPermissions };
        }),
      };
    });
  },

  updateNavigationOrder: async (
    updates: Array<Pick<ResourceRecord, 'id' | 'parentResourceKey' | 'sequenceNo'>>,
  ): Promise<ResourceRecord[]> => {
    const updateById = new Map(updates.map((update) => [update.id, update]));
    const database = await mockDbService.updateDatabase((currentDatabase) => ({
      ...currentDatabase,
      resources: currentDatabase.resources.map((resource) => {
        const update = updateById.get(resource.id);
        if (!update) {
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
};
