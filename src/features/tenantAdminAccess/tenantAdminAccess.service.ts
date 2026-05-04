import {
  mapMatrixResource,
  permissionsFromMatrix,
  type BackendRolePermissions,
} from '@/features/permissions/permission.service';
import { apiClient, unwrapApiData, type ApiEnvelope } from '@/shared/api/apiClient';
import type { ResourceRecord, RolePermissionGrants } from '@/shared/types/rbac.types';

export type TenantAdminRow = {
  orgId: string;
  orgCode: string;
  orgName: string;
  adminUserId: string;
  adminName: string;
  adminEmail: string;
  adminRoleId: string;
  adminRoleCode: string;
  isEmailVerified: boolean;
  isActive: boolean;
  lastLoginAt?: string | null;
  permissionsCount: number;
};

export type TenantAdminAccessMatrix = {
  orgId: string;
  roleId: string;
  roleCode: string;
  resources: ResourceRecord[];
  permissions: RolePermissionGrants;
};

type BackendTenantAdminRow = {
  org_id: number;
  org_code: string;
  org_name: string;
  admin_user_id: number;
  admin_name: string;
  admin_email: string;
  admin_role_id: number;
  admin_role_code: string;
  is_email_verified: boolean;
  is_active: boolean;
  last_login_at?: string | null;
  permissions_count: number;
};

const mapTenantAdminRow = (row: BackendTenantAdminRow): TenantAdminRow => ({
  orgId: String(row.org_id),
  orgCode: row.org_code,
  orgName: row.org_name,
  adminUserId: String(row.admin_user_id),
  adminName: row.admin_name,
  adminEmail: row.admin_email,
  adminRoleId: String(row.admin_role_id),
  adminRoleCode: row.admin_role_code,
  isEmailVerified: row.is_email_verified,
  isActive: row.is_active,
  lastLoginAt: row.last_login_at ?? null,
  permissionsCount: row.permissions_count,
});

const mapBackendMatrix = (orgId: string, payload: BackendRolePermissions): TenantAdminAccessMatrix => ({
  orgId,
  roleId: String(payload.role_id),
  roleCode: payload.role_code ?? 'ORG_ADMIN',
  resources: (payload.resources ?? []).map(mapMatrixResource),
  permissions: payload.resources?.length ? permissionsFromMatrix(payload.resources) : payload.permissions_json ?? {},
});

export const tenantAdminAccessService = {
  listTenantAdmins: async (): Promise<TenantAdminRow[]> => {
    const response = await apiClient.get<ApiEnvelope<BackendTenantAdminRow[]>>('/platform/tenant-admins');
    return unwrapApiData(response.data).map(mapTenantAdminRow);
  },

  getTenantAdminPermissions: async (orgId: string): Promise<TenantAdminAccessMatrix> => {
    const response = await apiClient.get<ApiEnvelope<BackendRolePermissions>>(`/platform/tenant-admins/${orgId}/permissions`);
    return mapBackendMatrix(orgId, unwrapApiData(response.data));
  },

  updateTenantAdminPermissions: async (
    orgId: string,
    permissions: RolePermissionGrants,
  ): Promise<TenantAdminAccessMatrix> => {
    const response = await apiClient.put<ApiEnvelope<BackendRolePermissions>>(`/platform/tenant-admins/${orgId}/permissions`, {
      permissions_json: permissions,
    });
    return mapBackendMatrix(orgId, unwrapApiData(response.data));
  },
};
