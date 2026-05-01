import { Navigate, Outlet, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import type { ReactElement } from 'react';
import { LoginPage } from '@/features/auth/components/LoginPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { PermissionsMatrixPage } from '@/features/permissions/PermissionsMatrixPage';
import { ReportsPage } from '@/features/reports/ReportsPage';
import { RolesPage } from '@/features/roles/RolesPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { TicketsPage } from '@/features/tickets/TicketsPage';
import { UsersPage } from '@/features/users/UsersPage';
import { AppShell } from '@/shared/components/layout/AppShell';
import { AuthGuard } from '@/shared/components/guards/AuthGuard';
import { PermissionGuard } from '@/shared/components/guards/PermissionGuard';
import { APP_CONFIG } from '@/shared/constants/app.constants';
import { ROUTE_PERMISSIONS, ROUTES } from '@/shared/constants/route.constants';

const ShellRoute = () => (
  <AppShell>
    <Outlet />
  </AppShell>
);

const protectedElement = (path: keyof typeof ROUTE_PERMISSIONS, element: ReactElement) => {
  const permission = ROUTE_PERMISSIONS[path];

  return (
    <PermissionGuard
      resource={permission.resource}
      action={permission.action}
      redirect
    >
      {element}
    </PermissionGuard>
  );
};

export const AppRouter = () => (
  <Router>
    <Routes>
      <Route path={ROUTES.login} element={<LoginPage />} />
      <Route element={<AuthGuard />}>
        <Route element={<ShellRoute />}>
          <Route index element={<Navigate to={APP_CONFIG.defaultRoute} replace />} />
          <Route path={ROUTES.dashboard} element={protectedElement(ROUTES.dashboard, <DashboardPage />)} />
          <Route path={ROUTES.users} element={protectedElement(ROUTES.users, <UsersPage />)} />
          <Route path={ROUTES.roles} element={protectedElement(ROUTES.roles, <RolesPage />)} />
          <Route
            path={ROUTES.permissions}
            element={protectedElement(ROUTES.permissions, <PermissionsMatrixPage />)}
          />
          <Route path={ROUTES.tickets} element={protectedElement(ROUTES.tickets, <TicketsPage />)} />
          <Route path={ROUTES.reports} element={protectedElement(ROUTES.reports, <ReportsPage />)} />
          <Route path={ROUTES.settings} element={protectedElement(ROUTES.settings, <SettingsPage />)} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to={APP_CONFIG.defaultRoute} replace />} />
    </Routes>
  </Router>
);
