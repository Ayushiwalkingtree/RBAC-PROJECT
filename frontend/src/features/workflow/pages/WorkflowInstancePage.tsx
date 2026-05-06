import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Chip,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { workflowService, type WorkflowHistoryEvent, type WorkflowInstance } from '@/features/workflow/services/workflow.service';
import { AppButton } from '@/shared/components/AppButton';
import { DataTable } from '@/shared/components/DataTable';
import { EmptyState } from '@/shared/components/EmptyState';
import { PageHeader } from '@/shared/components/PageHeader';
import { useToast } from '@/shared/components/useToast';

const formatDate = (value?: string): string => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const statusColor = (status?: string): 'default' | 'primary' | 'success' | 'warning' | 'error' => {
  const normalized = status?.toUpperCase();
  if (!normalized) return 'default';
  if (['COMPLETED', 'APPROVED', 'DONE'].includes(normalized)) return 'success';
  if (['REJECTED', 'FAILED', 'CANCELLED', 'CANCELED'].includes(normalized)) return 'error';
  if (['RETURNED', 'PENDING', 'IN_PROGRESS'].includes(normalized)) return 'warning';
  return 'primary';
};

const JsonPanel = ({ value }: { value: unknown }) => (
  <Typography
    component="pre"
    variant="body2"
    sx={{
      bgcolor: 'background.default',
      border: 1,
      borderColor: 'divider',
      borderRadius: 1,
      m: 0,
      maxHeight: 420,
      overflow: 'auto',
      p: 2,
      whiteSpace: 'pre-wrap',
    }}
  >
    {JSON.stringify(value ?? {}, null, 2)}
  </Typography>
);

const InstanceHeader = ({ instance }: { instance: WorkflowInstance }) => (
  <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', p: { xs: 2, md: 3 } }}>
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between">
        <Stack spacing={0.5}>
          <Typography variant="h6">{instance.workflowName ?? instance.workflowCode ?? 'Workflow Instance'}</Typography>
          <Typography variant="body2" color="text.secondary">
            {instance.id}
          </Typography>
        </Stack>
        <Chip label={instance.status ?? 'UNKNOWN'} color={statusColor(instance.status)} />
      </Stack>
      <Divider />
      <Stack direction="row" flexWrap="wrap" useFlexGap spacing={2}>
        {[
          ['Workflow code', instance.workflowCode],
          ['Entity name', instance.entityName],
          ['Entity table', instance.entityTableName],
          ['Entity record ID', instance.entityRecordId],
          ['Started at', formatDate(instance.startedAt)],
          ['Completed at', formatDate(instance.completedAt)],
          ['Current step', instance.currentStep],
        ].map(([label, value]) => (
          <Stack key={label} sx={{ minWidth: 190 }}>
            <Typography variant="caption" color="text.secondary">
              {label}
            </Typography>
            <Typography variant="body2">{value || '-'}</Typography>
          </Stack>
        ))}
      </Stack>
    </Stack>
  </Paper>
);

