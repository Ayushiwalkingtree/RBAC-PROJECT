import { appendAuditLog, mockDbService } from '@/mock/services/mockDb.service';
import { apiClient, unwrapApiData, useMocks, type ApiEnvelope } from '@/shared/api/apiClient';
import type { Organization } from '@/shared/types/auth.types';
import type { RefreshTokenRecord, TenantSetting } from '@/shared/types/domain.types';

export type OrganizationSettingsInput = Pick<
  Organization,
  'name' | 'timezone' | 'logoUrl' | 'supportEmail' | 'allowedOrigins'
> & {
  actorUserId?: string;
  actorEmail?: string;
};

type BackendOrganization = {
  id: number;
  org_id?: number | null;
  org_name: string;
  org_code: string;
  timezone?: string | null;
  plan: string;
  settings_json?: {
    timezone?: string;
    logo_url?: string;
    support_email?: string;
    allowed_origins?: string[];
    [key: string]: unknown;
  };
  logo_url?: string | null;
  support_email?: string | null;
  allowed_origins?: string[];
  is_verified: boolean;
};

const mapBackendOrganization = (org: BackendOrganization): Organization => {
  const settings = org.settings_json ?? {};

  return {
    id: String(org.org_id ?? org.id),
    code: org.org_code,
    name: org.org_name,
    status: 'active',
    timezone: settings.timezone ?? org.timezone ?? undefined,
    plan: org.plan,
    logoUrl: settings.logo_url ?? org.logo_url ?? undefined,
    supportEmail: settings.support_email ?? org.support_email ?? undefined,
    allowedOrigins: settings.allowed_origins ?? org.allowed_origins ?? [],
  };
};

export const organizationService = {
  listOrganizationSettings: async (orgId: string): Promise<TenantSetting[]> => {
    if (!useMocks) {
      return [];
    }

    const database = await mockDbService.getDatabase();
    return database.settings.filter((setting) => setting.orgId === orgId);
  },

  getOrganization: async (orgId: string): Promise<Organization> => {
    if (!useMocks) {
      const response = await apiClient.get<ApiEnvelope<BackendOrganization>>('/organization');
      return mapBackendOrganization(unwrapApiData(response.data));
    }

    const database = await mockDbService.getDatabase();
    const org = database.organizations.find((candidate) => candidate.id === orgId);
    if (!org) {
      throw new Error('Organization was not found.');
    }
    return org;
  },

  updateOrganization: async (orgId: string, input: OrganizationSettingsInput): Promise<Organization> => {
    if (!useMocks) {
      const settingsJson = {
        timezone: input.timezone?.trim() || undefined,
        logo_url: input.logoUrl?.trim() || undefined,
        support_email: input.supportEmail?.trim() || undefined,
        allowed_origins: input.allowedOrigins?.map((origin) => origin.trim()).filter(Boolean) ?? [],
      };
      const response = await apiClient.put<ApiEnvelope<BackendOrganization>>('/organization', {
        org_name: input.name.trim(),
        timezone: settingsJson.timezone,
        logo_url: settingsJson.logo_url,
        support_email: settingsJson.support_email,
        allowed_origins: settingsJson.allowed_origins,
        settings_json: settingsJson,
      });
      return mapBackendOrganization(unwrapApiData(response.data));
    }

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
    if (!useMocks) {
      return [];
    }

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
    if (!useMocks) {
      return [];
    }

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

  resetMockDatabase: async () => {
    if (!useMocks) {
      throw new Error('Mock reset is only available when VITE_USE_MOCKS=true.');
    }

    return mockDbService.reset();
  },
};
