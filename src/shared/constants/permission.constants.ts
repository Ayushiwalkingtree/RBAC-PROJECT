export const RESOURCE_TYPES = {
  menu: 'MENU',
  page: 'PAGE',
  api: 'API',
  button: 'BUTTON',
  action: 'ACTION',
  report: 'REPORT',
  dashboard: 'DASHBOARD',
} as const;

export const PERMISSION_KEYS = {
  view: 'VIEW',
  create: 'CREATE',
  read: 'READ',
  update: 'UPDATE',
  delete: 'DELETE',
  execute: 'EXECUTE',
  export: 'EXPORT',
  download: 'DOWNLOAD',
  approve: 'APPROVE',
  reject: 'REJECT',
  configure: 'CONFIGURE',
} as const;

export const RESOURCE_TYPE_LABELS: Record<string, string> = {
  MENU: 'Menu',
  PAGE: 'Page',
  API: 'API',
  BUTTON: 'Button',
  ACTION: 'Action',
  REPORT: 'Report',
  DASHBOARD: 'Dashboard',
};

export const ADMIN_RESOURCE_TYPES = [
  RESOURCE_TYPES.menu,
  RESOURCE_TYPES.page,
  RESOURCE_TYPES.button,
  RESOURCE_TYPES.report,
  RESOURCE_TYPES.dashboard,
  RESOURCE_TYPES.action,
] as const;

export const RESOURCE_GROUP_OPTIONS = [
  'Dashboard',
  'User Management',
  'Role Management',
  'Reports',
  'Tickets',
  'Settings',
  'Admin',
] as const;

export const ACTION_LABELS: Record<string, string> = {
  VIEW: 'View',
  READ: 'Read',
  CREATE: 'Create',
  UPDATE: 'Edit',
  DELETE: 'Delete',
  EXPORT: 'Export',
  DOWNLOAD: 'Download',
  APPROVE: 'Approve',
  REJECT: 'Reject',
  ASSIGN: 'Assign',
  CONFIGURE: 'Configure',
  EXECUTE: 'Execute',
};

export const ADMIN_ACTION_OPTIONS = [
  PERMISSION_KEYS.view,
  PERMISSION_KEYS.read,
  PERMISSION_KEYS.create,
  PERMISSION_KEYS.update,
  PERMISSION_KEYS.delete,
  PERMISSION_KEYS.export,
  PERMISSION_KEYS.download,
  PERMISSION_KEYS.approve,
  PERMISSION_KEYS.reject,
  'ASSIGN',
  PERMISSION_KEYS.configure,
  PERMISSION_KEYS.execute,
] as const;

export const DEFAULT_ACTIONS_BY_RESOURCE_TYPE: Record<string, string[]> = {
  MENU: [PERMISSION_KEYS.view],
  PAGE: [PERMISSION_KEYS.view, PERMISSION_KEYS.read],
  BUTTON: [PERMISSION_KEYS.view],
  REPORT: [PERMISSION_KEYS.view, PERMISSION_KEYS.download],
  DASHBOARD: [PERMISSION_KEYS.view],
  ACTION: [PERMISSION_KEYS.execute],
  API: [PERMISSION_KEYS.execute],
};

