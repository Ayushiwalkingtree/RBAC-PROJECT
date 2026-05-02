import FilterAltIcon from '@mui/icons-material/FilterAlt';
import { Chip, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { auditService } from '@/features/audit/audit.service';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { DataTable } from '@/shared/components/DataTable';
import { EmptyState } from '@/shared/components/EmptyState';
import { PageHeader } from '@/shared/components/PageHeader';
import type { AuditAction, AuditLog } from '@/shared/types/domain.types';

const auditActions: AuditAction[] = [
  'ORG_CREATED',
  'EMAIL_VERIFIED',
  'USER_LOGIN',
  'USER_LOGOUT',
  'USER_CREATED',
  'ROLE_CREATED',
  'ROLE_ASSIGNED',
  'ROLE_REMOVED',
  'PERM_GRANTED',
  'RESOURCE_CREATED',
  'RESOURCE_UPDATED',
  'ORG_UPDATED',
];

export const AuditLogsPage = () => {
  const session = useAuthStore((state) => state.session);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [action, setAction] = useState('');
  const [user, setUser] = useState('');
  const [date, setDate] = useState('');
  const [resourceType, setResourceType] = useState('');
  const isPlatform = session?.org.code === 'PLATFORM';

  const resourceTypes = useMemo(
    () => [...new Set(logs.map((log) => log.resourceType))].sort(),
    [logs],
  );

  useEffect(() => {
    if (!session) return;

    void auditService
      .listAuditLogs({
        orgId: session.org.id,
        isPlatform,
        action,
        user,
        date,
        resourceType,
      })
      .then(setLogs);
  }, [action, date, isPlatform, resourceType, session, user]);

  return (
    <>
      <PageHeader
        title="Audit Logs"
        subtitle={isPlatform ? 'Platform-visible audit activity.' : 'Tenant-scoped audit activity.'}
      />

      <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }}>
          <FilterAltIcon color="action" />
          <TextField select label="Action" value={action} onChange={(event) => setAction(event.target.value)} size="small" sx={{ minWidth: 220 }}>
            <MenuItem value="">All actions</MenuItem>
            {auditActions.map((candidate) => <MenuItem key={candidate} value={candidate}>{candidate}</MenuItem>)}
          </TextField>
          <TextField label="User" value={user} onChange={(event) => setUser(event.target.value)} size="small" />
          <TextField type="date" label="Date" value={date} onChange={(event) => setDate(event.target.value)} size="small" InputLabelProps={{ shrink: true }} />
          <TextField select label="Resource type" value={resourceType} onChange={(event) => setResourceType(event.target.value)} size="small" sx={{ minWidth: 180 }}>
            <MenuItem value="">All resources</MenuItem>
            {resourceTypes.map((candidate) => <MenuItem key={candidate} value={candidate}>{candidate}</MenuItem>)}
          </TextField>
        </Stack>
      </Paper>

      {logs.length === 0 ? (
        <EmptyState title="No audit events found" description="Matching activity will appear here as mock flows run." />
      ) : (
        <DataTable
          rows={logs}
          getRowId={(log) => log.id}
          columns={[
            {
              id: 'createdAt',
              label: 'Date',
              render: (log) => new Date(log.createdAt).toLocaleString(),
            },
            { id: 'action', label: 'Action', render: (log) => <Chip label={log.action} size="small" /> },
            { id: 'actor', label: 'Actor', render: (log) => log.actorEmail ?? log.actorUserId ?? 'System' },
            { id: 'resourceType', label: 'Resource', render: (log) => log.resourceType },
            {
              id: 'message',
              label: 'Message',
              render: (log) => (
                <Typography variant="body2" sx={{ maxWidth: 520 }}>
                  {log.message}
                </Typography>
              ),
            },
          ]}
        />
      )}
    </>
  );
};
