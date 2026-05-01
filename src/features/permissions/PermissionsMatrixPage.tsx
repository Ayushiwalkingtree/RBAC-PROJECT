import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import { Button, Chip, Stack } from '@mui/material';
import permissionsData from '@/mock/data/permissions.json';
import resourcesData from '@/mock/data/resources.json';
import { DataTable } from '@/shared/components/DataTable';
import { PageHeader } from '@/shared/components/PageHeader';
import { PermissionGuard } from '@/shared/components/guards/PermissionGuard';
import { ACTION_KEYS, RESOURCE_KEYS } from '@/shared/constants/permission.constants';
import type { Permission, Resource } from '@/shared/types/rbac.types';

const permissions = permissionsData as Permission[];
const resources = resourcesData as Resource[];

export const PermissionsMatrixPage = () => (
  <>
    <PageHeader title="Permissions Matrix" subtitle="Canonical resources and actions used by can(resource, action).">
      <PermissionGuard resource={RESOURCE_KEYS.permissions} action={ACTION_KEYS.assign}>
        <Button startIcon={<AssignmentTurnedInIcon />}>Assign permissions</Button>
      </PermissionGuard>
    </PageHeader>
    <DataTable
      rows={resources}
      getRowId={(resource) => resource.id}
      columns={[
        { id: 'resource', label: 'Resource', render: (resource) => resource.label },
        { id: 'description', label: 'Description', render: (resource) => resource.description },
        {
          id: 'actions',
          label: 'Available actions',
          render: (resource) => (
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {permissions
                .filter((permission) => permission.resource === resource.id)
                .map((permission) => (
                  <Chip key={permission.id} label={permission.action} size="small" />
                ))}
            </Stack>
          ),
        },
      ]}
    />
  </>
);
