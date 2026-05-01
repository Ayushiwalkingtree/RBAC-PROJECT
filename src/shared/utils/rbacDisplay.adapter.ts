import { ACTION_LABELS, PERMISSION_KEYS, RESOURCE_TYPES } from '@/shared/constants/permission.constants';
import type { PermissionKey } from '@/shared/constants/permission.constants';
import type { ResourceRecord } from '@/shared/types/rbac.types';

export type DisplayPermissionAction = {
  label: string;
  internalResourceKey: string;
  internalPermissionKey: PermissionKey;
};

export type DisplayPermissionRow = {
  id: string;
  displayName: string;
  displayGroup: string;
  resourceType: ResourceRecord['resourceType'];
  internalResourceKey: string;
  technicalSummary: string;
  displayActions: DisplayPermissionAction[];
};

const titleCase = (value: string): string =>
  value
    .toLowerCase()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ');

const resourceKeyToLabel = (resourceKey: string): string => {
  const normalized = resourceKey.toUpperCase();
  const explicitNames: Record<string, string> = {
    USER_MENU: 'Users Menu',
    USER_LIST_API: 'Users',
    USER_CREATE_API: 'Users',
    USER_UPDATE_API: 'Users',
    USER_DELETE_API: 'Users',
    USER_EXPORT_BTN: 'Users',
    LOAN_MENU: 'Tickets Menu',
    LOAN_LIST_API: 'Tickets',
    LOAN_CREATE_API: 'Tickets',
    LOAN_APPROVE_API: 'Ticket Actions',
    LOAN_APPROVE_BTN: 'Ticket Actions',
    LOAN_REJECT_BTN: 'Ticket Actions',
    REPORTS_MENU: 'Reports Menu',
    REPORT_DAILY: 'Daily Report',
    REPORT_MONTHLY: 'Monthly Report',
    REPORT_AUDIT: 'Audit Report',
    DASH_MENU: 'Dashboard Menu',
    DASH_MAIN: 'Main Dashboard',
    DASH_RISK: 'Risk Dashboard',
    ADMIN_MENU: 'Roles Menu',
    ROLE_MANAGE_API: 'Roles',
    PERMISSIONS_MENU: 'Permissions Menu',
    PERM_GRANT_API: 'Permission Matrix',
    RESOURCE_REGISTRY_MENU: 'Resource Registry Menu',
    RESOURCE_MANAGE_API: 'Resource Registry',
    NAV_PREVIEW_MENU: 'Navigation Preview',
    SETTINGS_MENU: 'Settings Menu',
    SETTINGS_MANAGE_API: 'Settings',
  };

  return explicitNames[normalized] ?? titleCase(normalized.replace(/_(API|BTN|MENU)$/u, ''));
};

export const toBusinessGroup = (resource: ResourceRecord): string => {
  if (resource.displayCategory) return resource.displayCategory;
  if (resource.resourceGroup === 'Identity' && resource.resourceKey.includes('USER')) return 'User Management';
  if (resource.resourceGroup === 'Identity' && resource.resourceKey.includes('ROLE')) return 'Role Management';
  if (resource.resourceGroup === 'Administration' && resource.resourceKey.includes('ROLE')) return 'Role Management';
  if (resource.resourceGroup === 'Administration' && resource.resourceKey.includes('PERM')) return 'Role Management';
  if (resource.resourceGroup === 'Operations') return 'Tickets';
  if (resource.resourceGroup === 'Workspace') return 'Dashboard';
  return resource.resourceGroup;
};

export const toBusinessResourceName = (resource: ResourceRecord): string =>
  resource.displayName ?? resourceKeyToLabel(resource.resourceKey);

