import type { NavigationItem } from '@/shared/types/navigation.types';
import type { EffectivePermissions, ResourceRecord, Role } from '@/shared/types/rbac.types';

export type Organization = {
  id: string;
  code: string;
  name: string;
  status: 'active' | 'suspended';
};

export type UserRecord = {
  id: string;
  orgId: string;
  orgCode: string;
  email: string;
  password: string;
  name: string;
  title: string;
  department: string;
  status: 'active' | 'invited' | 'disabled';
  roleIds: string[];
  isDeleted?: boolean;
};

export type AuthUser = Omit<UserRecord, 'password' | 'roleIds'> & {
  roles: string[];
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresAt: string;
  user: AuthUser;
  org: Organization;
  roles: Role[];
  permissions: EffectivePermissions;
  resources: ResourceRecord[];
  navigation: NavigationItem[];
};

export type LoginCredentials = {
  org_code: string;
  email: string;
  password: string;
};
