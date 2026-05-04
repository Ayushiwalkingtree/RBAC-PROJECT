import type { ResourceFormValues } from '@/features/resources/resource.schema';
import { normalizeResourceFormValues } from '@/features/resources/resourceForm.utils';
import { ACTION_LABELS } from '@/shared/constants/permission.constants';
import { apiClient, unwrapApiData, type ApiEnvelope } from '@/shared/api/apiClient';
import type { ResourceRecord } from '@/shared/types/rbac.types';

type ResourceActor = {
  isPlatformSuperAdmin: boolean;
  userId?: string;
  email?: string;
};

type BackendResource = {
  id: number;
  resource_id?: number | null;
  resource_key: string;
  resource_name: string;
  resource_type: string;
  resource_group: string;
  description?: string | null;
  allowed_permissions: string[];
  http_method?: string | null;
  api_path?: string | null;
  microservice?: string | null;
  is_ui_visible: boolean;
  is_active: boolean;
  ui_path?: string | null;
  icon?: string | null;
  sequence_no?: number | null;
  parent_resource_key?: string | null;
};

const mapBackendResource = (resource: BackendResource): ResourceRecord => ({
  id: String(resource.resource_id ?? resource.id),
  resourceKey: resource.resource_key,
  resourceName: resource.resource_name,
  resourceType: resource.resource_type as ResourceRecord['resourceType'],
  resourceGroup: resource.resource_group,
  description: resource.description ?? `${resource.resource_name} access`,
  displayName: resource.resource_name,
  displayCategory: resource.resource_group,
  allowedPermissions: resource.allowed_permissions.map((permission) => ({
    key: permission,
    label: ACTION_LABELS[permission] ?? permission,
  })),
  sequenceNo: resource.sequence_no ?? undefined,
  parentResourceKey: resource.parent_resource_key ?? undefined,
  httpMethod: (resource.http_method ?? undefined) as ResourceRecord['httpMethod'],
  apiPath: resource.api_path ?? undefined,
  microservice: resource.microservice ?? undefined,
  isUiVisible: resource.is_ui_visible,
  isActive: resource.is_active,
  uiPath: resource.ui_path ?? undefined,
  icon: resource.icon ?? undefined,
});

const toBackendPayload = (values: ResourceFormValues) => {
  const normalized = normalizeResourceFormValues(values);
  return {
    ...normalized,
    allowed_permissions: normalized.allowed_permissions.map((permission) => permission.key),
    parent_resource_key: normalized.parent_resource_key || undefined,
    http_method: normalized.http_method || undefined,
    api_path: normalized.api_path || undefined,
    microservice: normalized.microservice || undefined,
  };
};

const ensurePlatformSuperAdmin = (actor?: ResourceActor) => {
  if (!actor?.isPlatformSuperAdmin) {
    throw new Error('Only platform super admin can manage resources.');
  }
};

export const resourceService = {
  listResources: async (): Promise<ResourceRecord[]> => {
    const response = await apiClient.get<ApiEnvelope<BackendResource[]>>('/resources');
    return unwrapApiData(response.data).map(mapBackendResource);
  },

  createResource: async (values: ResourceFormValues, actor?: ResourceActor): Promise<ResourceRecord> => {
    ensurePlatformSuperAdmin(actor);
    const response = await apiClient.post<ApiEnvelope<BackendResource>>('/resources', toBackendPayload(values));
    return mapBackendResource(unwrapApiData(response.data));
  },

  updateResource: async (resourceId: string, values: ResourceFormValues, actor?: ResourceActor): Promise<ResourceRecord> => {
    ensurePlatformSuperAdmin(actor);
    const response = await apiClient.put<ApiEnvelope<BackendResource>>(`/resources/${resourceId}`, toBackendPayload(values));
    return mapBackendResource(unwrapApiData(response.data));
  },

  deleteResource: async (resourceId: string, actor?: ResourceActor): Promise<void> => {
    ensurePlatformSuperAdmin(actor);
    const response = await apiClient.delete<ApiEnvelope<{ deleted: boolean }>>(`/resources/${resourceId}`);
    unwrapApiData(response.data);
  },

  updateNavigationOrder: async (
    updates: Array<Pick<ResourceRecord, 'id' | 'parentResourceKey' | 'sequenceNo'>>,
  ): Promise<ResourceRecord[]> => {
    await Promise.all(
      updates.map((update) =>
        apiClient.put(`/resources/${update.id}`, {
          parent_resource_key: update.parentResourceKey || null,
          sequence_no: update.sequenceNo,
        }),
      ),
    );
    return resourceService.listResources();
  },
};