export const RESOURCE_KEYS = {
  userMenu: 'USER_MENU',
  userListApi: 'USER_LIST_API',
  userCreateApi: 'USER_CREATE_API',
  userUpdateApi: 'USER_UPDATE_API',
  userDeleteApi: 'USER_DELETE_API',
  userExportButton: 'USER_EXPORT_BTN',
  loanMenu: 'LOAN_MENU',
  loanListApi: 'LOAN_LIST_API',
  loanCreateApi: 'LOAN_CREATE_API',
  loanApproveApi: 'LOAN_APPROVE_API',
  loanApproveButton: 'LOAN_APPROVE_BTN',
  loanRejectButton: 'LOAN_REJECT_BTN',
  ticketMenu: 'TICKET_MENU',
  ticketListApi: 'TICKET_LIST_API',
  ticketCreateApi: 'TICKET_CREATE_API',
  ticketUpdateApi: 'TICKET_UPDATE_API',
  ticketDeleteApi: 'TICKET_DELETE_API',
  dashboardMenu: 'DASH_MENU',
  dashboardMain: 'DASH_MAIN',
  dashboardRisk: 'DASH_RISK',
  reportsMenu: 'REPORTS_MENU',
  reportDaily: 'REPORT_DAILY',
  reportMonthly: 'REPORT_MONTHLY',
  reportAudit: 'REPORT_AUDIT',
  adminMenu: 'ADMIN_MENU',
  permissionsMenu: 'PERMISSIONS_MENU',
  roleManageApi: 'ROLE_MANAGE_API',
  permissionGrantApi: 'PERM_GRANT_API',
  resourceRegistryMenu: 'RESOURCE_REGISTRY_MENU',
  resourceManageApi: 'RESOURCE_MANAGE_API',
  orgSettings: 'ORG_SETTINGS',
  auditLogsMenu: 'AUDIT_LOGS_MENU',
  auditLogApi: 'AUDIT_LOG_API',
  settingsMenu: 'SETTINGS_MENU',
  settingsManageApi: 'SETTINGS_MANAGE_API',
  navPreviewMenu: 'NAV_PREVIEW_MENU',
} as const;

