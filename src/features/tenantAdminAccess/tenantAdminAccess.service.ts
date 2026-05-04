import { appendAuditLog, mockDbService } from '@/mock/services/mockDb.service';
import {
  mapMatrixResource,
  permissionsFromMatrix,
  type BackendRolePermissions,
} from '@/features/permissions/permission.service';
import { apiClient, unwrapApiData, useMocks, type ApiEnvelope } from '@/shared/api/apiClient';
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
    if (!useMocks) {
      const response = await apiClient.get<ApiEnvelope<BackendTenantAdminRow[]>>('/platform/tenant-admins');
      return unwrapApiData(response.data).map(mapTenantAdminRow);
    }

    const database = await mockDbService.getDatabase();
    return database.organizations
      .filter((org) => org.code !== 'PLATFORM')
      .flatMap((org) => {
        const adminRole = database.roles.find((role) => role.orgId === org.id && role.code === 'ORG_ADMIN');
        if (!adminRole) return [];
        return database.users
          .filter((user) => user.orgId === org.id && user.roleIds.includes(adminRole.id) && !user.isDeleted)
          .map((user) => ({
            orgId: org.id,
            orgCode: org.code,
            orgName: org.name,
            adminUserId: user.id,
            adminName: user.name,
            adminEmail: user.email,
            adminRoleId: adminRole.id,
            adminRoleCode: adminRole.code,
            isEmailVerified: Boolean(user.isEmailVerified),
            isActive: user.status === 'active',
            lastLoginAt: user.lastLoginAt ?? null,
            permissionsCount: Object.values(adminRole.permissions).reduce((total, grants) => total + grants.length, 0),
          }));
      });
  },

  getTenantAdminPermissions: async (orgId: string): Promise<TenantAdminAccessMatrix> => {
    if (!useMocks) {
      const response = await apiClient.get<ApiEnvelope<BackendRolePermissions>>(`/platform/tenant-admins/${orgId}/permissions`);
      return mapBackendMatrix(orgId, unwrapApiData(response.data));
    }

    const database = await mockDbService.getDatabase();
    const role = database.roles.find((candidate) => candidate.orgId === orgId && candidate.code === 'ORG_ADMIN');
    if (!role) {
      throw new Error('Tenant admin role was not found.');
    }
    return {
      orgId,
      roleId: role.id,
      roleCode: role.code,
      resources: database.resources,
      permissions: role.permissions,
    };
  },

  updateTenantAdminPermissions: async (
    orgId: string,
    permissions: RolePermissionGrants,
  ): Promise<TenantAdminAccessMatrix> => {
    if (!useMocks) {
      const response = await apiClient.put<ApiEnvelope<BackendRolePermissions>>(`/platform/tenant-admins/${orgId}/permissions`, {
        permissions_json: permissions,
      });
      return mapBackendMatrix(orgId, unwrapApiData(response.data));
    }

    const matrix = await tenantAdminAccessService.getTenantAdminPermissions(orgId);
    await mockDbService.updateDatabase((database) =>
      appendAuditLog(
        {
          ...database,
          roles: database.roles.map((role) =>
            role.id === matrix.roleId ? { ...role, permissions } : role,
          ),
        },
        {
          orgId,
          action: 'TENANT_ADMIN_PERMISSIONS_UPDATED',
          resourceType: 'ROLE_PERMISSION',
          resourceId: matrix.roleId,
          message: `Tenant admin permissions updated for ${matrix.roleCode}.`,
        },
      ),
    );
    return { ...matrix, permissions };
  },
};
