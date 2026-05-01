import type { PropsWithChildren, ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import type { ActionKey, ResourceKey } from '@/shared/constants/permission.constants';
import { APP_CONFIG } from '@/shared/constants/app.constants';
import { usePermission } from '@/shared/hooks/usePermission';

type PermissionGuardProps = PropsWithChildren<{
  resource: ResourceKey;
  action: ActionKey;
  fallback?: ReactNode;
  redirect?: boolean;
}>;

export const PermissionGuard = ({
  resource,
  action,
  fallback = null,
  redirect = false,
  children,
}: PermissionGuardProps) => {
  const { can } = usePermission();

  if (!can(resource, action)) {
    return redirect ? <Navigate to={APP_CONFIG.defaultRoute} replace /> : fallback;
  }

  return children;
};
