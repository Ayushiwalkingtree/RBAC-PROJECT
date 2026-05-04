import { apiClient, unwrapApiData, type ApiEnvelope } from '@/shared/api/apiClient';
import type { Role } from '@/shared/types/rbac.types';

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
    const response = await apiClient.get<ApiEnvelope<BackendRole[]>>('/roles');
    return unwrapApiData(response.data).map((role) => mapBackendRole(role, orgId));
  },

  createRole: async (input: RoleInput): Promise<Role> => {
    const response = await apiClient.post<ApiEnvelope<BackendRole>>('/roles', {
      role_code: input.role_code,
      role_name: input.role_name,
      description: input.description,
    });
    return mapBackendRole(unwrapApiData(response.data), input.orgId);
  },

  updateRole: async (roleId: string, input: RoleInput): Promise<Role> => {
    const response = await apiClient.put<ApiEnvelope<BackendRole>>(`/roles/${roleId}`, {
      role_code: input.role_code,
      role_name: input.role_name,
      description: input.description,
    });
    return mapBackendRole(unwrapApiData(response.data), input.orgId);
  },

  deleteRole: async (roleId: string): Promise<void> => {
    const response = await apiClient.delete<ApiEnvelope<{ deleted: boolean }>>(`/roles/${roleId}`);
    unwrapApiData(response.data);
  },
};
