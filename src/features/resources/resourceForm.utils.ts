import { RESOURCE_TYPES } from '@/shared/constants/permission.constants';
import type { ResourceFormValues } from '@/features/resources/resource.schema';
import type { ResourceRecord } from '@/shared/types/rbac.types';

export const emptyResourceFormValues: ResourceFormValues = {
  resource_key: '',
  resource_name: '',
  resource_type: RESOURCE_TYPES.menu,
  resource_group: '',
  description: '',
  sequence_no: undefined,
  parent_resource_key: '',
  http_method: undefined,
  api_path: '',
  microservice: '',
  is_ui_visible: true,
  is_active: true,
  allowed_permissions: [{ key: 'VIEW', label: 'View' }],
};

export const valuesFromResource = (resource: ResourceRecord): ResourceFormValues => ({
  resource_key: resource.resourceKey,
  resource_name: resource.resourceName,
  resource_type: resource.resourceType,
  resource_group: resource.resourceGroup,
  description: resource.description,
  sequence_no: resource.sequenceNo,
  parent_resource_key: resource.parentResourceKey ?? '',
  http_method: resource.httpMethod,
  api_path: resource.apiPath ?? '',
  microservice: resource.microservice ?? '',
  is_ui_visible: resource.isUiVisible,
  is_active: resource.isActive,
  allowed_permissions: resource.allowedPermissions,
});
