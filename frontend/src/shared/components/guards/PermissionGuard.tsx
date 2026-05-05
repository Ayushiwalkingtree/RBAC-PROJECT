import type { PropsWithChildren, ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import type { PermissionKey, ResourceKey } from '@/shared/constants/permission.constants';
import { EmptyState } from '@/shared/components/EmptyState';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { usePermission } from '@/shared/hooks/usePermission';
import type { NavigationItem } from '@/shared/types/navigation.types';

type PermissionGuardProps = PropsWithChildren<{
  resource?: ResourceKey;
  permission?: PermissionKey;
  anyOf?: ReadonlyArray<{ resource: ResourceKey; permission: PermissionKey }>;
  fallback?: ReactNode;
  redirect?: boolean;
}>;

const firstAccessiblePath = (items: NavigationItem[]): string | null => {
  for (const item of items) {
    const childPath = firstAccessiblePath(item.children ?? []);
    if (childPath) {
      return childPath;
    }
    if (item.path) {
      return item.path;
    }
  }
  return null;
};

export const PermissionGuard = ({
  resource,
  permission,
  anyOf,
  fallback = null,
  redirect = false,
  children,
}: PermissionGuardProps) => {
  const { can, canAny } = usePermission();
  const navigation = useAuthStore((state) => state.session?.navigation ?? []);

  const isAllowed = anyOf ? canAny(anyOf) : Boolean(resource && permission && can(resource, permission));

  if (!isAllowed) {
    if (!redirect) {
      return fallback;
    }
    const redirectPath = firstAccessiblePath(navigation);
    return redirectPath ? (
      <Navigate to={redirectPath} replace />
    ) : (
      fallback ?? <EmptyState title="Unauthorized" description="You do not have permission to view this page." />
    );
  }

  return children;
};
