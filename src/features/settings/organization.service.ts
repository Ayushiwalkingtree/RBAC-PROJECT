import { mockDbService } from '@/mock/services/mockDb.service';
import type { TenantSetting } from '@/shared/types/domain.types';

export const organizationService = {
  listOrganizationSettings: async (orgId: string): Promise<TenantSetting[]> => {
    const database = await mockDbService.getDatabase();
    return database.settings.filter((setting) => setting.orgId === orgId);
  },

  updateOrganizationSettings: async (
    orgId: string,
    settings: Array<Pick<TenantSetting, 'key' | 'value'>>,
  ): Promise<TenantSetting[]> => {
    const normalizedSettings = settings.map((setting) => ({
      orgId,
      key: setting.key.trim(),
      value: setting.value.trim(),
    }));

    await mockDbService.updateDatabase((database) => ({
      ...database,
      settings: [
        ...database.settings.filter((setting) => setting.orgId !== orgId),
        ...normalizedSettings,
      ],
    }));

    return normalizedSettings;
  },

  resetMockDatabase: async () => mockDbService.reset(),
};
