import {
  ACTION_LABELS,
  DEFAULT_ACTIONS_BY_RESOURCE_TYPE,
  PERMISSION_KEYS,
  RESOURCE_GROUP_OPTIONS,
  RESOURCE_TYPES,
} from '@/shared/constants/permission.constants';
import type { ResourceFormValues } from '@/features/resources/resource.schema';
import type { ResourceRecord } from '@/shared/types/rbac.types';

export const createResourceKey = (
  _moduleName: string,
  resourceName: string,
  resourceType: string,
): string => {
  const words = resourceName
    .replace(/management/giu, '')
    .replace(/[^a-z0-9]+/giu, ' ')
    .trim()
    .split(/\s+/u)
    .filter(Boolean);
  const base = [...new Set(words.map((word) => word.toUpperCase()))].join('_');

  if (resourceType === RESOURCE_TYPES.menu) return `${base}_MENU`;
  if (resourceType === RESOURCE_TYPES.button) return `${base}_BTN`;
  if (resourceType === RESOURCE_TYPES.action) return `${base}_ACTION`;
  return base;
};

const slugifyResourceName = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-|-$/gu, '');

const defaultUiPath = (resourceName: string, resourceKey: string, resourceType: string): string => {
  const slug = slugifyResourceName(resourceName) || resourceKey.toLowerCase();
  if (resourceType === RESOURCE_TYPES.report) return `/reports/${slug}`;
  if (resourceType === RESOURCE_TYPES.dashboard) return `/dashboard/${slug}`;
  return `/${slug}`;
};

export const toPermissionDefinitions = (actions: string[]) =>
  actions.map((action) => ({
    key: action,
    label: ACTION_LABELS[action] ?? action,
  }));

export const emptyResourceFormValues: ResourceFormValues = {
  resource_key: '',
  resource_name: '',
  resource_type: RESOURCE_TYPES.menu,
  resource_group: RESOURCE_GROUP_OPTIONS[0],
  description: '',
  sequence_no: undefined,
  parent_resource_key: '',
  ui_path: '',
  http_method: '',
  api_path: '',
  microservice: '',
  is_ui_visible: true,
  is_active: true,
  allowed_permissions: toPermissionDefinitions(DEFAULT_ACTIONS_BY_RESOURCE_TYPE.MENU),
};

export const valuesFromResource = (resource: ResourceRecord): ResourceFormValues => ({
  resource_key: resource.resourceKey,
  resource_name: resource.displayName ?? resource.resourceName,
  resource_type:
    resource.resourceType === RESOURCE_TYPES.api ? RESOURCE_TYPES.action : resource.resourceType,
  resource_group: resource.displayCategory ?? resource.resourceGroup,
  description: resource.description,
  sequence_no: resource.sequenceNo,
  parent_resource_key: resource.parentResourceKey ?? '',
  ui_path: resource.uiPath ?? '',
  http_method: resource.httpMethod ?? '',
  api_path: resource.apiPath ?? '',
  microservice: resource.microservice ?? '',
  is_ui_visible: resource.isUiVisible,
  is_active: resource.isActive,
  allowed_permissions: resource.allowedPermissions.length
    ? resource.allowedPermissions
    : toPermissionDefinitions([PERMISSION_KEYS.view]),
});

export const normalizeResourceFormValues = (values: ResourceFormValues): ResourceFormValues => {
  const resourceKey =
    values.resource_key?.trim() ||
    createResourceKey(values.resource_group, values.resource_name, values.resource_type);
  const navigableTypes = new Set<string>([
    RESOURCE_TYPES.menu,
    RESOURCE_TYPES.page,
    RESOURCE_TYPES.dashboard,
    RESOURCE_TYPES.report,
  ]);
  const isNavigable = navigableTypes.has(values.resource_type);
  const uiPath = values.ui_path?.trim() || (values.is_ui_visible && isNavigable
    ? defaultUiPath(values.resource_name, resourceKey, values.resource_type)
    : '');

  return {
    ...values,
    resource_key: resourceKey,
    ui_path: uiPath,
    description: values.description?.trim() || `${values.resource_name.trim()} access`,
    allowed_permissions: values.allowed_permissions.map((permission) => ({
      key: permission.key.toUpperCase(),
      label: ACTION_LABELS[permission.key.toUpperCase()] ?? permission.key,
    })),
  };
};
