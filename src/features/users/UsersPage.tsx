import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { Button, IconButton, Stack, Tooltip } from '@mui/material';
import usersData from '@/mock/data/users.json';
import { DataTable } from '@/shared/components/DataTable';
import { PageHeader } from '@/shared/components/PageHeader';
import { PermissionGuard } from '@/shared/components/guards/PermissionGuard';
import { ACTION_KEYS, RESOURCE_KEYS } from '@/shared/constants/permission.constants';
import { useAuthStore } from '@/features/auth/store/auth.store';
import type { UserRecord } from '@/shared/types/auth.types';

const users = usersData as UserRecord[];

export const UsersPage = () => {
  const orgId = useAuthStore((state) => state.session?.org.id);
  const tenantUsers = users.filter((user) => user.orgId === orgId);

  return (
    <>
      <PageHeader title="Users" subtitle="Tenant users are isolated by organization code.">
        <PermissionGuard resource={RESOURCE_KEYS.users} action={ACTION_KEYS.create}>
          <Button startIcon={<AddIcon />}>Invite user</Button>
        </PermissionGuard>
      </PageHeader>
      <DataTable
        rows={tenantUsers}
        getRowId={(user) => user.id}
        columns={[
          { id: 'name', label: 'Name', render: (user) => user.name },
          { id: 'email', label: 'Email', render: (user) => user.email },
          { id: 'title', label: 'Title', render: (user) => user.title },
          { id: 'status', label: 'Status', render: (user) => user.status },
          {
            id: 'actions',
            label: 'Actions',
            render: () => (
              <Stack direction="row" spacing={0.5}>
                <PermissionGuard resource={RESOURCE_KEYS.users} action={ACTION_KEYS.update}>
                  <Tooltip title="Edit user">
                    <IconButton size="small" aria-label="Edit user">
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </PermissionGuard>
                <PermissionGuard resource={RESOURCE_KEYS.users} action={ACTION_KEYS.delete}>
                  <Tooltip title="Delete user">
                    <IconButton size="small" aria-label="Delete user" color="error">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </PermissionGuard>
              </Stack>
            ),
          },
        ]}
      />
    </>
  );
};