export const RESOURCE_PERMISSION_RULES = {
  users: {
    menuView: { resource: RESOURCE_KEYS.userMenu, permission: PERMISSION_KEYS.view },
    read: [
      { resource: RESOURCE_KEYS.userListApi, permission: PERMISSION_KEYS.read },
      { resource: RESOURCE_KEYS.userMenu, permission: PERMISSION_KEYS.read },
    ],
    create: [
      { resource: RESOURCE_KEYS.userCreateApi, permission: PERMISSION_KEYS.execute },
      { resource: RESOURCE_KEYS.userMenu, permission: PERMISSION_KEYS.create },
    ],
    update: [
      { resource: RESOURCE_KEYS.userUpdateApi, permission: PERMISSION_KEYS.execute },
      { resource: RESOURCE_KEYS.userMenu, permission: PERMISSION_KEYS.update },
    ],
    delete: [
      { resource: RESOURCE_KEYS.userDeleteApi, permission: PERMISSION_KEYS.execute },
      { resource: RESOURCE_KEYS.userMenu, permission: PERMISSION_KEYS.delete },
    ],
    export: [
      { resource: RESOURCE_KEYS.userExportButton, permission: PERMISSION_KEYS.view },
      { resource: RESOURCE_KEYS.userListApi, permission: PERMISSION_KEYS.export },
    ],
  },
  roles: {
    menuView: { resource: RESOURCE_KEYS.adminMenu, permission: PERMISSION_KEYS.view },
    read: [{ resource: RESOURCE_KEYS.roleManageApi, permission: PERMISSION_KEYS.read }],
    create: [{ resource: RESOURCE_KEYS.roleManageApi, permission: PERMISSION_KEYS.create }],
    update: [{ resource: RESOURCE_KEYS.roleManageApi, permission: PERMISSION_KEYS.update }],
    delete: [{ resource: RESOURCE_KEYS.roleManageApi, permission: PERMISSION_KEYS.delete }],
  },
  permissions: {
    configure: [{ resource: RESOURCE_KEYS.permissionGrantApi, permission: PERMISSION_KEYS.configure }],
  },
  resources: {
    menuView: { resource: RESOURCE_KEYS.resourceRegistryMenu, permission: PERMISSION_KEYS.view },
    create: [{ resource: RESOURCE_KEYS.resourceManageApi, permission: PERMISSION_KEYS.create }],
    update: [{ resource: RESOURCE_KEYS.resourceManageApi, permission: PERMISSION_KEYS.update }],
    delete: [{ resource: RESOURCE_KEYS.resourceManageApi, permission: PERMISSION_KEYS.delete }],
  },
  loans: {
    menuView: { resource: RESOURCE_KEYS.loanMenu, permission: PERMISSION_KEYS.view },
    read: [
      { resource: RESOURCE_KEYS.ticketListApi, permission: PERMISSION_KEYS.read },
      { resource: RESOURCE_KEYS.ticketMenu, permission: PERMISSION_KEYS.read },
      { resource: RESOURCE_KEYS.loanListApi, permission: PERMISSION_KEYS.read },
      { resource: RESOURCE_KEYS.loanMenu, permission: PERMISSION_KEYS.read },
    ],
    create: [
      { resource: RESOURCE_KEYS.ticketCreateApi, permission: PERMISSION_KEYS.execute },
      { resource: RESOURCE_KEYS.ticketMenu, permission: PERMISSION_KEYS.create },
      { resource: RESOURCE_KEYS.loanCreateApi, permission: PERMISSION_KEYS.execute },
      { resource: RESOURCE_KEYS.loanMenu, permission: PERMISSION_KEYS.create },
    ],
    update: [
      { resource: RESOURCE_KEYS.ticketUpdateApi, permission: PERMISSION_KEYS.execute },
      { resource: RESOURCE_KEYS.ticketMenu, permission: PERMISSION_KEYS.update },
      { resource: RESOURCE_KEYS.loanMenu, permission: PERMISSION_KEYS.update },
    ],
    delete: [
      { resource: RESOURCE_KEYS.ticketDeleteApi, permission: PERMISSION_KEYS.execute },
      { resource: RESOURCE_KEYS.ticketMenu, permission: PERMISSION_KEYS.delete },
      { resource: RESOURCE_KEYS.loanMenu, permission: PERMISSION_KEYS.delete },
    ],
    approve: [
      { resource: RESOURCE_KEYS.loanApproveButton, permission: PERMISSION_KEYS.view },
      { resource: RESOURCE_KEYS.loanApproveApi, permission: PERMISSION_KEYS.approve },
    ],
    reject: [
      { resource: RESOURCE_KEYS.loanRejectButton, permission: PERMISSION_KEYS.view },
      { resource: RESOURCE_KEYS.loanApproveApi, permission: PERMISSION_KEYS.reject },
    ],
  },
  reports: {
    menuView: { resource: RESOURCE_KEYS.reportsMenu, permission: PERMISSION_KEYS.view },
    viewDaily: [{ resource: RESOURCE_KEYS.reportDaily, permission: PERMISSION_KEYS.view }],
    downloadDaily: [{ resource: RESOURCE_KEYS.reportDaily, permission: PERMISSION_KEYS.download }],
    viewMonthly: [{ resource: RESOURCE_KEYS.reportMonthly, permission: PERMISSION_KEYS.view }],
    downloadMonthly: [{ resource: RESOURCE_KEYS.reportMonthly, permission: PERMISSION_KEYS.download }],
  },
  settings: {
    menuView: { resource: RESOURCE_KEYS.settingsMenu, permission: PERMISSION_KEYS.view },
    manage: [
      { resource: RESOURCE_KEYS.settingsManageApi, permission: PERMISSION_KEYS.update },
      { resource: RESOURCE_KEYS.orgSettings, permission: PERMISSION_KEYS.update },
    ],
  },
  auditLogs: {
    menuView: { resource: RESOURCE_KEYS.auditLogsMenu, permission: PERMISSION_KEYS.view },
    read: [{ resource: RESOURCE_KEYS.auditLogApi, permission: PERMISSION_KEYS.read }],
  },
} as const;

export type ResourceType = (typeof RESOURCE_TYPES)[keyof typeof RESOURCE_TYPES];
export type PermissionKey = (typeof PERMISSION_KEYS)[keyof typeof PERMISSION_KEYS] | string;
export type ResourceKey = (typeof RESOURCE_KEYS)[keyof typeof RESOURCE_KEYS] | string;
