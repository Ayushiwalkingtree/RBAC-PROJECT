import { appendAuditLog, mockDbService } from '@/mock/services/mockDb.service';
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

  updateRolePermissions: async (
    roleId: string,
    permissions: Role['permissions'],
    actor?: { userId?: string; email?: string },
  ): Promise<Role> => {
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

      const role = database.roles.find((candidate) => candidate.id === roleId);
      if (!role) {
        throw new Error('Role was not found.');
      }

      const nextPermissions = database.resources.reduce<Role['permissions']>((grants, resource) => {
        grants[resource.resourceKey] = permissions[resource.resourceKey] ?? [];
        return grants;
      }, {});

      return appendAuditLog(
        {
        ...database,
        roles: database.roles.map((role) => {
          if (role.id !== roleId) {
            return role;
          }

          updatedRole = { ...role, permissions: nextPermissions };
          return updatedRole;
        }),
        },
        {
          orgId: role.orgId,
          action: 'PERM_GRANTED',
          actorUserId: actor?.userId,
          actorEmail: actor?.email,
          resourceType: 'ROLE_PERMISSION',
          resourceId: roleId,
          message: `Permissions updated for ${role.code}.`,
        },
      );
    });

    if (!updatedRole) {
      throw new Error('Role was not found.');
    }

    return updatedRole;
  },
};
