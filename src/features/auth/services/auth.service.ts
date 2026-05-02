import authData from '@/mock/data/auth.json';
import { appendAuditLog, mockDbService } from '@/mock/services/mockDb.service';
import { AUTH_CONFIG } from '@/shared/constants/app.constants';
import { PERMISSION_KEYS, RESOURCE_KEYS } from '@/shared/constants/permission.constants';
import { mergeRolePermissions } from '@/shared/utils/rbac';
import { navigationService } from '@/shared/services/navigation.service';
import { createId } from '@/shared/utils/id';
import { apiClient, unwrapApiData, useMocks, type ApiEnvelope } from '@/shared/api/apiClient';
import type { AuthSession, LoginCredentials, Organization, SignupInput, SignupResult, UserRecord } from '@/shared/types/auth.types';
import type { RefreshTokenRecord } from '@/shared/types/domain.types';
import type { ResourceRecord, Role } from '@/shared/types/rbac.types';
import type { NavigationItem } from '@/shared/types/navigation.types';
import type { ResourceType } from '@/shared/constants/permission.constants';
import { createMockJwt } from './token.service';

const normalize = (value: string): string => value.trim().toLowerCase();
const normalizeCode = (value: string): string => value.trim().toUpperCase().replace(/\s+/g, '_');

const passwordPolicyMessage = 'Password must be 8+ chars with uppercase, number, and special character.';

type BackendOrganizationPublic = {
  org_id: number;
  org_name: string;
  org_code: string;
};

type BackendSignupResponse = {
  organization_id: number;
  org_code: string;
  admin_user_id: number;
  admin_role_code: string;
  message: string;
  verification_token?: string | null;
};

type BackendAuthResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_at: string;
  user: {
    id: number;
    email: string;
    full_name: string;
    is_email_verified: boolean;
    is_active: boolean;
  };
  org: {
    id: number;
    org_code: string;
    org_name: string;
  };
  roles: string[];
  perms: Record<string, string[]>;
  nav: BackendNavigationItem[];
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

export const validatePasswordPolicy = (password: string): void => {
  if (
    password.length < 8 ||
    !/[A-Z]/u.test(password) ||
    !/[0-9]/u.test(password) ||
    !/[^A-Za-z0-9]/u.test(password)
  ) {
    throw new Error(passwordPolicyMessage);
  }
};

const coreOrgAdminPermissions: Role['permissions'] = {
  [RESOURCE_KEYS.userListApi]: [PERMISSION_KEYS.read],
  [RESOURCE_KEYS.userCreateApi]: [PERMISSION_KEYS.execute],
  [RESOURCE_KEYS.userUpdateApi]: [PERMISSION_KEYS.execute],
  [RESOURCE_KEYS.userDeleteApi]: [PERMISSION_KEYS.execute],
  [RESOURCE_KEYS.roleManageApi]: [
    PERMISSION_KEYS.create,
    PERMISSION_KEYS.read,
    PERMISSION_KEYS.update,
    PERMISSION_KEYS.delete,
  ],
  [RESOURCE_KEYS.permissionGrantApi]: [PERMISSION_KEYS.read, PERMISSION_KEYS.configure],
  [RESOURCE_KEYS.orgSettings]: [PERMISSION_KEYS.view, PERMISSION_KEYS.update],
  [RESOURCE_KEYS.auditLogApi]: [PERMISSION_KEYS.read],
  [RESOURCE_KEYS.userMenu]: [
    PERMISSION_KEYS.view,
    PERMISSION_KEYS.create,
    PERMISSION_KEYS.read,
    PERMISSION_KEYS.update,
    PERMISSION_KEYS.delete,
  ],
  [RESOURCE_KEYS.adminMenu]: [PERMISSION_KEYS.view],
  [RESOURCE_KEYS.auditLogsMenu]: [PERMISSION_KEYS.view],
  [RESOURCE_KEYS.permissionsMenu]: [PERMISSION_KEYS.view],
};

const buildSession = (
  user: UserRecord,
  org: Organization,
  allRoles: Role[],
  resources: AuthSession['resources'],
  tokenBundle = createMockJwt(user.id, org.id),
): AuthSession => {
  const userRoles = allRoles.filter(
    (role) => role.orgId === org.id && user.roleIds.includes(role.id),
  );
  const effectivePermissions = mergeRolePermissions(userRoles);
  const { token, refreshToken, expiresAt } = tokenBundle;

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
    navigation: navigationService.buildNavigation(resources, effectivePermissions, {
      orgCode: user.orgCode,
      roles: userRoles.map((role) => role.name),
    }),
  };
};

