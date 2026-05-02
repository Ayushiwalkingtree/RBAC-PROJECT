import organizationsData from '@/mock/data/organizations.json';
import reportsData from '@/mock/data/reports.json';
import resourcesData from '@/mock/data/resources.json';
import rolesData from '@/mock/data/roles.json';
import settingsData from '@/mock/data/settings.json';
import ticketsData from '@/mock/data/tickets.json';
import usersData from '@/mock/data/users.json';
import { STORAGE_KEYS } from '@/shared/constants/storage.constants';
import { ACTION_LABELS, PERMISSION_KEYS, RESOURCE_KEYS, RESOURCE_TYPES } from '@/shared/constants/permission.constants';
import { createId } from '@/shared/utils/id';
import type { Organization, UserRecord } from '@/shared/types/auth.types';
import type {
  AuditAction,
  AuditLog,
  RefreshTokenRecord,
  Report,
  ResourcePermissionRecord,
  RolePermissionRecord,
  TenantSetting,
  Ticket,
  UserRoleRecord,
  VerificationToken,
} from '@/shared/types/domain.types';
import type { ResourceRecord, Role } from '@/shared/types/rbac.types';

export type MockDatabase = {
  organizations: Organization[];
  users: UserRecord[];
  roles: Role[];
  resources: ResourceRecord[];
  resourcePermissions: ResourcePermissionRecord[];
  rolePermissions: RolePermissionRecord[];
  userRoles: UserRoleRecord[];
  refreshTokens: RefreshTokenRecord[];
  auditLogs: AuditLog[];
  verificationTokens: VerificationToken[];
  tickets: Ticket[];
  reports: Report[];
  settings: TenantSetting[];
};

const delayMs = 180;

const createSeedDatabase = (): MockDatabase => ({
  organizations: organizationsData as Organization[],
  users: usersData as UserRecord[],
  roles: rolesData as Role[],
  resources: resourcesData as ResourceRecord[],
  resourcePermissions: [],
  rolePermissions: [],
  userRoles: [],
  refreshTokens: [],
  auditLogs: [],
  verificationTokens: [],
  tickets: ticketsData as Ticket[],
  reports: reportsData as Report[],
  settings: settingsData as TenantSetting[],
});

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const normalizeActionLabels = (resource: ResourceRecord): ResourceRecord => {
  const requiredPermissions =
    resource.resourceKey === RESOURCE_KEYS.permissionGrantApi
      ? [
          ...resource.allowedPermissions,
          { key: PERMISSION_KEYS.read, label: ACTION_LABELS.READ },
          { key: PERMISSION_KEYS.configure, label: ACTION_LABELS.CONFIGURE },
        ]
      : resource.resourceKey === RESOURCE_KEYS.orgSettings
        ? [
            ...resource.allowedPermissions,
            { key: PERMISSION_KEYS.view, label: ACTION_LABELS.VIEW },
            { key: PERMISSION_KEYS.update, label: ACTION_LABELS.UPDATE },
          ]
        : resource.allowedPermissions;
  const uniquePermissions = [...new Map(requiredPermissions.map((permission) => [permission.key.toUpperCase(), permission])).values()];

  return {
    ...resource,
    displayName: resource.displayName ?? resource.resourceName,
    displayCategory: resource.displayCategory ?? resource.resourceGroup,
    allowedPermissions: uniquePermissions.map((permission) => ({
    key: permission.key.toUpperCase(),
    label: ACTION_LABELS[permission.key.toUpperCase()] ?? permission.label,
    })),
  };
};

const ensureResource = (database: MockDatabase, resource: ResourceRecord): ResourceRecord[] => {
  if (database.resources.some((candidate) => candidate.resourceKey === resource.resourceKey)) {
    return database.resources;
  }

  return [...database.resources, resource];
};

const defaultAllowedOrigins = (code: string): string[] => [`https://${code.toLowerCase().replaceAll('_', '-')}.example.com`];

const normalizeOrganization = (organization: Organization): Organization => ({
  ...organization,
  timezone: organization.timezone ?? 'Asia/Calcutta',
  plan: organization.plan ?? (organization.code === 'PLATFORM' ? 'Platform' : 'Enterprise'),
  logoUrl: organization.logoUrl ?? '',
  supportEmail: organization.supportEmail ?? `support@${organization.code.toLowerCase().replaceAll('_', '')}.example.com`,
  allowedOrigins: organization.allowedOrigins ?? defaultAllowedOrigins(organization.code),
  createdAt: organization.createdAt ?? new Date(0).toISOString(),
  updatedAt: organization.updatedAt ?? new Date(0).toISOString(),
});

const normalizeUser = (user: UserRecord): UserRecord => ({
  ...user,
  isEmailVerified: user.isEmailVerified ?? true,
  failedAttempts: user.failedAttempts ?? 0,
  lockedUntil: user.lockedUntil ?? null,
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt ?? new Date(0).toISOString(),
});

