import { Chip, Paper, Stack, Typography } from '@mui/material';
import { useLocation } from 'react-router-dom';
import { EmptyState } from '@/shared/components/EmptyState';
import { PageHeader } from '@/shared/components/PageHeader';
import { PermissionChip } from '@/shared/components/PermissionChip';
import { ResourceTypeBadge } from '@/shared/components/ResourceTypeBadge';
import { PERMISSION_KEYS } from '@/shared/constants/permission.constants';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { canAccess } from '@/shared/utils/rbac';
import { pathForResource } from '@/shared/services/navigation.service';
import type { NavigationItem } from '@/shared/types/navigation.types';

const flattenNavigation = (items: NavigationItem[]): NavigationItem[] =>
  items.flatMap((item) => [item, ...flattenNavigation(item.children ?? [])]);

export const DynamicResourcePage = () => {
  const location = useLocation();
  const session = useAuthStore((state) => state.session);
  const navResource = flattenNavigation(session?.navigation ?? []).find((candidate) => candidate.path === location.pathname);
  const resource = session?.resources.find((candidate) => pathForResource(candidate) === location.pathname);
  const resourceKey = resource?.resourceKey ?? navResource?.resourceKey;

  if (!resource && !navResource) {
    return <EmptyState title="Page not found" description="No registered resource matches this route." />;
  }

  if (!resourceKey || !canAccess(session?.permissions ?? {}, resourceKey, PERMISSION_KEYS.view)) {
    return <EmptyState title="Unauthorized" description="You do not have permission to view this resource." />;
  }

  const grantedPermissions = resource
    ? resource.allowedPermissions
      .filter((permission) => canAccess(session?.permissions ?? {}, resource.resourceKey, permission.key))
      .map((permission) => permission.key)
    : (session?.permissions[resourceKey] ?? []);

  return (
    <>
      <PageHeader
        title={resource?.displayName ?? resource?.resourceName ?? navResource?.label ?? 'Resource'}
        subtitle={resource?.description || 'This resource page is dynamically generated.'}
      />
      <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', p: 3 }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
            <ResourceTypeBadge type={resource?.resourceType ?? navResource?.type ?? 'MENU'} />
            <Chip label={resource?.displayCategory ?? resource?.resourceGroup ?? resourceKey} size="small" variant="outlined" />
          </Stack>
          <Typography variant="body1">This resource page is dynamically generated.</Typography>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            {grantedPermissions.map((permission) => (
              <PermissionChip key={permission} label={permission} selected />
            ))}
          </Stack>
        </Stack>
      </Paper>
    </>
  );
};
