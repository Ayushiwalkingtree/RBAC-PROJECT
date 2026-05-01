import navigationData from '@/mock/data/navigation.json';
import organizationsData from '@/mock/data/organizations.json';
import permissionsData from '@/mock/data/permissions.json';
import reportsData from '@/mock/data/reports.json';
import resourcesData from '@/mock/data/resources.json';
import rolesData from '@/mock/data/roles.json';
import settingsData from '@/mock/data/settings.json';
import ticketsData from '@/mock/data/tickets.json';
import usersData from '@/mock/data/users.json';
import { STORAGE_KEYS } from '@/shared/constants/storage.constants';
import type { Organization, UserRecord } from '@/shared/types/auth.types';
import type { NavigationItem } from '@/shared/types/navigation.types';
import type { Report, TenantSetting, Ticket } from '@/shared/types/domain.types';
import type { Permission, Resource, Role } from '@/shared/types/rbac.types';

export type MockDatabase = {
  organizations: Organization[];
  users: UserRecord[];
  roles: Role[];
  permissions: Permission[];
  resources: Resource[];
  navigation: NavigationItem[];
  tickets: Ticket[];
  reports: Report[];
  settings: TenantSetting[];
};

const delayMs = 180;

const createSeedDatabase = (): MockDatabase => ({
  organizations: organizationsData as Organization[],
  users: usersData as UserRecord[],
  roles: rolesData as Role[],
  permissions: permissionsData as Permission[],
  resources: resourcesData as Resource[],
  navigation: navigationData as NavigationItem[],
  tickets: ticketsData as Ticket[],
  reports: reportsData as Report[],
  settings: settingsData as TenantSetting[],
});

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const canUseStorage = (): boolean => typeof window !== 'undefined' && Boolean(window.localStorage);

const readDatabase = (): MockDatabase => {
  if (!canUseStorage()) {
    return createSeedDatabase();
  }

  const stored = window.localStorage.getItem(STORAGE_KEYS.mockDb);
  if (!stored) {
    const seed = createSeedDatabase();
    window.localStorage.setItem(STORAGE_KEYS.mockDb, JSON.stringify(seed));
    return seed;
  }

  return JSON.parse(stored) as MockDatabase;
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
  seed: async (): Promise<MockDatabase> => withDelay(writeDatabase(createSeedDatabase())),

  reset: async (): Promise<MockDatabase> => {
    if (canUseStorage()) {
      window.localStorage.removeItem(STORAGE_KEYS.mockDb);
    }

    return withDelay(writeDatabase(createSeedDatabase()));
  },

  getDatabase: async (): Promise<MockDatabase> => withDelay(clone(readDatabase())),

  updateDatabase: async (updater: (database: MockDatabase) => MockDatabase): Promise<MockDatabase> => {
    const currentDatabase = readDatabase();
    const updatedDatabase = updater(clone(currentDatabase));
    return withDelay(clone(writeDatabase(updatedDatabase)));
  },
};
