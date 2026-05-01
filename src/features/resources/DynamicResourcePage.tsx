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

export const DynamicResourcePage = () => {
  const location = useLocation();
  const session = useAuthStore((state) => state.session);
  const resource = session?.resources.find((candidate) => pathForResource(candidate) === location.pathname);
  const isSuperAdmin =
    session?.org.code === 'PLATFORM' &&
    session.user.roles.some((role) => role.toUpperCase().includes('SUPER ADMIN'));

  if (!resource) {
    return <EmptyState title="Page not found" description="No registered resource matches this route." />;
  }

  if (!isSuperAdmin && !canAccess(session?.permissions ?? {}, resource.resourceKey, PERMISSION_KEYS.view)) {
    return <EmptyState title="Unauthorized" description="You do not have permission to view this resource." />;
  }

  const grantedPermissions = resource.allowedPermissions
    .filter((permission) => isSuperAdmin || canAccess(session?.permissions ?? {}, resource.resourceKey, permission.key))
    .map((permission) => permission.key);

  return (
    <>
      <PageHeader
        title={resource.displayName ?? resource.resourceName}
        subtitle={resource.description || 'This resource page is dynamically generated.'}
      />
      <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', p: 3 }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
            <ResourceTypeBadge type={resource.resourceType} />
            <Chip label={resource.displayCategory ?? resource.resourceGroup} size="small" variant="outlined" />
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
