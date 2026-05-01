import { useCallback } from 'react';
import type { ActionKey, ResourceKey } from '@/shared/constants/permission.constants';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { hasPermission } from '@/shared/utils/rbac';

export const usePermission = () => {
  const permissions = useAuthStore((state) => state.session?.permissions ?? []);

  const can = useCallback(
    (resource: ResourceKey, action: ActionKey) => hasPermission(permissions, resource, action),
    [permissions],
  );

  return {
    can,
    permissions,
  };
};
