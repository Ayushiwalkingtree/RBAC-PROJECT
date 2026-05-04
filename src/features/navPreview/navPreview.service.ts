import { mockDbService } from '@/mock/services/mockDb.service';
import { apiClient, unwrapApiData, useMocks, type ApiEnvelope } from '@/shared/api/apiClient';
import { mergeRolePermissions } from '@/shared/utils/rbac';
import { navigationService } from '@/shared/services/navigation.service';
import type { UserRecord } from '@/shared/types/auth.types';
import type { NavigationItem } from '@/shared/types/navigation.types';
import type { EffectivePermissions, ResourceRecord } from '@/shared/types/rbac.types';
import type { ResourceType } from '@/shared/constants/permission.constants';

export type PreviewOrganization = {
  orgId: string;
  orgCode: string;
  orgName: string;
};

export type UserNavigationPreview = {
  user: UserRecord;
  roles: Array<{ id: string; code: string; name: string }>;
  permissions: EffectivePermissions;
  navigation: NavigationItem[];
  apiResources: ResourceRecord[];
};

type BackendOrganization = {
  org_id: number;
  org_code: string;
  org_name: string;
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
};

type BackendNavigationItem = {
  id: number | string;
  resource_key: string;
  label: string;
  path: string;
  parent_resource_key?: string | null;
  sequence_no?: number | null;
  icon?: string | null;
  type?: string | null;
  children?: BackendNavigationItem[];
};

type BackendApiResource = {
  id: number;
  resource_id?: number | null;
  resource_key: string;
  resource_name: string;
  resource_type: string;
  resource_group: string;
  description?: string | null;
  http_method?: string | null;
  api_path?: string | null;
  microservice?: string | null;
  is_ui_visible: boolean;
  is_active: boolean;
  sequence_no?: number | null;
  parent_resource_key?: string | null;
};

type BackendEffectiveAccess = {
  user: BackendUser;
  roles: BackendRole[];
  permissions: EffectivePermissions;
  nav: BackendNavigationItem[];
  api_resources?: BackendApiResource[];
};

const fallbackIconForResourceKey = (resourceKey: string): string => {
  const key = resourceKey.toUpperCase();
  if (key.includes('USER')) return 'users';
  if (key.includes('ROLE') || key.includes('ADMIN')) return 'roles';
  if (key.includes('PERM')) return 'permissions';
  if (key.includes('RESOURCE')) return 'resources';
  if (key.includes('REPORT') || key.includes('AUDIT')) return 'reports';
  if (key.includes('SETTING')) return 'settings';
  if (key.includes('TICKET')) return 'tickets';
  return 'dashboard';
};

const mapBackendNavigation = (items: BackendNavigationItem[]): NavigationItem[] =>
  items
    .map((item) => ({
      id: String(item.id),
      label: item.label,
      path: item.path || '/dashboard',
      icon: item.icon ?? fallbackIconForResourceKey(item.resource_key),
      type: (item.type ?? 'MENU') as ResourceType,
      sequenceNo: item.sequence_no ?? 9999,
      order: item.sequence_no ?? 9999,
      resourceKey: item.resource_key,
      parentResourceKey: item.parent_resource_key ?? undefined,
      children: mapBackendNavigation(item.children ?? []),
    }))
    .sort((current, next) => current.sequenceNo - next.sequenceNo);

const mapBackendUser = (user: BackendUser, orgId: string, orgCode = ''): UserRecord => ({
  id: String(user.user_id ?? user.id),
  orgId,
  orgCode,
  email: user.email,
  password: '',
  name: user.full_name,
  title: user.title ?? '',
  department: user.department ?? '',
  status: user.is_active ? 'active' : 'disabled',
  roleIds: user.role_ids.map(String),
  roleCodes: user.role_codes ?? [],
  isEmailVerified: user.is_email_verified,
});

const mapBackendApiResource = (resource: BackendApiResource): ResourceRecord => ({
  id: String(resource.resource_id ?? resource.id),
  resourceKey: resource.resource_key,
  resourceName: resource.resource_name,
  resourceType: resource.resource_type as ResourceRecord['resourceType'],
  resourceGroup: resource.resource_group,
  description: resource.description ?? resource.resource_name,
  allowedPermissions: [],
  sequenceNo: resource.sequence_no ?? undefined,
  parentResourceKey: resource.parent_resource_key ?? undefined,
  httpMethod: (resource.http_method ?? undefined) as ResourceRecord['httpMethod'],
  apiPath: resource.api_path ?? undefined,
  microservice: resource.microservice ?? undefined,
  isUiVisible: resource.is_ui_visible,
  isActive: resource.is_active,
});

