import { AUTH_CONFIG } from '@/shared/constants/app.constants';
import { apiClient, unwrapApiData, type ApiEnvelope } from '@/shared/api/apiClient';
import type { AuthSession, LoginCredentials, Organization, SignupInput, SignupResult, UserRecord } from '@/shared/types/auth.types';
import type { ResourceRecord, Role } from '@/shared/types/rbac.types';
import type { NavigationItem } from '@/shared/types/navigation.types';
import type { ResourceType } from '@/shared/constants/permission.constants';

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
  dev_verification_url?: string | null;
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

type BackendVerifyEmailResponse = {
  verified: boolean;
  message?: string;
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

const fallbackIconForResourceKey = (resourceKey: string): string => {
  const key = resourceKey.toUpperCase();
  if (key.includes('USER')) return 'users';
  if (key.includes('ROLE') || key.includes('ADMIN')) return 'roles';
  if (key.includes('PERM')) return 'permissions';
  if (key.includes('RESOURCE')) return 'resources';
  if (key.includes('REPORT') || key.includes('AUDIT')) return 'reports';
  if (key.includes('SETTING') || key.includes('ORG_SETTINGS')) return 'settings';
  if (key.includes('TICKET')) return 'tickets';
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
    tokenType: payload.token_type ?? AUTH_CONFIG.tokenType,
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
  listOrganizations: async (): Promise<Organization[]> => {
    const response = await apiClient.get<ApiEnvelope<BackendOrganizationPublic[]>>('/organizations/public');
    return unwrapApiData(response.data).map((organization) => ({
      id: String(organization.org_id),
      code: organization.org_code,
      name: organization.org_name,
      status: 'active',
    }));
  },

  signupTenant: async (input: SignupInput): Promise<SignupResult> => {
    validatePasswordPolicy(input.password);
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
    const user: UserRecord = {
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
      devVerificationUrl: payload.dev_verification_url ?? undefined,
    };

    return {
      org,
      user,
      devVerificationUrl: payload.dev_verification_url ?? undefined,
      message: payload.message,
    };
  },

  getVerificationToken: async (token: string) => (token ? { token } : null),

  verifyEmail: async (token: string): Promise<string> => {
    const response = await apiClient.post<ApiEnvelope<BackendVerifyEmailResponse>>('/verify-email', { token });
    return unwrapApiData(response.data).message ?? 'Email verified successfully. You can now sign in.';
  },

  login: async (credentials: LoginCredentials): Promise<AuthSession> => {
    const response = await apiClient.post<ApiEnvelope<BackendAuthResponse>>('/auth/login', credentials);
    return mapBackendAuthSession(unwrapApiData(response.data));
  },

  refreshCurrentUserPermissions: async (
    currentSession: AuthSession,
    rotateRefreshToken = false,
  ): Promise<AuthSession | null> => {
    if (!rotateRefreshToken) {
      return currentSession;
    }

    const response = await apiClient.post<ApiEnvelope<BackendAuthResponse>>('/auth/refresh', {
      refresh_token: currentSession.refreshToken,
    });
    return mapBackendAuthSession(unwrapApiData(response.data));
  },

  logout: async (currentSession: AuthSession | null): Promise<void> => {
    if (!currentSession) return;
    await apiClient.post('/auth/logout', { refresh_token: currentSession.refreshToken });
  },
};
