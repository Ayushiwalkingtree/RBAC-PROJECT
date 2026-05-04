import { validatePasswordPolicy } from '@/features/auth/services/auth.service';
import { apiClient, unwrapApiData, type ApiEnvelope } from '@/shared/api/apiClient';
import type { UserRecord } from '@/shared/types/auth.types';

export type CreateUserInput = {
  orgId: string;
  orgCode: string;
  full_name: string;
  email: string;
  password: string;
  department: string;
  role_ids: string[];
  is_active: boolean;
  actorUserId?: string;
  actorEmail?: string;
};

export type UpdateUserInput = Omit<CreateUserInput, 'orgId' | 'orgCode' | 'password'> & {
  id: string;
  password?: string;
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

type BackendUserCreateResponse = {
  user: BackendUser;
  dev_verification_url?: string | null;
};

export type CreateUserResult = {
  user: UserRecord;
  devVerificationUrl?: string;
};

const mapBackendUser = (user: BackendUser, orgId = '', orgCode = ''): UserRecord => ({
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

export const userService = {
  listUsers: async (orgId: string): Promise<UserRecord[]> => {
    const response = await apiClient.get<ApiEnvelope<BackendUser[]>>('/users');
    return unwrapApiData(response.data).map((user) => mapBackendUser(user, orgId));
  },

  createUser: async (input: CreateUserInput): Promise<CreateUserResult> => {
    validatePasswordPolicy(input.password);
    const response = await apiClient.post<ApiEnvelope<BackendUserCreateResponse>>('/users', {
      email: input.email,
      full_name: input.full_name,
      password: input.password,
      department: input.department,
      role_ids: input.role_ids.map(Number),
      is_active: input.is_active,
    });
    const payload = unwrapApiData(response.data);
    return {
      user: mapBackendUser(payload.user, input.orgId, input.orgCode),
      devVerificationUrl: payload.dev_verification_url ?? undefined,
    };
  },

  updateUser: async (input: UpdateUserInput): Promise<UserRecord> => {
    const response = await apiClient.put<ApiEnvelope<BackendUser>>(`/users/${input.id}`, {
      email: input.email,
      full_name: input.full_name,
      password: input.password || undefined,
      department: input.department,
      is_active: input.is_active,
    });
    return mapBackendUser(unwrapApiData(response.data));
  },

  assignUserRoles: async (
    userId: string,
    roleIds: string[],
    actor?: { userId?: string; email?: string },
  ): Promise<UserRecord> => {
    void actor;
    const response = await apiClient.post<ApiEnvelope<{ role_ids: number[] }>>(`/users/${userId}/roles`, {
      role_ids: roleIds.map(Number),
    });
    const payload = unwrapApiData(response.data);
    return {
      id: userId,
      orgId: '',
      orgCode: '',
      email: '',
      password: '',
      name: '',
      title: '',
      department: '',
      status: 'active',
      roleIds: payload.role_ids.map(String),
    };
  },

  setUserActive: async (userId: string, isActive: boolean): Promise<UserRecord> => {
    const response = await apiClient.put<ApiEnvelope<BackendUser>>(`/users/${userId}`, {
      is_active: isActive,
    });
    return mapBackendUser(unwrapApiData(response.data));
  },

  deleteUser: async (userId: string): Promise<void> => {
    const response = await apiClient.delete<ApiEnvelope<{ deleted: boolean }>>(`/users/${userId}`);
    unwrapApiData(response.data);
  },

  verifyUserEmail: async (): Promise<UserRecord> => {
    throw new Error('Use the verification link sent to the user.');
  },
};
