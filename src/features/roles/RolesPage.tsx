import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { Button, Chip, IconButton, Tooltip } from '@mui/material';
import rolesData from '@/mock/data/roles.json';
import { DataTable } from '@/shared/components/DataTable';
import { PageHeader } from '@/shared/components/PageHeader';
import { PermissionGuard } from '@/shared/components/guards/PermissionGuard';
import { ACTION_KEYS, RESOURCE_KEYS } from '@/shared/constants/permission.constants';
import { useAuthStore } from '@/features/auth/store/auth.store';
import type { Role } from '@/shared/types/rbac.types';

const roles = rolesData as Role[];

export const RolesPage = () => {
  const orgId = useAuthStore((state) => state.session?.org.id);
  const tenantRoles = roles.filter((role) => role.orgId === orgId);

  return (
    <>
      <PageHeader title="Roles" subtitle="Roles are displayed as bundles, but access checks use permissions.">
        <PermissionGuard resource={RESOURCE_KEYS.roles} action={ACTION_KEYS.create}>
          <Button startIcon={<AddIcon />}>Create role</Button>
        </PermissionGuard>
      </PageHeader>
      <DataTable
        rows={tenantRoles}
        getRowId={(role) => role.id}
        columns={[
          { id: 'name', label: 'Name', render: (role) => role.name },
          { id: 'description', label: 'Description', render: (role) => role.description },
          {
            id: 'permissions',
            label: 'Permissions',
            render: (role) => <Chip label={role.permissionIds.length} size="small" />,
          },
          {
            id: 'actions',
            label: 'Actions',
            render: () => (
              <PermissionGuard resource={RESOURCE_KEYS.roles} action={ACTION_KEYS.update}>
                <Tooltip title="Edit role">
                  <IconButton size="small" aria-label="Edit role">
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </PermissionGuard>
            ),
          },
        ]}
      />
    </>
  );
};
