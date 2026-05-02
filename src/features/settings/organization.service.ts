import { appendAuditLog, mockDbService } from '@/mock/services/mockDb.service';
import type { Organization } from '@/shared/types/auth.types';
import type { RefreshTokenRecord, TenantSetting } from '@/shared/types/domain.types';

export type OrganizationSettingsInput = Pick<
  Organization,
  'name' | 'timezone' | 'logoUrl' | 'supportEmail' | 'allowedOrigins'
> & {
  actorUserId?: string;
  actorEmail?: string;
};

export const organizationService = {
  listOrganizationSettings: async (orgId: string): Promise<TenantSetting[]> => {
    const database = await mockDbService.getDatabase();
    return database.settings.filter((setting) => setting.orgId === orgId);
  },

  getOrganization: async (orgId: string): Promise<Organization> => {
    const database = await mockDbService.getDatabase();
    const org = database.organizations.find((candidate) => candidate.id === orgId);
    if (!org) {
      throw new Error('Organization was not found.');
    }
    return org;
  },

  updateOrganization: async (orgId: string, input: OrganizationSettingsInput): Promise<Organization> => {
    let updatedOrg: Organization | null = null;

    await mockDbService.updateDatabase((database) => {
      const org = database.organizations.find((candidate) => candidate.id === orgId);
      if (!org) {
        throw new Error('Organization was not found.');
      }

      updatedOrg = {
        ...org,
        name: input.name.trim(),
        timezone: input.timezone?.trim(),
        logoUrl: input.logoUrl?.trim(),
        supportEmail: input.supportEmail?.trim(),
        allowedOrigins: input.allowedOrigins?.map((origin) => origin.trim()).filter(Boolean) ?? [],
        updatedAt: new Date().toISOString(),
      };

      return appendAuditLog(
        {
          ...database,
          organizations: database.organizations.map((candidate) =>
            candidate.id === orgId ? updatedOrg as Organization : candidate,
          ),
        },
        {
          orgId,
          action: 'ORG_UPDATED',
          actorUserId: input.actorUserId,
          actorEmail: input.actorEmail,
          resourceType: 'ORGANIZATION',
          resourceId: orgId,
          message: `${updatedOrg.name} settings were updated.`,
        },
      );
    });

    if (!updatedOrg) {
      throw new Error('Unable to update organization.');
    }

    return updatedOrg;
  },

  listActiveSessions: async (orgId: string, userId: string): Promise<RefreshTokenRecord[]> => {
    const database = await mockDbService.getDatabase();
    return database.refreshTokens
      .filter(
        (token) =>
          token.orgId === orgId &&
          token.userId === userId &&
          !token.revokedAt &&
          new Date(token.expiresAt).getTime() > Date.now(),
      )
      .sort((current, next) => next.createdAt.localeCompare(current.createdAt));
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
