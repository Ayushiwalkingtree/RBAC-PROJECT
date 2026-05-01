import authData from '@/mock/data/auth.json';
import navigationData from '@/mock/data/navigation.json';
import organizationsData from '@/mock/data/organizations.json';
import permissionsData from '@/mock/data/permissions.json';
import rolesData from '@/mock/data/roles.json';
import usersData from '@/mock/data/users.json';
import { AUTH_CONFIG } from '@/shared/constants/app.constants';
import { filterNavigationByPermissions } from '@/shared/utils/rbac';
import type { AuthSession, LoginCredentials, Organization, UserRecord } from '@/shared/types/auth.types';
import type { NavigationItem } from '@/shared/types/navigation.types';
import type { Permission, Role } from '@/shared/types/rbac.types';
import { createMockJwt } from './token.service';

const organizations = organizationsData as Organization[];
const users = usersData as UserRecord[];
const roles = rolesData as Role[];
const permissions = permissionsData as Permission[];
const navigation = navigationData as NavigationItem[];

const normalize = (value: string): string => value.trim().toLowerCase();

export const authService = {
  getDemoCredentials: () => authData.demoCredentials,

  login: async (credentials: LoginCredentials): Promise<AuthSession> => {
    await new Promise((resolve) => {
      window.setTimeout(resolve, 250);
    });

    const org = organizations.find(
      (candidate) => normalize(candidate.code) === normalize(credentials.org_code),
    );

    if (!org || org.status !== 'active') {
      throw new Error('Organization was not found or is not active.');
    }

    const user = users.find(
      (candidate) =>
        candidate.orgId === org.id &&
        normalize(candidate.email) === normalize(credentials.email) &&
        candidate.password === credentials.password,
    );

    if (!user || user.status !== 'active') {
      throw new Error('Invalid credentials for this organization.');
    }

    const userRoles = roles.filter(
      (role) => role.orgId === org.id && user.roleIds.includes(role.id),
    );
    const permissionIds = new Set(userRoles.flatMap((role) => role.permissionIds));
    const resolvedPermissions = permissions.filter((permission) => permissionIds.has(permission.id));
    const { token, expiresAt } = createMockJwt(user.id, org.id);

    return {
      accessToken: token,
      tokenType: AUTH_CONFIG.tokenType,
      expiresAt,
      org,
      user: {
        id: user.id,
        orgId: user.orgId,
        orgCode: user.orgCode,
        email: user.email,
        name: user.name,
        title: user.title,
        status: user.status,
        roles: userRoles.map((role) => role.name),
      },
      roles: userRoles,
      permissions: resolvedPermissions,
      navigation: filterNavigationByPermissions(navigation, resolvedPermissions),
    };
  },
};