const mapEffectiveAccess = (payload: BackendEffectiveAccess, orgId: string, orgCode = ''): UserNavigationPreview => ({
  user: mapBackendUser(payload.user, orgId, orgCode),
  roles: payload.roles.map((role) => ({
    id: String(role.role_id ?? role.id),
    code: role.role_code,
    name: role.role_name,
  })),
  permissions: payload.permissions,
  navigation: mapBackendNavigation(payload.nav),
  apiResources: (payload.api_resources ?? []).map(mapBackendApiResource),
});

export const navPreviewService = {
  listOrganizations: async (): Promise<PreviewOrganization[]> => {
    if (!useMocks) {
      const response = await apiClient.get<ApiEnvelope<BackendOrganization[]>>('/platform/organizations');
      return unwrapApiData(response.data).map((org) => ({
        orgId: String(org.org_id),
        orgCode: org.org_code,
        orgName: org.org_name,
      }));
    }

    const database = await mockDbService.getDatabase();
    return database.organizations
      .filter((org) => org.code !== 'PLATFORM')
      .map((org) => ({ orgId: org.id, orgCode: org.code, orgName: org.name }));
  },

  listUsers: async (orgId: string, orgCode = ''): Promise<UserRecord[]> => {
    if (!useMocks) {
      const response = await apiClient.get<ApiEnvelope<BackendUser[]>>('/users');
      return unwrapApiData(response.data).map((user) => mapBackendUser(user, orgId, orgCode));
    }

    const database = await mockDbService.getDatabase();
    const roleById = new Map(database.roles.map((role) => [role.id, role.code]));
    return database.users
      .filter((user) => user.orgId === orgId && !user.isDeleted)
      .map((user) => ({ ...user, roleCodes: user.roleIds.map((roleId) => roleById.get(roleId) ?? roleId) }));
  },

  listPlatformUsers: async (orgId: string, orgCode = ''): Promise<UserRecord[]> => {
    if (!useMocks) {
      const response = await apiClient.get<ApiEnvelope<BackendUser[]>>(`/platform/organizations/${orgId}/users`);
      return unwrapApiData(response.data).map((user) => mapBackendUser(user, orgId, orgCode));
    }

    return navPreviewService.listUsers(orgId, orgCode);
  },

  getPreview: async (userId: string, orgId: string, orgCode = ''): Promise<UserNavigationPreview> => {
    if (!useMocks) {
      const response = await apiClient.get<ApiEnvelope<BackendEffectiveAccess>>(`/users/${userId}/effective-access`);
      return mapEffectiveAccess(unwrapApiData(response.data), orgId, orgCode);
    }

    const database = await mockDbService.getDatabase();
    const user = database.users.find((candidate) => candidate.id === userId && !candidate.isDeleted);
    if (!user) {
      throw new Error('User was not found.');
    }

    const roles = database.roles.filter((role) => user.roleIds.includes(role.id));
    const permissions = mergeRolePermissions(roles);
    const apiResources = database.resources.filter(
      (resource) => resource.resourceType === 'API' && permissions[resource.resourceKey]?.length,
    );

    return {
      user,
      roles: roles.map((role) => ({ id: role.id, code: role.code, name: role.name })),
      permissions,
      navigation: navigationService.buildNavigation(database.resources, permissions, {
        orgCode: user.orgCode,
        roles: roles.map((role) => role.name),
      }),
      apiResources,
    };
  },

  getPlatformPreview: async (orgId: string, userId: string, orgCode = ''): Promise<UserNavigationPreview> => {
    if (!useMocks) {
      const response = await apiClient.get<ApiEnvelope<BackendEffectiveAccess>>(
        `/platform/organizations/${orgId}/users/${userId}/effective-access`,
      );
      return mapEffectiveAccess(unwrapApiData(response.data), orgId, orgCode);
    }

    return navPreviewService.getPreview(userId, orgId, orgCode);
  },
};
