import organizationsData from '@/mock/data/organizations.json';
import reportsData from '@/mock/data/reports.json';
import resourcesData from '@/mock/data/resources.json';
import rolesData from '@/mock/data/roles.json';
import settingsData from '@/mock/data/settings.json';
import ticketsData from '@/mock/data/tickets.json';
import usersData from '@/mock/data/users.json';
import { STORAGE_KEYS } from '@/shared/constants/storage.constants';
import { ACTION_LABELS, PERMISSION_KEYS, RESOURCE_KEYS, RESOURCE_TYPES } from '@/shared/constants/permission.constants';
import type { Organization, UserRecord } from '@/shared/types/auth.types';
import type { Report, TenantSetting, Ticket } from '@/shared/types/domain.types';
import type { ResourceRecord, Role } from '@/shared/types/rbac.types';

export type MockDatabase = {
  organizations: Organization[];
  users: UserRecord[];
  roles: Role[];
  resources: ResourceRecord[];
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
  tickets: ticketsData as Ticket[],
  reports: reportsData as Report[],
  settings: settingsData as TenantSetting[],
});

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const normalizeActionLabels = (resource: ResourceRecord): ResourceRecord => ({
  ...resource,
  displayName: resource.displayName ?? resource.resourceName,
  displayCategory: resource.displayCategory ?? resource.resourceGroup,
  allowedPermissions: resource.allowedPermissions.map((permission) => ({
    key: permission.key.toUpperCase(),
    label: ACTION_LABELS[permission.key.toUpperCase()] ?? permission.label,
  })),
});

const ensureResource = (database: MockDatabase, resource: ResourceRecord): ResourceRecord[] => {
  if (database.resources.some((candidate) => candidate.resourceKey === resource.resourceKey)) {
    return database.resources;
  }

  return [...database.resources, resource];
};

const normalizeDatabase = (database: MockDatabase): MockDatabase => {
  let nextDatabase: MockDatabase = {
    ...database,
    resources: database.resources.map(normalizeActionLabels),
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

  const orgAdminPermissionPatch = {
    [RESOURCE_KEYS.dashboardMenu]: [PERMISSION_KEYS.view],
    [RESOURCE_KEYS.dashboardMain]: [PERMISSION_KEYS.view],
    [RESOURCE_KEYS.userMenu]: [
      PERMISSION_KEYS.view,
      PERMISSION_KEYS.read,
      PERMISSION_KEYS.create,
      PERMISSION_KEYS.update,
      PERMISSION_KEYS.delete,
    ],
    [RESOURCE_KEYS.userListApi]: [PERMISSION_KEYS.read],
    [RESOURCE_KEYS.userCreateApi]: [PERMISSION_KEYS.execute],
    [RESOURCE_KEYS.userUpdateApi]: [PERMISSION_KEYS.execute],
    [RESOURCE_KEYS.userDeleteApi]: [PERMISSION_KEYS.execute],
    [RESOURCE_KEYS.adminMenu]: [PERMISSION_KEYS.view],
    [RESOURCE_KEYS.roleManageApi]: [
      PERMISSION_KEYS.read,
      PERMISSION_KEYS.create,
      PERMISSION_KEYS.update,
      PERMISSION_KEYS.delete,
    ],
    [RESOURCE_KEYS.permissionGrantApi]: [PERMISSION_KEYS.configure],
    [RESOURCE_KEYS.reportsMenu]: [PERMISSION_KEYS.view],
    [RESOURCE_KEYS.reportDaily]: [PERMISSION_KEYS.view, PERMISSION_KEYS.download],
    [RESOURCE_KEYS.reportMonthly]: [PERMISSION_KEYS.view, PERMISSION_KEYS.download],
    [RESOURCE_KEYS.reportAudit]: [PERMISSION_KEYS.view, PERMISSION_KEYS.download],
  };

  return {
    ...nextDatabase,
    roles: nextDatabase.roles.map((role) => {
      if (role.code !== 'ORG_ADMIN') return role;

      return {
        ...role,
        permissions: {
          ...role.permissions,
          ...orgAdminPermissionPatch,
        },
      };
    }),
  };
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
    return withDelay(clone(writeDatabase(updatedDatabase)));
  },
};