const fallbackIconForResourceKey = (resourceKey: string): string => {
  const key = resourceKey.toUpperCase();
  if (key.includes('USER')) return 'users';
  if (key.includes('ROLE') || key.includes('ADMIN')) return 'roles';
  if (key.includes('PERM')) return 'permissions';
  if (key.includes('RESOURCE')) return 'resources';
  if (key.includes('REPORT') || key.includes('AUDIT')) return 'reports';
  if (key.includes('SETTING') || key.includes('ORG_SETTINGS')) return 'settings';
  return 'dashboard';
};

const mapBackendNavigation = (items: BackendNavigationItem[]): NavigationItem[] =>
  items.map((item) => ({
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
  }));

const mapBackendAuthSession = (payload: BackendAuthResponse): AuthSession => {
  const org: Organization = {
    id: String(payload.org.id),
    code: payload.org.org_code,
    name: payload.org.org_name,
    status: 'active',
  };
  const roles: Role[] = payload.roles.map((roleCode) => ({
    id: `${payload.org.id}-${roleCode}`,
    orgId: String(payload.org.id),
    code: roleCode,
    name: roleCode.replaceAll('_', ' '),
    description: roleCode,
    permissions: {},
    isSystem: roleCode === 'ORG_ADMIN' || roleCode === 'SUPER_ADMIN',
  }));

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    tokenType: payload.token_type,
    expiresAt: payload.expires_at,
    org,
    user: {
      id: String(payload.user.id),
      orgId: String(payload.org.id),
      orgCode: payload.org.org_code,
      email: payload.user.email,
      name: payload.user.full_name,
      title: payload.roles.includes('SUPER_ADMIN') ? 'Platform Super Admin' : 'Organization User',
      department: '',
      status: payload.user.is_active ? 'active' : 'disabled',
      isDeleted: false,
      isEmailVerified: payload.user.is_email_verified,
      roles: payload.roles,
    },
    roles,
    permissions: payload.perms,
    resources: [] as ResourceRecord[],
    navigation: mapBackendNavigation(payload.nav),
  };
};

