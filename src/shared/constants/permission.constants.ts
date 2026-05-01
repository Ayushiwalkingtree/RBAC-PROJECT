export const RESOURCE_KEYS = {
  dashboard: 'dashboard',
  users: 'users',
  roles: 'roles',
  permissions: 'permissions',
  tickets: 'tickets',
  reports: 'reports',
  settings: 'settings',
} as const;

export const ACTION_KEYS = {
  view: 'view',
  create: 'create',
  update: 'update',
  delete: 'delete',
  export: 'export',
  assign: 'assign',
  manage: 'manage',
} as const;

export type ResourceKey = (typeof RESOURCE_KEYS)[keyof typeof RESOURCE_KEYS];
export type ActionKey = (typeof ACTION_KEYS)[keyof typeof ACTION_KEYS];
