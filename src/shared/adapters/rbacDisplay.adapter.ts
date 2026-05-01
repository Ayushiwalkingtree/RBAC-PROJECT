import {
  ACTION_LABELS,
  PERMISSION_KEYS,
  RESOURCE_KEYS,
  RESOURCE_TYPES,
} from '@/shared/constants/permission.constants';
import type { PermissionKey, ResourceKey } from '@/shared/constants/permission.constants';
import type { ResourceRecord, RolePermissionGrants } from '@/shared/types/rbac.types';

export type InternalPermissionGrant = {
  resource: ResourceKey;
  permission: PermissionKey;
};

export type BusinessPermissionAction = {
  id: string;
  label: string;
  grants: InternalPermissionGrant[];
};

export type BusinessPermissionRow = {
  id: string;
  displayGroup: string;
  displayName: string;
  displayType: string;
  description: string;
  actions: BusinessPermissionAction[];
  technicalResourceKeys: ResourceKey[];
};

const INTERNAL_SUFFIX_PATTERN = /_(API|BTN|BUTTON)$/u;

const titleCase = (value: string): string =>
  value
    .toLowerCase()
    .split(/[\s_-]+/u)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ');

const hasAnyResource = (resourcesByKey: Map<string, ResourceRecord>, keys: ResourceKey[]): boolean =>
  keys.some((key) => resourcesByKey.has(key));

const action = (
  id: string,
  label: string,
  grants: InternalPermissionGrant[],
): BusinessPermissionAction => ({ id, label, grants });

const row = (
  id: string,
  displayGroup: string,
  displayName: string,
  displayType: string,
  description: string,
  actions: BusinessPermissionAction[],
  technicalResourceKeys: ResourceKey[],
): BusinessPermissionRow => ({
  id,
  displayGroup,
  displayName,
  displayType,
  description,
  actions,
  technicalResourceKeys,
});

const getAllowedActions = (resource: ResourceRecord): BusinessPermissionAction[] =>
  resource.allowedPermissions.map((permission) =>
    action(
      `${resource.resourceKey}:${permission.key}`,
      ACTION_LABELS[permission.key.toUpperCase()] ?? titleCase(permission.key),
      [{ resource: resource.resourceKey, permission: permission.key }],
    ),
  );

const actionIfAvailable = (
  resourcesByKey: Map<string, ResourceRecord>,
  id: string,
  label: string,
  grants: InternalPermissionGrant[],
): BusinessPermissionAction | null => {
  const availableGrants = grants.filter((grant) => {
    const resource = resourcesByKey.get(grant.resource);
    return resource?.allowedPermissions.some((permission) => permission.key === grant.permission);
  });

  return availableGrants.length > 0 ? action(id, label, availableGrants) : null;
};

const compactActions = (actions: Array<BusinessPermissionAction | null>): BusinessPermissionAction[] =>
  actions.filter((item): item is BusinessPermissionAction => Boolean(item));

const toDisplayGroup = (resource: ResourceRecord): string => {
  if (resource.displayCategory) return resource.displayCategory;
  if (resource.resourceGroup === 'Identity') return 'Identity';
  if (resource.resourceGroup === 'Administration') return 'Admin';
  if (resource.resourceGroup === 'Operations') return 'Tickets';
  if (resource.resourceGroup === 'Workspace') return 'Dashboard';
  return resource.resourceGroup;
};

export const toBusinessResourceName = (resource: ResourceRecord): string =>
  resource.displayName ?? resource.resourceName ?? titleCase(resource.resourceKey.replace(INTERNAL_SUFFIX_PATTERN, ''));

export const isTechnicalResource = (resource: ResourceRecord): boolean =>
  resource.resourceType === RESOURCE_TYPES.api ||
  resource.resourceType === RESOURCE_TYPES.button ||
  INTERNAL_SUFFIX_PATTERN.test(resource.resourceKey);

export const getTechnicalSummary = (resources: ResourceRecord[], resourceKeys: ResourceKey[]): string =>
  resourceKeys
    .map((resourceKey) => {
      const resource = resources.find((candidate) => candidate.resourceKey === resourceKey);
      return [resourceKey, resource?.httpMethod, resource?.apiPath, resource?.microservice]
        .filter(Boolean)
        .join(' | ');
    })
    .join('\n');

