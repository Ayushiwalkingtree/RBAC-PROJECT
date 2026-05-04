export type Ticket = {
  id: string;
  orgId: string;
  subject: string;
  status: 'Open' | 'In Progress' | 'Resolved';
  priority: 'Low' | 'Medium' | 'High';
  owner: string;
  isDeleted?: boolean;
};

export type Report = {
  id: string;
  orgId: string;
  name: string;
  category: string;
  updatedAt: string;
};

export type TenantSetting = {
  orgId: string;
  key: string;
  value: string;
};

export type AuditAction = string;

export type AuditLog = {
  id: string;
  orgId: string;
  action: AuditAction;
  actorUserId?: string;
  actorEmail?: string;
  targetUserId?: string;
  resourceType: string;
  resourceId?: string;
  resourceKey?: string;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export type VerificationToken = {
  id: string;
  orgId: string;
  userId: string;
  token: string;
  email: string;
  createdAt: string;
  verifiedAt?: string;
};

export type RefreshTokenRecord = {
  id: string;
  orgId: string;
  userId: string;
  token: string;
  createdAt: string;
  expiresAt: string;
  revokedAt?: string | null;
  rotatedFrom?: string;
  userAgent?: string;
};

export type UserRoleRecord = {
  id: string;
  orgId: string;
  userId: string;
  roleId: string;
};

export type RolePermissionRecord = {
  id: string;
  orgId: string;
  roleId: string;
  resourceKey: string;
  permissionsJson: string[];
};

export type ResourcePermissionRecord = {
  id: string;
  resourceKey: string;
  permissionsJson: string[];
};
