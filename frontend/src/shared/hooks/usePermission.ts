import { useCallback } from 'react';
import type { PermissionKey, ResourceKey } from '@/shared/constants/permission.constants';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { canAccess, canAll, canAny } from '@/shared/utils/rbac';

export const usePermission = () => {
  const permissions = useAuthStore((state) => state.session?.permissions ?? {});

  const can = useCallback(
    (resource: ResourceKey, permission: PermissionKey) => canAccess(permissions, resource, permission),
    [permissions],
  );

  return {
    can,
    canAny: (requirements: ReadonlyArray<{ resource: ResourceKey; permission: PermissionKey }>) =>
      canAny(permissions, requirements),
    canAll: (requirements: ReadonlyArray<{ resource: ResourceKey; permission: PermissionKey }>) =>
      canAll(permissions, requirements),
    permissions,
  };
};
