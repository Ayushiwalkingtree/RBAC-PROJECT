import { PERMISSION_KEYS, RESOURCE_KEYS } from '@/shared/constants/permission.constants';

export const ROUTES = {
  login: '/login',
  signup: '/signup',
  verifyEmail: '/verify-email',
  dashboard: '/dashboard',
  users: '/users',
  roles: '/roles',
  permissions: '/permissions',
  tickets: '/tickets',
  reports: '/reports',
  auditLogs: '/audit-logs',
  settings: '/settings',
  resourceRegistry: '/resource-registry',
  tenantAdminAccess: '/tenant-admin-access',
  navPreview: '/nav-preview',
  navigationOrder: '/navigation-order',
} as const;

export const ROUTE_PERMISSIONS = {
  [ROUTES.dashboard]: { resource: RESOURCE_KEYS.dashboardMenu, permission: PERMISSION_KEYS.view },
  [ROUTES.users]: { resource: RESOURCE_KEYS.userMenu, permission: PERMISSION_KEYS.view },
  [ROUTES.roles]: { resource: RESOURCE_KEYS.adminMenu, permission: PERMISSION_KEYS.view },
  [ROUTES.permissions]: { resource: RESOURCE_KEYS.permissionGrantApi, permission: PERMISSION_KEYS.configure },
  [ROUTES.tickets]: { resource: RESOURCE_KEYS.loanMenu, permission: PERMISSION_KEYS.view },
  [ROUTES.reports]: { resource: RESOURCE_KEYS.reportsMenu, permission: PERMISSION_KEYS.view },
  [ROUTES.auditLogs]: { resource: RESOURCE_KEYS.auditLogApi, permission: PERMISSION_KEYS.read },
  [ROUTES.settings]: { resource: RESOURCE_KEYS.settingsMenu, permission: PERMISSION_KEYS.view },
  [ROUTES.resourceRegistry]: {
    resource: RESOURCE_KEYS.resourceRegistryMenu,
    permission: PERMISSION_KEYS.view,
  },
  [ROUTES.tenantAdminAccess]: {
    resource: RESOURCE_KEYS.tenantAdminAccessMenu,
    permission: PERMISSION_KEYS.view,
  },
  [ROUTES.navPreview]: { resource: RESOURCE_KEYS.navPreviewMenu, permission: PERMISSION_KEYS.view },
  [ROUTES.navigationOrder]: { resource: RESOURCE_KEYS.navOrderMenu, permission: PERMISSION_KEYS.view },
} as const;