export const toActionLabel = (resource: ResourceRecord, permissionKey: PermissionKey): string => {
  const normalizedPermission = permissionKey.toUpperCase();
  const normalizedResource = resource.resourceKey.toUpperCase();

  if (normalizedResource === 'USER_LIST_API' && normalizedPermission === PERMISSION_KEYS.read) return 'View Users';
  if (normalizedResource === 'USER_CREATE_API' && normalizedPermission === PERMISSION_KEYS.execute) return 'Create User';
  if (normalizedResource === 'USER_UPDATE_API' && normalizedPermission === PERMISSION_KEYS.execute) return 'Edit User';
  if (normalizedResource === 'USER_DELETE_API' && normalizedPermission === PERMISSION_KEYS.execute) return 'Delete User';
  if (normalizedResource === 'USER_EXPORT_BTN' && normalizedPermission === PERMISSION_KEYS.view) return 'Export Users';
  if (normalizedResource === 'USER_LIST_API' && normalizedPermission === PERMISSION_KEYS.export) return 'Export Users';
  if (normalizedResource.includes('TICKET') && normalizedPermission === PERMISSION_KEYS.execute) {
    if (normalizedResource.includes('CREATE')) return 'Create Ticket';
    if (normalizedResource.includes('UPDATE')) return 'Edit Ticket';
    if (normalizedResource.includes('DELETE')) return 'Delete Ticket';
  }
  if (normalizedResource === 'LOAN_APPROVE_API' && normalizedPermission === PERMISSION_KEYS.approve) return 'Approve';
  if (normalizedResource === 'LOAN_APPROVE_API' && normalizedPermission === PERMISSION_KEYS.reject) return 'Reject';

  return ACTION_LABELS[normalizedPermission] ?? titleCase(normalizedPermission);
};

const mergeDisplayRows = (rows: DisplayPermissionRow[]): DisplayPermissionRow[] => {
  const merged = new Map<string, DisplayPermissionRow>();

  rows.forEach((row) => {
    const key = `${row.displayGroup}:${row.displayName}`;
    const current = merged.get(key);
    if (!current) {
      merged.set(key, row);
      return;
    }

    merged.set(key, {
      ...current,
      technicalSummary: `${current.technicalSummary}, ${row.technicalSummary}`,
      displayActions: [...current.displayActions, ...row.displayActions],
    });
  });

  return [...merged.values()].map((row) => ({
    ...row,
    displayActions: row.displayActions.filter(
      (action, index, actions) =>
        actions.findIndex(
          (candidate) =>
            candidate.label === action.label &&
            candidate.internalResourceKey === action.internalResourceKey &&
            candidate.internalPermissionKey === action.internalPermissionKey,
        ) === index,
    ),
  }));
};

export const buildDisplayPermissionRows = (resources: ResourceRecord[]): DisplayPermissionRow[] =>
  mergeDisplayRows(
    resources
      .filter((resource) => resource.isActive)
      .map((resource) => ({
        id: resource.resourceKey,
        displayName: toBusinessResourceName(resource),
        displayGroup: toBusinessGroup(resource),
        resourceType: resource.resourceType,
        internalResourceKey: resource.resourceKey,
        technicalSummary: [
          resource.resourceKey,
          resource.httpMethod,
          resource.apiPath,
          resource.microservice,
        ]
          .filter(Boolean)
          .join(' · '),
        displayActions: resource.allowedPermissions.map((permission) => ({
          label: toActionLabel(resource, permission.key),
          internalResourceKey: resource.resourceKey,
          internalPermissionKey: permission.key,
        })),
      })),
  );

export const buildReportRows = (resources: ResourceRecord[]): ResourceRecord[] =>
  resources
    .filter(
      (resource) =>
        resource.isActive &&
        resource.resourceType === RESOURCE_TYPES.report &&
        resource.resourceKey !== 'REPORTS_MENU',
    )
    .sort((current, next) => (current.sequenceNo ?? 9999) - (next.sequenceNo ?? 9999));

export const permissionLabel = (permissionKey: PermissionKey): string =>
  ACTION_LABELS[permissionKey.toUpperCase()] ?? titleCase(permissionKey);
