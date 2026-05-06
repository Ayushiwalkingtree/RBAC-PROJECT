import {
  mapMatrixResource,
  permissionsFromMatrix,
  type BackendRolePermissions,
} from '@/features/permissions/permission.service';
import { normalizePermissionMatrixDependencies } from '@/shared/adapters/rbacDisplay.adapter';
import { apiClient, unwrapApiData, type ApiEnvelope } from '@/shared/api/apiClient';
import type { UserRecord } from '@/shared/types/auth.types';
import type { ResourceRecord, Role, RolePermissionGrants } from '@/shared/types/rbac.types';

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

export type TenantAccessOrganization = {
  orgId: string;
  orgCode: string;
  orgName: string;
  isVerified: boolean;
  isActive: boolean;
};

type BackendOrganization = {
  org_id: number;
  org_code: string;
  org_name: string;
  is_verified: boolean;
  is_active: boolean;
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

type BackendUser = {
  id: number;
  user_id?: number | null;
  email: string;
  full_name: string;
  title?: string | null;
  department?: string | null;
  is_active: boolean;
  is_email_verified: boolean;
  role_ids: number[];
  role_codes?: string[];
};

type BackendRole = {
  id: number;
  role_id?: number | null;
  role_code: string;
  role_name: string;
  description?: string | null;
  is_system: boolean;
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

const mapOrganization = (org: BackendOrganization): TenantAccessOrganization => ({
  orgId: String(org.org_id),
  orgCode: org.org_code,
  orgName: org.org_name,
  isVerified: org.is_verified,
  isActive: org.is_active,
});

const mapTenantUser = (user: BackendUser, orgId: string, orgCode = ''): UserRecord => ({
  id: String(user.user_id ?? user.id),
  orgId,
  orgCode,
  email: user.email,
  password: '',
  name: user.full_name,
  title: user.title ?? user.department ?? '',
  department: user.department ?? '',
  status: user.is_active ? 'active' : 'disabled',
  roleIds: user.role_ids.map(String),
  roleCodes: user.role_codes,
  isDeleted: false,
  isEmailVerified: user.is_email_verified,
});

const mapTenantRole = (role: BackendRole, orgId: string): Role => ({
  id: String(role.role_id ?? role.id),
  orgId,
  code: role.role_code,
  name: role.role_name,
  description: role.description ?? '',
  permissions: {},
  isSystem: role.is_system,
});

const mapBackendMatrix = (orgId: string, payload: BackendRolePermissions): TenantAdminAccessMatrix => ({
  orgId,
  roleId: String(payload.role_id),
  roleCode: payload.role_code ?? 'ORG_ADMIN',
  resources: (payload.resources ?? []).map(mapMatrixResource),
  permissions: payload.resources?.length
    ? permissionsFromMatrix(payload.resources)
    : normalizePermissionMatrixDependencies(payload.permissions_json ?? {}),
});

export const tenantAdminAccessService = {
  listOrganizations: async (): Promise<TenantAccessOrganization[]> => {
    const response = await apiClient.get<ApiEnvelope<BackendOrganization[]>>('/tenant-access/organizations');
    return unwrapApiData(response.data).map(mapOrganization);
  },

  listTenantAdmins: async (): Promise<TenantAdminRow[]> => {
    const response = await apiClient.get<ApiEnvelope<BackendTenantAdminRow[]>>('/platform/tenant-admins');
    return unwrapApiData(response.data).map(mapTenantAdminRow);
  },

  listOrganizationUsers: async (orgId: string, orgCode = ''): Promise<UserRecord[]> => {
    const response = await apiClient.get<ApiEnvelope<BackendUser[]>>(`/tenant-access/organizations/${orgId}/users`);
    return unwrapApiData(response.data).map((user) => mapTenantUser(user, orgId, orgCode));
  },

  listOrganizationRoles: async (orgId: string): Promise<Role[]> => {
    const response = await apiClient.get<ApiEnvelope<BackendRole[]>>(`/tenant-access/organizations/${orgId}/roles`);
    return unwrapApiData(response.data).map((role) => mapTenantRole(role, orgId));
  },

  getTenantAdminPermissions: async (orgId: string): Promise<TenantAdminAccessMatrix> => {
    const response = await apiClient.get<ApiEnvelope<BackendRolePermissions>>(`/platform/tenant-admins/${orgId}/permissions`);
    return mapBackendMatrix(orgId, unwrapApiData(response.data));
  },

  updateTenantAdminPermissions: async (
    orgId: string,
    permissions: RolePermissionGrants,
  ): Promise<TenantAdminAccessMatrix> => {
    const normalizedPermissions = normalizePermissionMatrixDependencies(permissions);
    const response = await apiClient.put<ApiEnvelope<BackendRolePermissions>>(`/platform/tenant-admins/${orgId}/permissions`, {
      permissions_json: normalizedPermissions,
    });
    return mapBackendMatrix(orgId, unwrapApiData(response.data));
  },
};
