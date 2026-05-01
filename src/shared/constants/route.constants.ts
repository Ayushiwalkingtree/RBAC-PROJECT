import { ACTION_KEYS, RESOURCE_KEYS } from '@/shared/constants/permission.constants';

export const ROUTES = {
  login: '/login',
  dashboard: '/dashboard',
  users: '/users',
  roles: '/roles',
  permissions: '/permissions',
  tickets: '/tickets',
  reports: '/reports',
  settings: '/settings',
} as const;

export const ROUTE_PERMISSIONS = {
  [ROUTES.dashboard]: { resource: RESOURCE_KEYS.dashboard, action: ACTION_KEYS.view },
  [ROUTES.users]: { resource: RESOURCE_KEYS.users, action: ACTION_KEYS.view },
  [ROUTES.roles]: { resource: RESOURCE_KEYS.roles, action: ACTION_KEYS.view },
  [ROUTES.permissions]: { resource: RESOURCE_KEYS.permissions, action: ACTION_KEYS.view },
  [ROUTES.tickets]: { resource: RESOURCE_KEYS.tickets, action: ACTION_KEYS.view },
  [ROUTES.reports]: { resource: RESOURCE_KEYS.reports, action: ACTION_KEYS.view },
  [ROUTES.settings]: { resource: RESOURCE_KEYS.settings, action: ACTION_KEYS.view },
} as const;
