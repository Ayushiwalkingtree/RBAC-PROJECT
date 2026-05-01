import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { Button, IconButton, Tooltip } from '@mui/material';
import ticketsData from '@/mock/data/tickets.json';
import { DataTable } from '@/shared/components/DataTable';
import { PageHeader } from '@/shared/components/PageHeader';
import { PermissionGuard } from '@/shared/components/guards/PermissionGuard';
import { ACTION_KEYS, RESOURCE_KEYS } from '@/shared/constants/permission.constants';
import { useAuthStore } from '@/features/auth/store/auth.store';

type Ticket = {
  id: string;
  orgId: string;
  subject: string;
  status: string;
  priority: string;
  owner: string;
};

const tickets = ticketsData as Ticket[];

export const TicketsPage = () => {
  const orgId = useAuthStore((state) => state.session?.org.id);
  const tenantTickets = tickets.filter((ticket) => ticket.orgId === orgId);

  return (
    <>
      <PageHeader title="Tickets" subtitle="Operational requests scoped to the current tenant.">
        <PermissionGuard resource={RESOURCE_KEYS.tickets} action={ACTION_KEYS.create}>
          <Button startIcon={<AddIcon />}>Create ticket</Button>
        </PermissionGuard>
      </PageHeader>
      <DataTable
        rows={tenantTickets}
        getRowId={(ticket) => ticket.id}
        columns={[
          { id: 'id', label: 'Ticket', render: (ticket) => ticket.id },
          { id: 'subject', label: 'Subject', render: (ticket) => ticket.subject },
          { id: 'status', label: 'Status', render: (ticket) => ticket.status },
          { id: 'priority', label: 'Priority', render: (ticket) => ticket.priority },
          { id: 'owner', label: 'Owner', render: (ticket) => ticket.owner },
          {
            id: 'actions',
            label: 'Actions',
            render: () => (
              <PermissionGuard resource={RESOURCE_KEYS.tickets} action={ACTION_KEYS.update}>
                <Tooltip title="Edit ticket">
                  <IconButton size="small" aria-label="Edit ticket">
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
