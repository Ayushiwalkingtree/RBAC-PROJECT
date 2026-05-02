import { appendAuditLog, mockDbService } from '@/mock/services/mockDb.service';
import { createId } from '@/shared/utils/id';
import type { ResourceFormValues } from '@/features/resources/resource.schema';
import { normalizeResourceFormValues } from '@/features/resources/resourceForm.utils';
import { RESOURCE_TYPES } from '@/shared/constants/permission.constants';
import { slugifyResourceName } from '@/shared/services/navigation.service';
import type { ResourceRecord } from '@/shared/types/rbac.types';

type ResourceActor = {
  isPlatformSuperAdmin: boolean;
  userId?: string;
  email?: string;
};

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

  createResource: async (values: ResourceFormValues, actor?: ResourceActor): Promise<ResourceRecord> => {
    if (!actor?.isPlatformSuperAdmin) {
      throw new Error('Only platform super admin can manage resources.');
    }

    let createdResource: ResourceRecord | null = null;
    await mockDbService.updateDatabase((database) => {
      const resourceKey = normalizeKey(normalizeResourceFormValues(values).resource_key ?? '');
      const duplicate = database.resources.some((resource) => resource.resourceKey === resourceKey);
      if (duplicate) {
        throw new Error('Resource key already exists.');
      }

      createdResource = toResourceRecord(values);
      return appendAuditLog(
        { ...database, resources: [...database.resources, createdResource] },
        {
          orgId: 'org-platform',
          action: 'RESOURCE_CREATED',
          actorUserId: actor.userId,
          actorEmail: actor.email,
          resourceType: 'RESOURCE',
          resourceId: createdResource.id,
          resourceKey: createdResource.resourceKey,
          message: `${createdResource.resourceKey} was created.`,
        },
      );
    });

    if (!createdResource) {
      throw new Error('Unable to create resource.');
    }

    return createdResource;
  },

  updateResource: async (resourceId: string, values: ResourceFormValues, actor?: ResourceActor): Promise<ResourceRecord> => {
    if (!actor?.isPlatformSuperAdmin) {
      throw new Error('Only platform super admin can manage resources.');
    }

    let updatedResource: ResourceRecord | null = null;
    await mockDbService.updateDatabase((database) => {
      const resourceKey = normalizeKey(normalizeResourceFormValues(values).resource_key ?? '');
      const duplicate = database.resources.some(
        (resource) => resource.id !== resourceId && resource.resourceKey === resourceKey,
      );
      if (duplicate) {
        throw new Error('Resource key already exists.');
      }

      const nextDatabase = {
        ...database,
        resources: database.resources.map((resource) => {
          if (resource.id !== resourceId) {
            return resource;
          }

          updatedResource = toResourceRecord(values, resource);
          return updatedResource;
        }),
      };

      return appendAuditLog(nextDatabase, {
        orgId: 'org-platform',
        action: 'RESOURCE_UPDATED',
        actorUserId: actor.userId,
        actorEmail: actor.email,
        resourceType: 'RESOURCE',
        resourceId,
        resourceKey: updatedResource?.resourceKey,
        message: `${updatedResource?.resourceKey ?? resourceId} was updated.`,
      });
    });

    if (!updatedResource) {
      throw new Error('Resource was not found.');
    }

    return updatedResource;
  },

  deleteResource: async (resourceId: string, actor?: ResourceActor): Promise<void> => {
    if (!actor?.isPlatformSuperAdmin) {
      throw new Error('Only platform super admin can manage resources.');
    }

    await mockDbService.updateDatabase((database) => {
      const resource = database.resources.find((candidate) => candidate.id === resourceId);
      if (!resource) {
        throw new Error('Resource was not found.');
      }

      return appendAuditLog({
        ...database,
        resources: database.resources.filter((candidate) => candidate.id !== resourceId),
        roles: database.roles.map((role) => {
          const nextPermissions = { ...role.permissions };
          delete nextPermissions[resource.resourceKey];
          return { ...role, permissions: nextPermissions };
        }),
      }, {
        orgId: 'org-platform',
        action: 'RESOURCE_UPDATED',
        actorUserId: actor.userId,
        actorEmail: actor.email,
        resourceType: 'RESOURCE',
        resourceId,
        resourceKey: resource.resourceKey,
        message: `${resource.resourceKey} was deleted.`,
      });
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
