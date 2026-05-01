import { mockDbService } from '@/mock/services/mockDb.service';
import type { Permission, Resource, Role } from '@/shared/types/rbac.types';

export type PermissionsMatrix = {
  roles: Role[];
  permissions: Permission[];
  resources: Resource[];
};

export const permissionService = {
  getRolePermissionsMatrix: async (orgId: string): Promise<PermissionsMatrix> => {
    const database = await mockDbService.getDatabase();
    return {
      roles: database.roles.filter((role) => role.orgId === orgId),
      permissions: database.permissions,
      resources: database.resources,
    };
  },

  updateRolePermissions: async (roleId: string, permissionIds: string[]): Promise<Role> => {
    let updatedRole: Role | null = null;
    await mockDbService.updateDatabase((database) => {
      const availablePermissionIds = new Set(database.permissions.map((permission) => permission.id));
      const invalidPermissionIds = permissionIds.filter((permissionId) => !availablePermissionIds.has(permissionId));

      if (invalidPermissionIds.length > 0) {
        throw new Error('Only valid permission keys can be saved.');
      }

      return {
        ...database,
        roles: database.roles.map((role) => {
          if (role.id !== roleId) {
            return role;
          }

          updatedRole = { ...role, permissionIds: [...new Set(permissionIds)] };
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