export const isBusinessActionSelected = (
  grants: RolePermissionGrants,
  actionItem: BusinessPermissionAction,
): boolean =>
  actionItem.grants.every((grant) => grants[grant.resource]?.includes(grant.permission));

export const applyBusinessActionToggle = (
  grants: RolePermissionGrants,
  actionItem: BusinessPermissionAction,
): RolePermissionGrants => {
  const shouldRemove = isBusinessActionSelected(grants, actionItem);
  const nextGrants: RolePermissionGrants = { ...grants };

  actionItem.grants.forEach((grant) => {
    const currentPermissions = new Set(nextGrants[grant.resource] ?? []);

    if (shouldRemove) {
      currentPermissions.delete(grant.permission);
    } else {
      currentPermissions.add(grant.permission);
    }

    if (currentPermissions.size === 0) {
      delete nextGrants[grant.resource];
      return;
    }

    nextGrants[grant.resource] = [...currentPermissions].sort();
  });

  return nextGrants;
};

export const buildBusinessPermissionRows = (resources: ResourceRecord[]): BusinessPermissionRow[] => {
  const activeResources = resources.filter((resource) => resource.isActive);
  const resourcesByKey = new Map(activeResources.map((resource) => [resource.resourceKey, resource]));
  const rows: BusinessPermissionRow[] = [];

  if (hasAnyResource(resourcesByKey, [RESOURCE_KEYS.dashboardMenu, RESOURCE_KEYS.dashboardMain])) {
    rows.push(
      row(
        'dashboard',
        'Dashboard',
        'Dashboard',
        'Feature',
        'Dashboard access',
        compactActions([
          actionIfAvailable(resourcesByKey, 'view-dashboard', 'View Dashboard', [
            { resource: RESOURCE_KEYS.dashboardMenu, permission: PERMISSION_KEYS.view },
            { resource: RESOURCE_KEYS.dashboardMain, permission: PERMISSION_KEYS.view },
          ]),
        ]),
        [RESOURCE_KEYS.dashboardMenu, RESOURCE_KEYS.dashboardMain],
      ),
    );
  }

  if (
    hasAnyResource(resourcesByKey, [
      RESOURCE_KEYS.userMenu,
      RESOURCE_KEYS.userListApi,
      RESOURCE_KEYS.userCreateApi,
      RESOURCE_KEYS.userUpdateApi,
      RESOURCE_KEYS.userDeleteApi,
      RESOURCE_KEYS.userExportButton,
    ])
  ) {
    rows.push(
      row(
        'identity-users',
        'Identity',
        'Users',
        'Feature',
        'User administration permissions',
        compactActions([
          actionIfAvailable(resourcesByKey, 'view-users', 'View Users', [
            { resource: RESOURCE_KEYS.userMenu, permission: PERMISSION_KEYS.view },
            { resource: RESOURCE_KEYS.userMenu, permission: PERMISSION_KEYS.read },
            { resource: RESOURCE_KEYS.userListApi, permission: PERMISSION_KEYS.read },
          ]),
          actionIfAvailable(resourcesByKey, 'create-user', 'Create User', [
            { resource: RESOURCE_KEYS.userCreateApi, permission: PERMISSION_KEYS.execute },
            { resource: RESOURCE_KEYS.userMenu, permission: PERMISSION_KEYS.create },
          ]),
          actionIfAvailable(resourcesByKey, 'edit-user', 'Edit User', [
            { resource: RESOURCE_KEYS.userUpdateApi, permission: PERMISSION_KEYS.execute },
            { resource: RESOURCE_KEYS.userMenu, permission: PERMISSION_KEYS.update },
          ]),
          actionIfAvailable(resourcesByKey, 'delete-user', 'Delete User', [
            { resource: RESOURCE_KEYS.userDeleteApi, permission: PERMISSION_KEYS.execute },
            { resource: RESOURCE_KEYS.userMenu, permission: PERMISSION_KEYS.delete },
          ]),
          actionIfAvailable(resourcesByKey, 'export-users', 'Export Users', [
            { resource: RESOURCE_KEYS.userExportButton, permission: PERMISSION_KEYS.view },
            { resource: RESOURCE_KEYS.userListApi, permission: PERMISSION_KEYS.export },
          ]),
        ]),
        [
          RESOURCE_KEYS.userMenu,
          RESOURCE_KEYS.userListApi,
          RESOURCE_KEYS.userCreateApi,
          RESOURCE_KEYS.userUpdateApi,
          RESOURCE_KEYS.userDeleteApi,
          RESOURCE_KEYS.userExportButton,
        ],
      ),
    );
  }

  if (hasAnyResource(resourcesByKey, [RESOURCE_KEYS.adminMenu, RESOURCE_KEYS.roleManageApi])) {
    rows.push(
      row(
        'admin-roles',
        'Admin',
        'Roles',
        'Feature',
        'Role management permissions',
        compactActions([
          actionIfAvailable(resourcesByKey, 'view-roles', 'View Roles', [
            { resource: RESOURCE_KEYS.adminMenu, permission: PERMISSION_KEYS.view },
            { resource: RESOURCE_KEYS.roleManageApi, permission: PERMISSION_KEYS.read },
          ]),
          actionIfAvailable(resourcesByKey, 'create-role', 'Create Role', [
            { resource: RESOURCE_KEYS.roleManageApi, permission: PERMISSION_KEYS.create },
          ]),
          actionIfAvailable(resourcesByKey, 'edit-role', 'Edit Role', [
            { resource: RESOURCE_KEYS.roleManageApi, permission: PERMISSION_KEYS.update },
          ]),
          actionIfAvailable(resourcesByKey, 'delete-role', 'Delete Role', [
            { resource: RESOURCE_KEYS.roleManageApi, permission: PERMISSION_KEYS.delete },
          ]),
        ]),
        [RESOURCE_KEYS.adminMenu, RESOURCE_KEYS.roleManageApi],
      ),
    );
  }

  if (hasAnyResource(resourcesByKey, [RESOURCE_KEYS.permissionsMenu, RESOURCE_KEYS.permissionGrantApi])) {
    rows.push(
      row(
        'admin-permission-matrix',
        'Admin',
        'Permission Matrix',
        'Feature',
        'Role permission configuration',
        compactActions([
          actionIfAvailable(resourcesByKey, 'view-permissions', 'View Permissions', [
            { resource: RESOURCE_KEYS.permissionsMenu, permission: PERMISSION_KEYS.view },
          ]),
          actionIfAvailable(resourcesByKey, 'configure-permissions', 'Configure Permissions', [
            { resource: RESOURCE_KEYS.permissionGrantApi, permission: PERMISSION_KEYS.configure },
          ]),
        ]),
        [RESOURCE_KEYS.permissionsMenu, RESOURCE_KEYS.permissionGrantApi],
      ),
    );
  }

  if (hasAnyResource(resourcesByKey, [RESOURCE_KEYS.resourceRegistryMenu, RESOURCE_KEYS.resourceManageApi])) {
    rows.push(
      row(
        'admin-resource-registry',
        'Admin',
        'Resource Registry',
        'Feature',
        'Resource registry administration',
        compactActions([
          actionIfAvailable(resourcesByKey, 'view-resource-registry', 'View Resource Registry', [
            { resource: RESOURCE_KEYS.resourceRegistryMenu, permission: PERMISSION_KEYS.view },
          ]),
          actionIfAvailable(resourcesByKey, 'create-resource', 'Create Resource', [
            { resource: RESOURCE_KEYS.resourceManageApi, permission: PERMISSION_KEYS.create },
          ]),
          actionIfAvailable(resourcesByKey, 'edit-resource', 'Edit Resource', [
            { resource: RESOURCE_KEYS.resourceManageApi, permission: PERMISSION_KEYS.update },
          ]),
          actionIfAvailable(resourcesByKey, 'delete-resource', 'Delete Resource', [
            { resource: RESOURCE_KEYS.resourceManageApi, permission: PERMISSION_KEYS.delete },
          ]),
        ]),
        [RESOURCE_KEYS.resourceRegistryMenu, RESOURCE_KEYS.resourceManageApi],
      ),
    );
  }

  if (hasAnyResource(resourcesByKey, [RESOURCE_KEYS.navPreviewMenu])) {
    rows.push(
      row(
        'admin-nav-preview',
        'Admin',
        'Nav Preview',
        'Feature',
        'Preview user navigation from permissions',
        compactActions([
          actionIfAvailable(resourcesByKey, 'view-nav-preview', 'View Nav Preview', [
            { resource: RESOURCE_KEYS.navPreviewMenu, permission: PERMISSION_KEYS.view },
          ]),
        ]),
        [RESOURCE_KEYS.navPreviewMenu],
      ),
    );
  }

  if (hasAnyResource(resourcesByKey, [RESOURCE_KEYS.settingsMenu, RESOURCE_KEYS.settingsManageApi])) {
    rows.push(
      row(
        'admin-settings',
        'Admin',
        'Settings',
        'Feature',
        'Tenant settings',
        compactActions([
          actionIfAvailable(resourcesByKey, 'view-settings', 'View Settings', [
            { resource: RESOURCE_KEYS.settingsMenu, permission: PERMISSION_KEYS.view },
          ]),
          actionIfAvailable(resourcesByKey, 'edit-settings', 'Edit Settings', [
            { resource: RESOURCE_KEYS.settingsManageApi, permission: PERMISSION_KEYS.update },
          ]),
        ]),
        [RESOURCE_KEYS.settingsMenu, RESOURCE_KEYS.settingsManageApi],
      ),
    );
  }


  if (hasAnyResource(resourcesByKey, [RESOURCE_KEYS.loanMenu, RESOURCE_KEYS.loanListApi, RESOURCE_KEYS.ticketMenu])) {
    rows.push(
      row(
        'tickets',
        'Tickets',
        'Tickets',
        'Feature',
        'Ticket workflow permissions',
        compactActions([
          actionIfAvailable(resourcesByKey, 'view-tickets', 'View Tickets', [
            { resource: RESOURCE_KEYS.ticketMenu, permission: PERMISSION_KEYS.view },
            { resource: RESOURCE_KEYS.ticketMenu, permission: PERMISSION_KEYS.read },
            { resource: RESOURCE_KEYS.ticketListApi, permission: PERMISSION_KEYS.read },
            { resource: RESOURCE_KEYS.loanMenu, permission: PERMISSION_KEYS.view },
            { resource: RESOURCE_KEYS.loanMenu, permission: PERMISSION_KEYS.read },
            { resource: RESOURCE_KEYS.loanListApi, permission: PERMISSION_KEYS.read },
          ]),
          actionIfAvailable(resourcesByKey, 'create-ticket', 'Create Ticket', [
            { resource: RESOURCE_KEYS.ticketCreateApi, permission: PERMISSION_KEYS.execute },
            { resource: RESOURCE_KEYS.ticketMenu, permission: PERMISSION_KEYS.create },
            { resource: RESOURCE_KEYS.loanCreateApi, permission: PERMISSION_KEYS.execute },
            { resource: RESOURCE_KEYS.loanMenu, permission: PERMISSION_KEYS.create },
          ]),
          actionIfAvailable(resourcesByKey, 'edit-ticket', 'Edit Ticket', [
            { resource: RESOURCE_KEYS.ticketUpdateApi, permission: PERMISSION_KEYS.execute },
            { resource: RESOURCE_KEYS.ticketMenu, permission: PERMISSION_KEYS.update },
            { resource: RESOURCE_KEYS.loanMenu, permission: PERMISSION_KEYS.update },
          ]),
          actionIfAvailable(resourcesByKey, 'delete-ticket', 'Delete Ticket', [
            { resource: RESOURCE_KEYS.ticketDeleteApi, permission: PERMISSION_KEYS.execute },
            { resource: RESOURCE_KEYS.ticketMenu, permission: PERMISSION_KEYS.delete },
            { resource: RESOURCE_KEYS.loanMenu, permission: PERMISSION_KEYS.delete },
          ]),
          actionIfAvailable(resourcesByKey, 'assign-ticket', 'Assign Ticket', [
            { resource: RESOURCE_KEYS.loanApproveButton, permission: PERMISSION_KEYS.view },
          ]),
          actionIfAvailable(resourcesByKey, 'approve-ticket', 'Approve Ticket', [
            { resource: RESOURCE_KEYS.loanApproveApi, permission: PERMISSION_KEYS.approve },
          ]),
          actionIfAvailable(resourcesByKey, 'reject-ticket', 'Reject Ticket', [
            { resource: RESOURCE_KEYS.loanApproveApi, permission: PERMISSION_KEYS.reject },
          ]),
        ]),
        [
          RESOURCE_KEYS.loanMenu,
          RESOURCE_KEYS.loanListApi,
          RESOURCE_KEYS.loanCreateApi,
          RESOURCE_KEYS.loanApproveApi,
          RESOURCE_KEYS.loanApproveButton,
          RESOURCE_KEYS.loanRejectButton,
          RESOURCE_KEYS.ticketMenu,
          RESOURCE_KEYS.ticketListApi,
          RESOURCE_KEYS.ticketCreateApi,
          RESOURCE_KEYS.ticketUpdateApi,
          RESOURCE_KEYS.ticketDeleteApi,
        ],
      ),
    );
  }

  if (hasAnyResource(resourcesByKey, [RESOURCE_KEYS.reportsMenu])) {
    rows.push(
      row(
        'reports-menu',
        'Reports',
        'Reports',
        'Feature',
        'Reports navigation',
        compactActions([
          actionIfAvailable(resourcesByKey, 'view-reports', 'View Reports', [
            { resource: RESOURCE_KEYS.reportsMenu, permission: PERMISSION_KEYS.view },
          ]),
        ]),
        [RESOURCE_KEYS.reportsMenu],
      ),
    );
  }

  activeResources
    .filter((resource) => resource.resourceType === RESOURCE_TYPES.report && resource.resourceKey !== RESOURCE_KEYS.reportsMenu)
    .forEach((resource) => {
      rows.push(
        row(
          `report-${resource.resourceKey}`,
          'Reports',
          toBusinessResourceName(resource),
          'Report',
          resource.description,
          getAllowedActions(resource).map((item) => ({
            ...item,
            label:
              item.label === ACTION_LABELS.VIEW
                ? `View ${toBusinessResourceName(resource)}`
                : item.label === ACTION_LABELS.DOWNLOAD
                  ? `Download ${toBusinessResourceName(resource)}`
                  : item.label,
          })),
          [resource.resourceKey],
        ),
      );
    });

  activeResources
    .filter((resource) => !isTechnicalResource(resource))
    .filter((resource) => {
      const hiddenBusinessKeys = new Set<string>([
        RESOURCE_KEYS.userMenu,
        RESOURCE_KEYS.loanMenu,
        RESOURCE_KEYS.reportsMenu,
        RESOURCE_KEYS.adminMenu,
        RESOURCE_KEYS.permissionsMenu,
        RESOURCE_KEYS.dashboardMenu,
        RESOURCE_KEYS.dashboardMain,
        RESOURCE_KEYS.dashboardRisk,
        RESOURCE_KEYS.resourceRegistryMenu,
        RESOURCE_KEYS.navPreviewMenu,
        RESOURCE_KEYS.settingsMenu,
      ]);
      return !hiddenBusinessKeys.has(resource.resourceKey);
    })
    .filter((resource) => resource.resourceType !== RESOURCE_TYPES.report)
    .forEach((resource) => {
      rows.push(
        row(
          `resource-${resource.resourceKey}`,
          toDisplayGroup(resource),
          toBusinessResourceName(resource),
          resource.resourceType,
          resource.description,
          getAllowedActions(resource),
          [resource.resourceKey],
        ),
      );
    });

  return rows;
};

export const buildTechnicalPermissionRows = (resources: ResourceRecord[]): BusinessPermissionRow[] =>
  resources
    .filter((resource) => resource.isActive)
    .map((resource) =>
      row(
        `technical-${resource.resourceKey}`,
        toDisplayGroup(resource),
        toBusinessResourceName(resource),
        resource.resourceType,
        resource.description,
        getAllowedActions(resource),
        [resource.resourceKey],
      ),
    );

export const buildReportRows = (resources: ResourceRecord[]): ResourceRecord[] =>
  resources
    .filter(
      (resource) =>
        resource.isActive &&
        resource.resourceType === RESOURCE_TYPES.report &&
        resource.resourceKey !== RESOURCE_KEYS.reportsMenu,
    )
    .sort((current, next) => (current.sequenceNo ?? 9999) - (next.sequenceNo ?? 9999));

export const permissionLabel = (permissionKey: PermissionKey): string =>
  ACTION_LABELS[permissionKey.toUpperCase()] ?? titleCase(permissionKey);
