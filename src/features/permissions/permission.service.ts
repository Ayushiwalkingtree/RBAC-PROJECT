import { mockDbService } from '@/mock/services/mockDb.service';
import type { ResourceRecord, Role } from '@/shared/types/rbac.types';

export type PermissionsMatrix = {
  roles: Role[];
  resources: ResourceRecord[];
};

export const permissionService = {
  getRolePermissionsMatrix: async (orgId: string): Promise<PermissionsMatrix> => {
    const database = await mockDbService.getDatabase();
    return {
      roles: database.roles.filter((role) => role.orgId === orgId),
      resources: database.resources,
    };
  },

  updateRolePermissions: async (roleId: string, permissions: Role['permissions']): Promise<Role> => {
    let updatedRole: Role | null = null;
    await mockDbService.updateDatabase((database) => {
      const resourcesByKey = new Map(database.resources.map((resource) => [resource.resourceKey, resource]));

      Object.entries(permissions).forEach(([resourceKey, grantedPermissions]) => {
        const resource = resourcesByKey.get(resourceKey);
        if (!resource) {
          throw new Error(`Unknown resource ${resourceKey}.`);
        }

        const allowed = new Set(resource.allowedPermissions.map((permission) => permission.key));
        const invalidPermission = grantedPermissions.find((permission) => !allowed.has(permission));
        if (invalidPermission) {
          throw new Error(`${invalidPermission} is not allowed for ${resourceKey}.`);
        }
      });

      return {
        ...database,
        roles: database.roles.map((role) => {
          if (role.id !== roleId) {
            return role;
          }

          updatedRole = { ...role, permissions };
          return updatedRole;
        }),
      };
    });

    if (!updatedRole) {
      throw new Error('Role was not found.');
    }

    return updatedRole;
  },
};
