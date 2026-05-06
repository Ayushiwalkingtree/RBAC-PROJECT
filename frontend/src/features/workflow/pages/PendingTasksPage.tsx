import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RefreshIcon from '@mui/icons-material/Refresh';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import { Chip, IconButton, Paper, Stack, Tooltip, Typography } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { workflowService, type WorkflowTask } from '@/features/workflow/services/workflow.service';
import { AppButton } from '@/shared/components/AppButton';
import { DataTable } from '@/shared/components/DataTable';
import { EmptyState } from '@/shared/components/EmptyState';
import { PageHeader } from '@/shared/components/PageHeader';
import { useToast } from '@/shared/components/useToast';
import { PERMISSION_KEYS, RESOURCE_KEYS, RESOURCE_PERMISSION_RULES } from '@/shared/constants/permission.constants';
import { usePermission } from '@/shared/hooks/usePermission';

const formatDate = (value?: string): string => (value ? new Date(value).toLocaleString() : '-');

const taskAllows = (task: WorkflowTask, action: string): boolean =>
  task.availableActions.length === 0 || task.availableActions.includes(action);

export const PendingTasksPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { can, canAll } = usePermission();
  const [tasks, setTasks] = useState<WorkflowTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [completionNotice, setCompletionNotice] = useState<{
    message: string;
    instanceId: string;
  } | null>(null);

  const canClaim = canAll(RESOURCE_PERMISSION_RULES.workflow.claim);
  const canApprove = canAll(RESOURCE_PERMISSION_RULES.workflow.approve);
  const canReject = canAll(RESOURCE_PERMISSION_RULES.workflow.reject);
  const canReadDetail = can(RESOURCE_KEYS.workflowTaskDetailApi, PERMISSION_KEYS.read);

  const loadTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      setTasks(await workflowService.getPendingTasks());
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to load workflow tasks.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const claimTask = async (task: WorkflowTask) => {
    setBusyTaskId(task.taskId);
    try {
      await workflowService.claimTask(task.taskId);
      showToast('Task claimed.');
      await loadTasks();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to claim task.', 'error');
    } finally {
      setBusyTaskId(null);
    }
  };

  const actionTask = async (task: WorkflowTask, actionCode: 'APPROVE' | 'REJECT') => {
    setBusyTaskId(task.taskId);
    try {
      const response = await workflowService.performTaskAction(task.taskId, {
        action_code: actionCode,
        comments: `${actionCode === 'APPROVE' ? 'Approved' : 'Rejected'} from pending tasks.`,
        payload: {},
      });
      const instanceId = workflowService.extractWorkflowInstanceId(response, task);
      const message = actionCode === 'APPROVE' ? 'Task approved successfully' : 'Task rejected successfully';
      showToast(message);
      if (instanceId) {
        workflowService.rememberWorkflowInstance({
          instanceId,
          actionCode,
          task,
          response,
          comments: `${actionCode === 'APPROVE' ? 'Approved' : 'Rejected'} from pending tasks.`,
        });
        setCompletionNotice({ message, instanceId });
        window.setTimeout(() => navigate(`/workflow/instances/${instanceId}`), 800);
        return;
      }
      await loadTasks();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Task action failed.', 'error');
    } finally {
      setBusyTaskId(null);
    }
  };

  return (
    <>
      <PageHeader title="My Pending Tasks" subtitle="Review, claim, and act on workflow runtime tasks.">
        <AppButton variant="outlined" color="inherit" startIcon={<RefreshIcon />} onClick={() => void loadTasks()}>
          Refresh
        </AppButton>
      </PageHeader>

      {completionNotice && (
        <Paper
          elevation={0}
          sx={{
            border: 1,
            borderColor: 'primary.main',
            mb: 2,
            p: 2,
          }}
        >
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between">
            <Stack spacing={0.25}>
              <Typography variant="subtitle2">{completionNotice.message}</Typography>
              <Typography variant="body2" color="text.secondary">
                Opening workflow instance {completionNotice.instanceId}.
              </Typography>
            </Stack>
            <AppButton onClick={() => navigate(`/workflow/instances/${completionNotice.instanceId}`)}>
              View Workflow Instance
            </AppButton>
          </Stack>
        </Paper>
      )}

      {isLoading ? (
        <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', p: 3 }}>
          <Typography color="text.secondary">Loading workflow tasks...</Typography>
        </Paper>
      ) : tasks.length === 0 ? (
        <EmptyState title="No pending tasks" description="Workflow tasks assigned to you or your candidate roles will appear here." />
      ) : (
        <DataTable
          rows={tasks}
          getRowId={(task) => task.taskId}
          columns={[
            { id: 'task', label: 'Task ID', render: (task) => task.taskId },
            { id: 'entity', label: 'Entity', render: (task) => task.entityName },
            { id: 'record', label: 'Record', render: (task) => task.entityRecordId },
            { id: 'title', label: 'Title', render: (task) => task.title },
            {
              id: 'status',
              label: 'Status',
              render: (task) => <Chip size="small" label={task.status} color="primary" variant="outlined" />,
            },
            {
              id: 'assigned',
              label: 'Assigned',
              render: (task) => task.assignedTo ?? task.candidateRole ?? '-',
            },
            { id: 'created', label: 'Created', render: (task) => formatDate(task.createdAt) },
            { id: 'due', label: 'Due', render: (task) => formatDate(task.dueDate) },
            {
              id: 'actions',
              label: 'Actions',
              render: (task) => (
                <Stack direction="row" spacing={0.5}>
                  {canReadDetail && (
                    <Tooltip title="View detail">
                      <IconButton size="small" onClick={() => navigate(`/workflow/tasks/${task.taskId}`)}>
                        <OpenInNewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {canClaim && (
                    <Tooltip title="Claim task">
                      <span>
                        <IconButton
                          size="small"
                          disabled={busyTaskId === task.taskId}
                          onClick={() => void claimTask(task)}
                        >
                          <DoneAllIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                  {canApprove && taskAllows(task, 'APPROVE') && (
                    <Tooltip title="Approve task">
                      <span>
                        <IconButton
                          size="small"
                          color="success"
                          disabled={busyTaskId === task.taskId}
                          onClick={() => void actionTask(task, 'APPROVE')}
                        >
                          <CheckCircleIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                  {canReject && taskAllows(task, 'REJECT') && (
                    <Tooltip title="Reject task">
                      <span>
                        <IconButton
                          size="small"
                          color="error"
                          disabled={busyTaskId === task.taskId}
                          onClick={() => void actionTask(task, 'REJECT')}
                        >
                          <ThumbDownIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                </Stack>
              ),
            },
          ]}
        />
      )}
    </>
  );
};