export const authService = {
  getDemoCredentials: () => authData.demoCredentials,

  listOrganizations: async (): Promise<Organization[]> => {
    if (!useMocks) {
      const response = await apiClient.get<ApiEnvelope<BackendOrganizationPublic[]>>('/organizations/public');
      return unwrapApiData(response.data).map((organization) => ({
        id: String(organization.org_id),
        code: organization.org_code,
        name: organization.org_name,
        status: 'active',
      }));
    }

    const database = await mockDbService.getDatabase();
    return database.organizations
      .filter((organization) => organization.status === 'active')
      .sort((current, next) => current.name.localeCompare(next.name));
  },

  signupTenant: async (input: SignupInput): Promise<SignupResult> => {
    if (!useMocks) {
      const response = await apiClient.post<ApiEnvelope<BackendSignupResponse>>('/signup', input);
      const payload = unwrapApiData(response.data);
      const org: Organization = {
        id: String(payload.organization_id),
        code: payload.org_code,
        name: input.org_name,
        status: 'active',
        timezone: input.timezone,
        plan: input.plan,
      };

      return {
        org,
        user: {
          id: String(payload.admin_user_id),
          orgId: String(payload.organization_id),
          orgCode: payload.org_code,
          email: input.admin_email,
          password: '',
          name: input.admin_name,
          title: 'Organization Admin',
          department: 'Administration',
          status: 'active',
          roleIds: [payload.admin_role_code],
          isEmailVerified: false,
        },
        verificationToken: payload.verification_token ?? undefined,
        message: payload.message,
      };
    }

    validatePasswordPolicy(input.password);
    const orgCode = normalizeCode(input.org_code);
    let result: SignupResult | null = null;

    await mockDbService.updateDatabase((database) => {
      if (database.organizations.some((org) => normalize(org.code) === normalize(orgCode))) {
        throw new Error('Organization code already exists.');
      }

      const now = new Date().toISOString();
      const org: Organization = {
        id: createId('org'),
        code: orgCode,
        name: input.org_name.trim(),
        status: 'active',
        timezone: input.timezone,
        plan: input.plan,
        logoUrl: '',
        supportEmail: input.admin_email.trim().toLowerCase(),
        allowedOrigins: [],
        createdAt: now,
        updatedAt: now,
      };
      const orgAdminRole: Role = {
        id: createId('role'),
        orgId: org.id,
        code: 'ORG_ADMIN',
        name: 'Organization Admin',
        description: 'Tenant administrator for users, roles, permissions, settings, and audit logs.',
        permissions: coreOrgAdminPermissions,
        isSystem: true,
      };
      const adminUser: UserRecord = {
        id: createId('usr'),
        orgId: org.id,
        orgCode,
        email: input.admin_email.trim().toLowerCase(),
        password: input.password,
        name: input.admin_name.trim(),
        title: 'Organization Admin',
        department: 'Administration',
        status: 'active',
        roleIds: [orgAdminRole.id],
        isDeleted: false,
        isEmailVerified: false,
        failedAttempts: 0,
        lockedUntil: null,
        createdAt: now,
      };
      const verificationToken = `${orgCode.toLowerCase()}-${createId('verify')}`;
      const verificationRecord = {
        id: createId('vt'),
        orgId: org.id,
        userId: adminUser.id,
        email: adminUser.email,
        token: verificationToken,
        createdAt: now,
      };

      result = {
        org,
        user: adminUser,
        verificationToken,
        message: 'Organization created. First administrator created as Organization Admin.',
      };

      return appendAuditLog(
        {
          ...database,
          organizations: [...database.organizations, org],
          roles: [...database.roles, orgAdminRole],
          users: [...database.users, adminUser],
          verificationTokens: [...database.verificationTokens, verificationRecord],
        },
        {
          orgId: org.id,
          action: 'ORG_CREATED',
          actorUserId: adminUser.id,
          actorEmail: adminUser.email,
          targetUserId: adminUser.id,
          resourceType: 'ORGANIZATION',
          resourceId: org.id,
          message: `${org.name} was created.`,
          metadata: { orgCode: org.code, plan: org.plan },
        },
      );
    });

    if (!result) {
      throw new Error('Unable to create organization.');
    }

    return result;
  },

  getVerificationToken: async (token: string) => {
    if (!useMocks) {
      return token ? { token } : null;
    }

    const database = await mockDbService.getDatabase();
    return database.verificationTokens.find((candidate) => candidate.token === token);
  },

  verifyEmail: async (token: string): Promise<void> => {
    if (!useMocks) {
      await apiClient.post('/verify-email', { token });
      return;
    }

    await mockDbService.updateDatabase((database) => {
      const verificationToken = database.verificationTokens.find((candidate) => candidate.token === token);
      if (!verificationToken) {
        throw new Error('Verification token was not found.');
      }

      if (verificationToken.verifiedAt) {
        return database;
      }

      const now = new Date().toISOString();
      const user = database.users.find((candidate) => candidate.id === verificationToken.userId);
      const nextDatabase = {
        ...database,
        users: database.users.map((candidate) =>
          candidate.id === verificationToken.userId ? { ...candidate, isEmailVerified: true } : candidate,
        ),
        verificationTokens: database.verificationTokens.map((candidate) =>
          candidate.id === verificationToken.id ? { ...candidate, verifiedAt: now } : candidate,
        ),
      };

      return appendAuditLog(nextDatabase, {
        orgId: verificationToken.orgId,
        action: 'EMAIL_VERIFIED',
        actorUserId: verificationToken.userId,
        actorEmail: verificationToken.email,
        targetUserId: verificationToken.userId,
        resourceType: 'USER',
        resourceId: verificationToken.userId,
        message: `${user?.email ?? verificationToken.email} verified email.`,
      });
    });
  },

  login: async (credentials: LoginCredentials): Promise<AuthSession> => {
    if (!useMocks) {
      const response = await apiClient.post<ApiEnvelope<BackendAuthResponse>>('/auth/login', credentials);
      return mapBackendAuthSession(unwrapApiData(response.data));
    }

    let session: AuthSession | null = null;
    let loginError: string | null = null;

    await mockDbService.updateDatabase((database) => {
      const org = database.organizations.find(
        (candidate) => normalize(candidate.code) === normalize(credentials.org_code),
      );

      if (!org || org.status !== 'active') {
        throw new Error('INVALID_CREDENTIALS');
      }

      const user = database.users.find(
        (candidate) =>
          candidate.orgId === org.id &&
          !candidate.isDeleted &&
          normalize(candidate.email) === normalize(credentials.email),
      );

      if (!user) {
        throw new Error('INVALID_CREDENTIALS');
      }

      if (user.status !== 'active') {
        throw new Error('USER_INACTIVE');
      }

      if (!user.isEmailVerified) {
        throw new Error('EMAIL_NOT_VERIFIED');
      }

      if (user.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now()) {
        throw new Error('ACCOUNT_LOCKED');
      }

      if (user.password !== credentials.password) {
        const failedAttempts = (user.failedAttempts ?? 0) + 1;
        const lockedUntil =
          failedAttempts >= AUTH_CONFIG.maxFailedAttempts
            ? new Date(Date.now() + AUTH_CONFIG.lockoutMinutes * 60 * 1000).toISOString()
            : null;
        loginError = lockedUntil ? 'ACCOUNT_LOCKED' : 'INVALID_CREDENTIALS';

        return {
          ...database,
          users: database.users.map((candidate) =>
            candidate.id === user.id ? { ...candidate, failedAttempts, lockedUntil } : candidate,
          ),
        };
      }

      const tokenBundle = createMockJwt(user.id, org.id);
      const refreshTokenRecord: RefreshTokenRecord = {
        id: createId('rt'),
        orgId: org.id,
        userId: user.id,
        token: tokenBundle.refreshToken,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + AUTH_CONFIG.refreshTokenTtlDays * 24 * 60 * 60 * 1000).toISOString(),
        revokedAt: null,
        userAgent: 'Mock browser session',
      };
      const updatedUser = {
        ...user,
        failedAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date().toISOString(),
      };

      session = buildSession(updatedUser, org, database.roles, database.resources, tokenBundle);

      return appendAuditLog(
        {
          ...database,
          users: database.users.map((candidate) => (candidate.id === user.id ? updatedUser : candidate)),
          refreshTokens: [...database.refreshTokens, refreshTokenRecord],
        },
        {
          orgId: org.id,
          action: 'USER_LOGIN',
          actorUserId: user.id,
          actorEmail: user.email,
          targetUserId: user.id,
          resourceType: 'SESSION',
          resourceId: refreshTokenRecord.id,
          message: `${user.email} signed in.`,
        },
      );
    });

    if (loginError) {
      throw new Error(loginError);
    }

    if (!session) {
      throw new Error('INVALID_CREDENTIALS');
    }

    return session;
  },

  refreshCurrentUserPermissions: async (
    currentSession: AuthSession,
    rotateRefreshToken = false,
  ): Promise<AuthSession | null> => {
    if (!useMocks) {
      if (!rotateRefreshToken) {
        return currentSession;
      }

      const response = await apiClient.post<ApiEnvelope<BackendAuthResponse>>('/auth/refresh', {
        refresh_token: currentSession.refreshToken,
      });
      return mapBackendAuthSession(unwrapApiData(response.data));
    }

    let refreshedSession: AuthSession | null = null;

    await mockDbService.updateDatabase((database) => {
      const org = database.organizations.find((candidate) => candidate.id === currentSession.org.id);
      const user = database.users.find(
        (candidate) => candidate.id === currentSession.user.id && !candidate.isDeleted,
      );
      const refreshToken = database.refreshTokens.find(
        (candidate) => candidate.token === currentSession.refreshToken,
      );

      if (!org || !user || user.status !== 'active' || !user.isEmailVerified) {
        return database;
      }

      if (
        rotateRefreshToken &&
        (!refreshToken || refreshToken.revokedAt || new Date(refreshToken.expiresAt).getTime() <= Date.now())
      ) {
        return database;
      }

      const tokenBundle = createMockJwt(user.id, org.id);

      if (rotateRefreshToken && refreshToken) {
        const newRefreshToken: RefreshTokenRecord = {
          id: createId('rt'),
          orgId: org.id,
          userId: user.id,
          token: tokenBundle.refreshToken,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + AUTH_CONFIG.refreshTokenTtlDays * 24 * 60 * 60 * 1000).toISOString(),
          revokedAt: null,
          rotatedFrom: refreshToken.id,
          userAgent: refreshToken.userAgent,
        };
        refreshedSession = buildSession(user, org, database.roles, database.resources, tokenBundle);

        return {
          ...database,
          refreshTokens: [
            ...database.refreshTokens.map((candidate) =>
              candidate.id === refreshToken.id
                ? { ...candidate, revokedAt: new Date().toISOString() }
                : candidate,
            ),
            newRefreshToken,
          ],
        };
      }

      refreshedSession = buildSession(user, org, database.roles, database.resources, {
        ...tokenBundle,
        refreshToken: currentSession.refreshToken,
      });

      return database;
    });

    return refreshedSession;
  },

  logout: async (currentSession: AuthSession | null): Promise<void> => {
    if (!currentSession) return;

    if (!useMocks) {
      await apiClient.post('/auth/logout', { refresh_token: currentSession.refreshToken });
      return;
    }

    await mockDbService.updateDatabase((database) => {
      const refreshToken = database.refreshTokens.find((candidate) => candidate.token === currentSession.refreshToken);
      const nextDatabase = {
        ...database,
        refreshTokens: database.refreshTokens.map((candidate) =>
          candidate.token === currentSession.refreshToken
            ? { ...candidate, revokedAt: candidate.revokedAt ?? new Date().toISOString() }
            : candidate,
        ),
      };

      return appendAuditLog(nextDatabase, {
        orgId: currentSession.org.id,
        action: 'USER_LOGOUT',
        actorUserId: currentSession.user.id,
        actorEmail: currentSession.user.email,
        targetUserId: currentSession.user.id,
        resourceType: 'SESSION',
        resourceId: refreshToken?.id,
        message: `${currentSession.user.email} signed out.`,
      });
    });
  },
};
