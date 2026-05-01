import authData from '@/mock/data/auth.json';
import { mockDbService } from '@/mock/services/mockDb.service';
import { AUTH_CONFIG } from '@/shared/constants/app.constants';
import { mergeRolePermissions } from '@/shared/utils/rbac';
import { navigationService } from '@/shared/services/navigation.service';
import type { AuthSession, LoginCredentials, Organization, UserRecord } from '@/shared/types/auth.types';
import type { Role } from '@/shared/types/rbac.types';
import { createMockJwt } from './token.service';

const normalize = (value: string): string => value.trim().toLowerCase();

const buildSession = (
  user: UserRecord,
  org: Organization,
  allRoles: Role[],
  resources: AuthSession['resources'],
): AuthSession => {
  const userRoles = allRoles.filter(
    (role) => role.orgId === org.id && user.roleIds.includes(role.id),
  );
  const effectivePermissions = mergeRolePermissions(userRoles);
  const { token, refreshToken, expiresAt } = createMockJwt(user.id, org.id);

  return {
    accessToken: token,
    refreshToken,
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
      department: user.department,
      status: user.status,
      isDeleted: user.isDeleted,
      roles: userRoles.map((role) => role.name),
    },
    roles: userRoles,
    permissions: effectivePermissions,
    resources,
    navigation: navigationService.buildNavigation(resources, effectivePermissions, org.code),
  };
};

export const authService = {
  getDemoCredentials: () => authData.demoCredentials,

  login: async (credentials: LoginCredentials): Promise<AuthSession> => {
    const database = await mockDbService.getDatabase();
    const org = database.organizations.find(
      (candidate) => normalize(candidate.code) === normalize(credentials.org_code),
    );

    if (!org || org.status !== 'active') {
      throw new Error('Organization was not found or is not active.');
    }

    const user = database.users.find(
      (candidate) =>
        candidate.orgId === org.id &&
        !candidate.isDeleted &&
        normalize(candidate.email) === normalize(credentials.email) &&
        candidate.password === credentials.password,
    );

    if (!user || user.status !== 'active') {
      throw new Error('Invalid credentials for this organization.');
    }

    return buildSession(user, org, database.roles, database.resources);
  },

  refreshCurrentUserPermissions: async (session: AuthSession): Promise<AuthSession | null> => {
    const database = await mockDbService.getDatabase();
    const org = database.organizations.find((candidate) => candidate.id === session.org.id);
    const user = database.users.find(
      (candidate) => candidate.id === session.user.id && !candidate.isDeleted,
    );

    if (!org || !user || user.status !== 'active') {
      return null;
    }

    return buildSession(user, org, database.roles, database.resources);
  },
};
