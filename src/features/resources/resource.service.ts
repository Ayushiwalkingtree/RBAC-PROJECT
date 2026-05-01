import { mockDbService } from '@/mock/services/mockDb.service';
import { createId } from '@/shared/utils/id';
import type { ResourceFormValues } from '@/features/resources/resource.schema';
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

const toResourceRecord = (values: ResourceFormValues, existing?: ResourceRecord): ResourceRecord => {
  const resourceKey = normalizeKey(values.resource_key);

  return {
    id: existing?.id ?? createId('res'),
    resourceKey,
    resourceName: values.resource_name.trim(),
    resourceType: values.resource_type,
    resourceGroup: values.resource_group.trim(),
    description: values.description.trim(),
    allowedPermissions: values.allowed_permissions.map((permission) => ({
      key: normalizeKey(permission.key),
      label: permission.label.trim(),
    })),
    sequenceNo: values.sequence_no,
    parentResourceKey: values.parent_resource_key ? normalizeKey(values.parent_resource_key) : undefined,
    httpMethod: values.http_method || undefined,
    apiPath: values.api_path?.trim() || undefined,
    microservice: values.microservice?.trim() || undefined,
    isUiVisible: values.is_ui_visible,
    isActive: values.is_active,
    uiPath: existing?.uiPath ?? routeForResourceKey(resourceKey),
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
      const resourceKey = normalizeKey(values.resource_key);
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
      const resourceKey = normalizeKey(values.resource_key);
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
};
