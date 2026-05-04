import { appendAuditLog, mockDbService } from '@/mock/services/mockDb.service';
import { createId } from '@/shared/utils/id';
import { apiClient, unwrapApiData, useMocks, type ApiEnvelope } from '@/shared/api/apiClient';
import type { Role } from '@/shared/types/rbac.types';

const normalizeCode = (value: string): string => value.trim().toUpperCase();

export type RoleInput = {
  orgId: string;
  role_code: string;
  role_name: string;
  description: string;
  actorUserId?: string;
  actorEmail?: string;
};

type BackendRole = {
  id: number;
  role_id?: number | null;
  role_code: string;
  role_name: string;
  description?: string | null;
  is_system: boolean;
};

const mapBackendRole = (role: BackendRole, orgId: string): Role => ({
  id: String(role.role_id ?? role.id),
  orgId,
  code: role.role_code,
  name: role.role_name,
  description: role.description ?? '',
  permissions: {},
  isSystem: role.is_system,
});

export const roleService = {
  listRoles: async (orgId: string): Promise<Role[]> => {
    if (!useMocks) {
      const response = await apiClient.get<ApiEnvelope<BackendRole[]>>('/roles');
      return unwrapApiData(response.data).map((role) => mapBackendRole(role, orgId));
    }

    const database = await mockDbService.getDatabase();
    return database.roles.filter((role) => role.orgId === orgId);
  },

  createRole: async (input: RoleInput): Promise<Role> => {
    if (!useMocks) {
      const response = await apiClient.post<ApiEnvelope<BackendRole>>('/roles', {
        role_code: input.role_code,
        role_name: input.role_name,
        description: input.description,
      });
      return mapBackendRole(unwrapApiData(response.data), input.orgId);
    }

    let createdRole: Role | null = null;
    await mockDbService.updateDatabase((database) => {
      const duplicate = database.roles.some(
        (role) => role.orgId === input.orgId && normalizeCode(role.code) === normalizeCode(input.role_code),
      );

      if (duplicate) {
        throw new Error('Role code already exists in this organization.');
      }

      createdRole = {
        id: createId('role'),
        orgId: input.orgId,
        code: normalizeCode(input.role_code),
        name: input.role_name.trim(),
        description: input.description.trim(),
        permissions: {},
        isSystem: false,
      };

      return appendAuditLog(
        { ...database, roles: [...database.roles, createdRole] },
        {
          orgId: input.orgId,
          action: 'ROLE_CREATED',
          actorUserId: input.actorUserId,
          actorEmail: input.actorEmail,
          resourceType: 'ROLE',
          resourceId: createdRole.id,
          message: `${createdRole.code} role was created.`,
        },
      );
    });

    if (!createdRole) {
      throw new Error('Unable to create role.');
    }

    return createdRole;
  },

  updateRole: async (roleId: string, input: RoleInput): Promise<Role> => {
    if (!useMocks) {
      const response = await apiClient.put<ApiEnvelope<BackendRole>>(`/roles/${roleId}`, {
        role_code: input.role_code,
        role_name: input.role_name,
        description: input.description,
      });
      return mapBackendRole(unwrapApiData(response.data), input.orgId);
    }

    let updatedRole: Role | null = null;
    await mockDbService.updateDatabase((database) => {
      const duplicate = database.roles.some(
        (role) =>
          role.id !== roleId &&
          role.orgId === input.orgId &&
          normalizeCode(role.code) === normalizeCode(input.role_code),
      );

      if (duplicate) {
        throw new Error('Role code already exists in this organization.');
      }

      return {
        ...database,
        roles: database.roles.map((role) => {
          if (role.id !== roleId) {
            return role;
          }

          updatedRole = {
            ...role,
            code: normalizeCode(input.role_code),
            name: input.role_name.trim(),
            description: input.description.trim(),
          };

          return updatedRole;
        }),
      };
    });

    if (!updatedRole) {
      throw new Error('Role was not found.');
    }

    return updatedRole;
  },

  deleteRole: async (roleId: string): Promise<void> => {
    if (!useMocks) {
      const response = await apiClient.delete<ApiEnvelope<{ deleted: boolean }>>(`/roles/${roleId}`);
      unwrapApiData(response.data);
      return;
    }

    await mockDbService.updateDatabase((database) => {
      const role = database.roles.find((candidate) => candidate.id === roleId);
      if (!role) {
        throw new Error('Role was not found.');
      }

      if (role.isSystem) {
        throw new Error('System roles cannot be deleted.');
      }

      const assignedActiveUser = database.users.find(
        (user) => user.status === 'active' && !user.isDeleted && user.roleIds.includes(roleId),
      );

      if (assignedActiveUser) {
        throw new Error('Cannot delete a role assigned to active users.');
      }

      return {
        ...database,
        roles: database.roles.filter((candidate) => candidate.id !== roleId),
        users: database.users.map((user) => ({
          ...user,
          roleIds: user.roleIds.filter((id) => id !== roleId),
        })),
      };
    });
  },
};
