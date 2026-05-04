import { apiClient, unwrapApiData, type ApiEnvelope } from '@/shared/api/apiClient';
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
    void orgId;
    return [];
  },

  getOrganization: async (orgId?: string): Promise<Organization> => {
    void orgId;
    const response = await apiClient.get<ApiEnvelope<BackendOrganization>>('/organization');
    return mapBackendOrganization(unwrapApiData(response.data));
  },

  updateOrganization: async (_orgId: string, input: OrganizationSettingsInput): Promise<Organization> => {
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
  },

  listActiveSessions: async (orgId: string, userId: string): Promise<RefreshTokenRecord[]> => {
    void orgId;
    void userId;
    return [];
  },

  updateOrganizationSettings: async (
    _orgId: string,
    settings: Array<Pick<TenantSetting, 'key' | 'value'>>,
  ): Promise<TenantSetting[]> =>
    settings.map((setting) => ({
      orgId: _orgId,
      key: setting.key.trim(),
      value: setting.value.trim(),
    })),
};
