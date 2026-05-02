export const APP_CONFIG = {
  name: 'Tenant Access Console',
  drawerWidth: 280,
  defaultRoute: '/dashboard',
  loginRoute: '/login',
} as const;

export const AUTH_CONFIG = {
  tokenType: 'Bearer',
  tokenIssuer: 'mock-rbac-api',
  tokenTtlMinutes: 15,
  refreshTokenTtlDays: 7,
  lockoutMinutes: 30,
  maxFailedAttempts: 5,
} as const;
