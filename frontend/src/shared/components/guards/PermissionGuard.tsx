import type { PropsWithChildren, ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import type { PermissionKey, ResourceKey } from '@/shared/constants/permission.constants';
import { APP_CONFIG } from '@/shared/constants/app.constants';
import { usePermission } from '@/shared/hooks/usePermission';

type PermissionGuardProps = PropsWithChildren<{
  resource?: ResourceKey;
  permission?: PermissionKey;
  anyOf?: ReadonlyArray<{ resource: ResourceKey; permission: PermissionKey }>;
  fallback?: ReactNode;
  redirect?: boolean;
}>;

export const PermissionGuard = ({
  resource,
  permission,
  anyOf,
  fallback = null,
  redirect = false,
  children,
}: PermissionGuardProps) => {
  const { can, canAny } = usePermission();

  const isAllowed = anyOf ? canAny(anyOf) : Boolean(resource && permission && can(resource, permission));

  if (!isAllowed) {
    return redirect ? <Navigate to={APP_CONFIG.defaultRoute} replace /> : fallback;
  }

  return children;
};
