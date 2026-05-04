import { appendAuditLog, mockDbService } from '@/mock/services/mockDb.service';
import { roleService } from '@/features/roles/role.service';
import { ACTION_LABELS } from '@/shared/constants/permission.constants';
import { apiClient, unwrapApiData, useMocks, type ApiEnvelope } from '@/shared/api/apiClient';
import type { ResourceRecord, Role } from '@/shared/types/rbac.types';

export type PermissionsMatrix = {
  roles: Role[];
  resources: ResourceRecord[];
};

export type BackendRolePermissions = {
  role_id: number;
  role_code?: string;
  resources?: BackendMatrixResource[];
  permissions_json: Role['permissions'];
};

export type BackendMatrixResource = {
  resource_id: number;
  resource_key: string;
  resource_name: string;
  resource_type: string;
  resource_group: string;
  description?: string | null;
  sequence_no?: number | null;
  parent_resource_key?: string | null;
  http_method?: string | null;
  api_path?: string | null;
  microservice?: string | null;
  is_ui_visible?: boolean;
  available_permissions: Array<{
    key: string;
    label?: string | null;
    granted: boolean;
  }>;
};

export const mapMatrixResource = (resource: BackendMatrixResource): ResourceRecord => ({
  id: String(resource.resource_id),
  resourceKey: resource.resource_key,
  resourceName: resource.resource_name,
  resourceType: resource.resource_type as ResourceRecord['resourceType'],
  resourceGroup: resource.resource_group,
  description: resource.description ?? `${resource.resource_name} access`,
  displayName: resource.resource_name,
  displayCategory: resource.resource_group,
  allowedPermissions: resource.available_permissions.map((permission) => ({
    key: permission.key,
    label: permission.label ?? ACTION_LABELS[permission.key] ?? permission.key,
  })),
  sequenceNo: resource.sequence_no ?? undefined,
  parentResourceKey: resource.parent_resource_key ?? undefined,
  httpMethod: (resource.http_method ?? undefined) as ResourceRecord['httpMethod'],
  apiPath: resource.api_path ?? undefined,
  microservice: resource.microservice ?? undefined,
  isUiVisible: resource.is_ui_visible ?? false,
  isActive: true,
});

export const permissionsFromMatrix = (resources: BackendMatrixResource[] = []): Role['permissions'] =>
  resources.reduce<Role['permissions']>((grants, resource) => {
    const permissions = resource.available_permissions
      .filter((permission) => permission.granted)
      .map((permission) => permission.key);
    if (permissions.length > 0) {
      grants[resource.resource_key] = permissions;
    }
    return grants;
  }, {});

export const permissionService = {
  getRolePermissionsMatrix: async (orgId: string): Promise<PermissionsMatrix> => {
    if (!useMocks) {
      const roles = await roleService.listRoles(orgId);
      if (roles.length === 0) {
        return { roles: [], resources: [] };
      }
      const rolesWithPermissions = await Promise.all(
        roles.map(async (role) => {
          const response = await apiClient.get<ApiEnvelope<BackendRolePermissions>>(`/roles/${role.id}/permissions`);
          const payload = unwrapApiData(response.data);
          const permissions = payload.resources?.length
            ? permissionsFromMatrix(payload.resources)
            : payload.permissions_json ?? {};
          return {
            role: { ...role, permissions },
            resources: payload.resources ?? [],
          };
        }),
      );

      return {
        roles: rolesWithPermissions.map((item) => item.role),
        resources: rolesWithPermissions[0]?.resources.map(mapMatrixResource) ?? [],
      };
    }

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
    if (!useMocks) {
      const response = await apiClient.put<ApiEnvelope<BackendRolePermissions>>(`/roles/${roleId}/permissions`, {
        permissions_json: permissions,
      });
      const payload = unwrapApiData(response.data);
      return {
        id: String(payload.role_id),
        orgId: '',
        code: payload.role_code ?? '',
        name: payload.role_code ?? '',
        description: '',
        permissions: payload.resources?.length ? permissionsFromMatrix(payload.resources) : payload.permissions_json ?? {},
      };
    }

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
