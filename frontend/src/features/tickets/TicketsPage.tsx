import AddIcon from '@mui/icons-material/Add';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  DialogActions,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { ticketSchema, type TicketFormValues } from '@/features/tickets/ticket.schema';
import { ticketService } from '@/features/tickets/ticket.service';
import { AppButton } from '@/shared/components/AppButton';
import { AppDialog } from '@/shared/components/AppDialog';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { DataTable } from '@/shared/components/DataTable';
import { EmptyState } from '@/shared/components/EmptyState';
import { PageHeader } from '@/shared/components/PageHeader';
import { useToast } from '@/shared/components/useToast';
import { RESOURCE_PERMISSION_RULES } from '@/shared/constants/permission.constants';
import { usePermission } from '@/shared/hooks/usePermission';
import type { Ticket } from '@/shared/types/domain.types';

const emptyTicketValues: TicketFormValues = {
  subject: '',
  status: 'Open',
  priority: 'Medium',
  owner: '',
};

export const TicketsPage = () => {
  const session = useAuthStore((state) => state.session);
  const { canAny } = usePermission();
  const { showToast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [assigningTicket, setAssigningTicket] = useState<Ticket | null>(null);
  const [deletingTicket, setDeletingTicket] = useState<Ticket | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canCreateTicket = canAny(RESOURCE_PERMISSION_RULES.loans.create);
  const canUpdateTicket = canAny(RESOURCE_PERMISSION_RULES.loans.update);
  const canDeleteTicket = canAny(RESOURCE_PERMISSION_RULES.loans.delete);
  const canApproveTicket = canAny(RESOURCE_PERMISSION_RULES.loans.approve);
  const canRejectTicket = canAny(RESOURCE_PERMISSION_RULES.loans.reject);

  const { control, handleSubmit, reset } = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: emptyTicketValues,
  });

  const loadTickets = async () => {
    if (!session) {
      return;
    }

    setTickets(await ticketService.listTickets(session.org.id));
  };

  useEffect(() => {
    void loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.org.id]);

  const closeDialog = () => {
    setCreateDialogOpen(false);
    setEditingTicket(null);
    setAssigningTicket(null);
    reset(emptyTicketValues);
  };

  const openEditDialog = (ticket: Ticket) => {
    setEditingTicket(ticket);
    reset({
      subject: ticket.subject,
      status: ticket.status,
      priority: ticket.priority,
      owner: ticket.owner,
    });
  };

  const openAssignDialog = (ticket: Ticket) => {
    setAssigningTicket(ticket);
    reset({
      subject: ticket.subject,
      status: ticket.status,
      priority: ticket.priority,
      owner: ticket.owner,
    });
  };

  const onSubmit = handleSubmit(async (values) => {
    if (!session) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (assigningTicket) {
        await ticketService.assignTicket(assigningTicket.id, values.owner);
        showToast('Ticket assigned.');
      } else if (editingTicket) {
        await ticketService.updateTicket(editingTicket.id, { ...values, orgId: session.org.id });
        showToast('Ticket updated.');
      } else {
        await ticketService.createTicket({ ...values, orgId: session.org.id });
        showToast('Ticket created.');
      }

      await loadTickets();
      closeDialog();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Ticket action failed.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  });

  const handleDeleteTicket = async () => {
    if (!deletingTicket) {
      return;
    }

    setIsSubmitting(true);
    try {
      await ticketService.deleteTicket(deletingTicket.id);
      await loadTickets();
      showToast('Ticket deleted.');
      setDeletingTicket(null);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to delete ticket.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader title="Tickets" subtitle="Create, update, assign, and close tenant tickets.">
        {canCreateTicket && (
          <AppButton startIcon={<AddIcon />} onClick={() => setCreateDialogOpen(true)}>
            Create ticket
          </AppButton>
        )}
      </PageHeader>

      {tickets.length === 0 ? (
        <EmptyState title="No tickets found" description="Create a ticket to start tracking work." />
      ) : (
        <DataTable
          rows={tickets}
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
              render: (ticket) => (
                <Stack direction="row" spacing={0.5}>
                  {canUpdateTicket && (
                    <Tooltip title="Edit ticket">
                      <IconButton size="small" aria-label="Edit ticket" onClick={() => openEditDialog(ticket)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {(canApproveTicket || canRejectTicket) && (
                    <Tooltip title="Assign ticket">
                      <IconButton size="small" aria-label="Assign ticket" onClick={() => openAssignDialog(ticket)}>
                        <AssignmentIndIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {canDeleteTicket && (
                    <Tooltip title="Delete ticket">
                      <IconButton size="small" aria-label="Delete ticket" color="error" onClick={() => setDeletingTicket(ticket)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
              ),
            },
          ]}
        />
      )}

      <AppDialog
        open={createDialogOpen || editingTicket !== null || assigningTicket !== null}
        title={assigningTicket ? 'Assign ticket' : editingTicket ? 'Edit ticket' : 'Create ticket'}
        helperText="Ticket changes require the Tickets backend API."
        onClose={closeDialog}
      >
        <Stack component="form" spacing={2.5} onSubmit={onSubmit}>
          {!assigningTicket && (
            <>
              <Controller
                name="subject"
                control={control}
                render={({ field, fieldState }) => (
                  <TextField {...field} label="Subject" error={Boolean(fieldState.error)} helperText={fieldState.error?.message} fullWidth />
                )}
              />
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <TextField {...field} select label="Status" fullWidth>
                    {['Open', 'In Progress', 'Resolved'].map((status) => (
                      <MenuItem key={status} value={status}>
                        {status}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
              <Controller
                name="priority"
                control={control}
                render={({ field }) => (
                  <TextField {...field} select label="Priority" fullWidth>
                    {['Low', 'Medium', 'High'].map((priority) => (
                      <MenuItem key={priority} value={priority}>
                        {priority}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </>
          )}
          <Controller
            name="owner"
            control={control}
            render={({ field, fieldState }) => (
              <TextField {...field} label="Owner" error={Boolean(fieldState.error)} helperText={fieldState.error?.message} fullWidth />
            )}
          />
          <DialogActions sx={{ px: 0 }}>
            <AppButton variant="outlined" color="inherit" onClick={closeDialog}>
              Cancel
            </AppButton>
            <AppButton type="submit" loading={isSubmitting}>
              {assigningTicket ? 'Assign ticket' : editingTicket ? 'Save ticket' : 'Create ticket'}
            </AppButton>
          </DialogActions>
        </Stack>
      </AppDialog>

      <ConfirmDialog
        open={Boolean(deletingTicket)}
        title="Delete ticket"
        description={`Delete ${deletingTicket?.id ?? 'this ticket'}?`}
        confirmLabel="Delete"
        loading={isSubmitting}
        onCancel={() => setDeletingTicket(null)}
        onConfirm={handleDeleteTicket}
      />
    </>
  );
};