const Timeline = ({ history }: { history: WorkflowHistoryEvent[] }) => (
  <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', p: { xs: 2, md: 3 } }}>
    <Stack spacing={1.5}>
      <Typography variant="h6">Timeline / History</Typography>
      {history.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No workflow history returned by the workflow service.
        </Typography>
      ) : (
        <Stack spacing={1.25}>
          {history.map((event) => (
            <Paper
              key={event.id}
              elevation={0}
              sx={{
                bgcolor: 'background.default',
                border: 1,
                borderColor: 'divider',
                p: 1.5,
              }}
            >
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between">
                <Stack spacing={0.35}>
                  <Typography variant="subtitle2">{event.action}</Typography>
                  {event.comments && (
                    <Typography variant="body2" color="text.secondary">
                      {event.comments}
                    </Typography>
                  )}
                </Stack>
                <Stack spacing={0.35} alignItems={{ xs: 'flex-start', sm: 'flex-end' }}>
                  <Typography variant="caption" color="text.secondary">
                    {event.actor ? `Actor: ${event.actor}` : 'Actor: -'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(event.createdAt)}
                  </Typography>
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </Stack>
  </Paper>
);

export const WorkflowInstancePage = () => {
  const { instanceId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [instance, setInstance] = useState<WorkflowInstance | null>(null);
  const [instances, setInstances] = useState<WorkflowInstance[]>([]);
  const [listMessage, setListMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadInstance = useCallback(async () => {
    if (!instanceId) return;
    setIsLoading(true);
    try {
      setInstance(await workflowService.getWorkflowInstance(instanceId));
    } catch (error) {
      const recent = workflowService.getRecentWorkflowInstances().find((item) => item.id === instanceId);
      if (recent) {
        setInstance(recent);
        setListMessage('Workflow detail endpoint was unavailable; showing recent action fallback.');
      } else {
        showToast(error instanceof Error ? error.message : 'Unable to load workflow instance.', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  }, [instanceId, showToast]);

  const loadInstances = useCallback(async () => {
    setIsLoading(true);
    try {
      const apiInstances = await workflowService.getWorkflowInstances({ page: 1, per_page: 25 });
      const recent = workflowService.getRecentWorkflowInstances();
      const merged = [
        ...apiInstances,
        ...recent.filter((fallback) => !apiInstances.some((item) => item.id === fallback.id)),
      ];
      setInstances(merged);
      setListMessage(apiInstances.length === 0 && recent.length > 0 ? 'Showing recent completed workflow actions saved in this browser.' : null);
    } catch {
      const recent = workflowService.getRecentWorkflowInstances();
      setInstances(recent);
      setListMessage(
        recent.length > 0
          ? 'Workflow instance list endpoint is unavailable; showing recent completed workflow actions saved in this browser.'
          : 'Workflow instance list endpoint is unavailable.',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (instanceId) {
      void loadInstance();
      return;
    }
    void loadInstances();
  }, [instanceId, loadInstance, loadInstances]);

  if (!instanceId) {
    return (
      <>
        <PageHeader title="Workflow Instances" subtitle="Completed and in-flight workflow instances from the runtime service.">
          <AppButton variant="outlined" color="inherit" startIcon={<RefreshIcon />} onClick={() => void loadInstances()}>
            Refresh
          </AppButton>
        </PageHeader>

        {listMessage && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {listMessage}
          </Alert>
        )}

        {isLoading ? (
          <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', p: 3 }}>
            <Typography color="text.secondary">Loading workflow instances...</Typography>
          </Paper>
        ) : instances.length === 0 ? (
          <EmptyState title="No workflow instances found" description="Completed workflow instances will appear here when the runtime service returns them." />
        ) : (
          <DataTable
            rows={instances}
            getRowId={(item) => item.id}
            columns={[
              { id: 'instance', label: 'Instance ID', render: (item) => item.id },
              { id: 'workflow', label: 'Workflow', render: (item) => item.workflowName ?? item.workflowCode ?? '-' },
              { id: 'entity', label: 'Entity', render: (item) => item.entityName ?? '-' },
              { id: 'record', label: 'Record', render: (item) => item.entityRecordId ?? '-' },
              {
                id: 'status',
                label: 'Status',
                render: (item) => <Chip size="small" label={item.status ?? 'UNKNOWN'} color={statusColor(item.status)} variant="outlined" />,
              },
              { id: 'started', label: 'Started', render: (item) => formatDate(item.startedAt) },
              { id: 'completed', label: 'Completed', render: (item) => formatDate(item.completedAt) },
              {
                id: 'actions',
                label: 'Actions',
                render: (item) => (
                  <AppButton size="small" variant="text" startIcon={<OpenInNewIcon />} onClick={() => navigate(`/workflow/instances/${item.id}`)}>
                    Detail
                  </AppButton>
                ),
              },
            ]}
          />
        )}
      </>
    );
  }

  return (
    <>
      <PageHeader title="Workflow Instance" subtitle="Runtime status, entity context, history, and related tasks.">
        <AppButton variant="outlined" color="inherit" startIcon={<ArrowBackIcon />} onClick={() => navigate('/workflow/instances')}>
          Back
        </AppButton>
        <AppButton variant="outlined" color="inherit" startIcon={<RefreshIcon />} onClick={() => void loadInstance()}>
          Refresh
        </AppButton>
      </PageHeader>

      {listMessage && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {listMessage}
        </Alert>
      )}

      {isLoading ? (
        <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', p: 3 }}>
          <Typography color="text.secondary">Loading workflow instance...</Typography>
        </Paper>
      ) : !instance ? (
        <EmptyState title="Instance not found" description="The workflow service did not return this instance." />
      ) : (
        <Stack spacing={2.5}>
          <InstanceHeader instance={instance} />

          <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', p: { xs: 2, md: 3 } }}>
            <Stack spacing={1.5}>
              <Typography variant="h6">Payload / Entity Context</Typography>
              <JsonPanel value={instance.payload ?? instance.raw.payload ?? instance.raw.entity ?? {}} />
            </Stack>
          </Paper>

          <Timeline history={instance.history} />

          <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', p: { xs: 2, md: 3 } }}>
            <Stack spacing={1.5}>
              <Typography variant="h6">Tasks</Typography>
              {instance.tasks.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No workflow tasks returned by the workflow service.
                </Typography>
              ) : (
                <DataTable
                  rows={instance.tasks}
                  getRowId={(task) => task.taskId}
                  columns={[
                    { id: 'task', label: 'Task ID', render: (task) => task.taskId },
                    { id: 'step', label: 'Step', render: (task) => task.stepName ?? '-' },
                    {
                      id: 'status',
                      label: 'Status',
                      render: (task) => <Chip size="small" label={task.status} color={statusColor(task.status)} variant="outlined" />,
                    },
                    { id: 'assigned', label: 'Assigned to', render: (task) => task.assignedTo ?? task.candidateRole ?? '-' },
                    { id: 'claimed', label: 'Claimed by', render: (task) => task.claimedBy ?? '-' },
                    { id: 'completedBy', label: 'Completed by', render: (task) => task.completedBy ?? '-' },
                    { id: 'completedAt', label: 'Completed at', render: (task) => formatDate(task.completedAt) },
                  ]}
                />
              )}
            </Stack>
          </Paper>

          {instance.history.length === 0 && instance.tasks.length === 0 && (
            <Alert severity="info">No workflow history returned by the workflow service.</Alert>
          )}

          {import.meta.env.DEV && (
            <Accordion disableGutters elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2">Raw debug response</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <JsonPanel value={instance.raw} />
              </AccordionDetails>
            </Accordion>
          )}
        </Stack>
      )}
    </>
  );
};