const syncRelationshipTables = (database: MockDatabase): MockDatabase => ({
  ...database,
  resourcePermissions: database.resources.map((resource) => ({
    id: `rp-${resource.resourceKey}`,
    resourceKey: resource.resourceKey,
    permissionsJson: resource.allowedPermissions.map((permission) => permission.key),
  })),
  rolePermissions: database.roles.flatMap((role) =>
    Object.entries(role.permissions).map(([resourceKey, permissions]) => ({
      id: `roleperm-${role.id}-${resourceKey}`,
      orgId: role.orgId,
      roleId: role.id,
      resourceKey,
      permissionsJson: permissions,
    })),
  ),
  userRoles: database.users.flatMap((user) =>
    user.roleIds.map((roleId) => ({
      id: `userrole-${user.id}-${roleId}`,
      orgId: user.orgId,
      userId: user.id,
      roleId,
    })),
  ),
});

export const appendAuditLog = (
  database: MockDatabase,
  input: {
    orgId: string;
    action: AuditAction;
    resourceType: string;
    message: string;
    actorUserId?: string;
    actorEmail?: string;
    targetUserId?: string;
    resourceId?: string;
    resourceKey?: string;
    metadata?: Record<string, unknown>;
  },
): MockDatabase => ({
  ...database,
  auditLogs: [
    ...(database.auditLogs ?? []),
    {
      id: createId('audit'),
      createdAt: new Date().toISOString(),
      ...input,
    },
  ],
});

const normalizeDatabase = (database: MockDatabase): MockDatabase => {
  let nextDatabase: MockDatabase = {
    ...database,
    organizations: (database.organizations ?? []).map(normalizeOrganization),
    users: (database.users ?? []).map(normalizeUser),
    roles: database.roles ?? [],
    resources: (database.resources ?? []).map(normalizeActionLabels),
    resourcePermissions: database.resourcePermissions ?? [],
    rolePermissions: database.rolePermissions ?? [],
    userRoles: database.userRoles ?? [],
    refreshTokens: database.refreshTokens ?? [],
    auditLogs: database.auditLogs ?? [],
    verificationTokens: database.verificationTokens ?? [],
    tickets: database.tickets ?? [],
    reports: database.reports ?? [],
    settings: database.settings ?? [],
  };

  nextDatabase = {
    ...nextDatabase,
    resources: ensureResource(nextDatabase, {
      id: 'res-report-audit',
      resourceKey: RESOURCE_KEYS.reportAudit,
      resourceName: 'Audit Report',
      resourceType: RESOURCE_TYPES.report,
      resourceGroup: 'Reports',
      displayName: 'Audit Report',
      displayCategory: 'Reports',
      description: 'Audit activity report',
      allowedPermissions: [
        { key: PERMISSION_KEYS.view, label: ACTION_LABELS.VIEW },
        { key: PERMISSION_KEYS.download, label: ACTION_LABELS.DOWNLOAD },
      ],
      sequenceNo: 43,
      parentResourceKey: RESOURCE_KEYS.reportsMenu,
      isUiVisible: true,
      isActive: true,
      uiPath: '/reports',
      icon: 'reports',
    }),
  };

  nextDatabase = {
    ...nextDatabase,
    resources: ensureResource(nextDatabase, {
      id: 'res-org-settings',
      resourceKey: RESOURCE_KEYS.orgSettings,
      resourceName: 'Organization Settings',
      resourceType: RESOURCE_TYPES.api,
      resourceGroup: 'Administration',
      displayName: 'Organization Settings',
      displayCategory: 'Administration',
      description: 'Read and update organization profile settings',
      allowedPermissions: [
        { key: PERMISSION_KEYS.view, label: ACTION_LABELS.VIEW },
        { key: PERMISSION_KEYS.read, label: ACTION_LABELS.READ },
        { key: PERMISSION_KEYS.update, label: ACTION_LABELS.UPDATE },
      ],
      httpMethod: 'PUT',
      apiPath: '/api/organizations/current',
      microservice: 'identity',
      isUiVisible: false,
      isActive: true,
    }),
  };

  nextDatabase = {
    ...nextDatabase,
    resources: ensureResource(nextDatabase, {
      id: 'res-audit-logs-menu',
      resourceKey: RESOURCE_KEYS.auditLogsMenu,
      resourceName: 'Audit Logs',
      resourceType: RESOURCE_TYPES.menu,
      resourceGroup: 'Administration',
      displayName: 'Audit Logs',
      displayCategory: 'Administration',
      description: 'Tenant audit trail menu',
      allowedPermissions: [{ key: PERMISSION_KEYS.view, label: ACTION_LABELS.VIEW }],
      sequenceNo: 95,
      isUiVisible: true,
      isActive: true,
      uiPath: '/audit-logs',
      icon: 'reports',
    }),
  };

  nextDatabase = {
    ...nextDatabase,
    resources: ensureResource(nextDatabase, {
      id: 'res-audit-log-api',
      resourceKey: RESOURCE_KEYS.auditLogApi,
      resourceName: 'Audit Log API',
      resourceType: RESOURCE_TYPES.api,
      resourceGroup: 'Administration',
      displayName: 'Audit Logs',
      displayCategory: 'Administration',
      description: 'Read audit log entries',
      allowedPermissions: [{ key: PERMISSION_KEYS.read, label: ACTION_LABELS.READ }],
      httpMethod: 'GET',
      apiPath: '/api/audit-logs',
      microservice: 'identity',
      isUiVisible: false,
      isActive: true,
    }),
  };

  const orgAdminPermissionPatch: Role['permissions'] = {
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

  const patchedDatabase = {
    ...nextDatabase,
    roles: nextDatabase.roles.map((role) => {
      if (role.code === 'SUPER_ADMIN' && role.orgId === 'org-platform') {
        const fullPermissions = nextDatabase.resources.reduce<Role['permissions']>((permissions, resource) => {
          permissions[resource.resourceKey] = resource.allowedPermissions.map((permission) => permission.key);
          return permissions;
        }, {});

        return {
          ...role,
          permissions: fullPermissions,
        };
      }

      if (role.code !== 'ORG_ADMIN') return role;

      const permissions = {
        ...role.permissions,
        ...orgAdminPermissionPatch,
      };
      delete permissions[RESOURCE_KEYS.resourceRegistryMenu];
      delete permissions[RESOURCE_KEYS.resourceManageApi];
      delete permissions[RESOURCE_KEYS.userExportButton];
      delete permissions[RESOURCE_KEYS.settingsMenu];
      delete permissions[RESOURCE_KEYS.settingsManageApi];
      delete permissions[RESOURCE_KEYS.reportsMenu];
      delete permissions[RESOURCE_KEYS.reportDaily];
      delete permissions[RESOURCE_KEYS.reportMonthly];
      delete permissions[RESOURCE_KEYS.reportAudit];
      delete permissions[RESOURCE_KEYS.dashboardMenu];
      delete permissions[RESOURCE_KEYS.dashboardMain];
      delete permissions[RESOURCE_KEYS.dashboardRisk];
      delete permissions[RESOURCE_KEYS.loanMenu];
      delete permissions[RESOURCE_KEYS.loanListApi];
      delete permissions[RESOURCE_KEYS.loanCreateApi];
      delete permissions[RESOURCE_KEYS.loanApproveApi];
      delete permissions[RESOURCE_KEYS.loanApproveButton];
      delete permissions[RESOURCE_KEYS.loanRejectButton];

      return {
        ...role,
        permissions,
      };
    }),
  };

  const cleanedPatchedDatabase = {
    ...patchedDatabase,
    roles: patchedDatabase.roles.map((role) => ({
      ...role,
      permissions: Object.fromEntries(
        Object.entries(role.permissions).filter(([, permissions]) => Array.isArray(permissions) && permissions.length > 0),
      ),
    })),
  };

  return syncRelationshipTables(cleanedPatchedDatabase);
};

const canUseStorage = (): boolean => typeof window !== 'undefined' && Boolean(window.localStorage);

const readDatabase = (): MockDatabase => {
  if (!canUseStorage()) {
    return createSeedDatabase();
  }

  const stored = window.localStorage.getItem(STORAGE_KEYS.mockDb);
  if (!stored) {
    const seed = normalizeDatabase(createSeedDatabase());
    window.localStorage.setItem(STORAGE_KEYS.mockDb, JSON.stringify(seed));
    return seed;
  }

  const parsed = JSON.parse(stored) as MockDatabase;
  const normalized = normalizeDatabase(parsed);
  window.localStorage.setItem(STORAGE_KEYS.mockDb, JSON.stringify(normalized));
  return normalized;
};

const writeDatabase = (database: MockDatabase): MockDatabase => {
  if (canUseStorage()) {
    window.localStorage.setItem(STORAGE_KEYS.mockDb, JSON.stringify(database));
  }

  return database;
};

export const withDelay = async <T>(value: T): Promise<T> =>
  new Promise((resolve) => {
    window.setTimeout(() => resolve(value), delayMs);
  });

export const mockDbService = {
  seed: async (): Promise<MockDatabase> => withDelay(writeDatabase(normalizeDatabase(createSeedDatabase()))),

  reset: async (): Promise<MockDatabase> => {
    if (canUseStorage()) {
      window.localStorage.removeItem(STORAGE_KEYS.mockDb);
    }

    return withDelay(writeDatabase(normalizeDatabase(createSeedDatabase())));
  },

  getDatabase: async (): Promise<MockDatabase> => withDelay(clone(readDatabase())),

  updateDatabase: async (updater: (database: MockDatabase) => MockDatabase): Promise<MockDatabase> => {
    const currentDatabase = readDatabase();
    const updatedDatabase = updater(clone(currentDatabase));
    return withDelay(clone(writeDatabase(normalizeDatabase(updatedDatabase))));
  },
};
