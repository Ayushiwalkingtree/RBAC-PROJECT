import AlarmIcon from '@mui/icons-material/Alarm';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ReplayIcon from '@mui/icons-material/Replay';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import { Alert, DialogActions, Divider, Paper, Stack, TextField, Typography } from '@mui/material';
import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { workflowService, type TaskActionPayload, type WorkflowActionCode, type WorkflowTask } from '@/features/workflow/services/workflow.service';
import { AppButton } from '@/shared/components/AppButton';
import { AppDialog } from '@/shared/components/AppDialog';
import { EmptyState } from '@/shared/components/EmptyState';
import { PageHeader } from '@/shared/components/PageHeader';
import { useToast } from '@/shared/components/useToast';
import { RESOURCE_PERMISSION_RULES } from '@/shared/constants/permission.constants';
import { usePermission } from '@/shared/hooks/usePermission';

const formatDate = (value?: string): string => (value ? new Date(value).toLocaleString() : '-');

const taskAllows = (task: WorkflowTask, action: string): boolean =>
  task.availableActions.length === 0 || task.availableActions.includes(action);

const actionSuccessMessage = (actionCode: WorkflowActionCode): string => {
  if (actionCode === 'APPROVE') return 'Task approved successfully';
  if (actionCode === 'REJECT') return 'Task rejected successfully';
  return 'Task returned successfully';
};

const detailRows = (task: WorkflowTask): Array<[string, string | undefined]> => [
  ['Task ID', task.taskId],
  ['Status', task.status],
  ['Entity', task.entityName],
  ['Record', task.entityRecordId],
  ['Assigned to', task.assignedTo],
  ['Candidate role', task.candidateRole],
  ['Created at', formatDate(task.createdAt)],
  ['Due date', formatDate(task.dueDate)],
  ['Instance', task.instanceId],
];

export const TaskDetailPage = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { canAll } = usePermission();
  const [task, setTask] = useState<WorkflowTask | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionCode, setActionCode] = useState<WorkflowActionCode | null>(null);
  const [comments, setComments] = useState('');
  const [actionPayload, setActionPayload] = useState('{}');
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderMessage, setReminderMessage] = useState('Please take action on this task');

  const canClaim = canAll(RESOURCE_PERMISSION_RULES.workflow.claim);
  const canApprove = canAll(RESOURCE_PERMISSION_RULES.workflow.approve);
  const canReject = canAll(RESOURCE_PERMISSION_RULES.workflow.reject);
  const canReturn = canAll(RESOURCE_PERMISSION_RULES.workflow.return);
  const canReminder = canAll(RESOURCE_PERMISSION_RULES.workflow.reminder);

  const loadTask = useCallback(async () => {
    if (!taskId) return;
    setIsLoading(true);
    try {
      setTask(await workflowService.getTaskDetail(taskId));
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to load task.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast, taskId]);

  useEffect(() => {
    void loadTask();
  }, [loadTask]);

  const parsedActionPayload = useMemo(() => {
    try {
      const parsed = JSON.parse(actionPayload) as Record<string, unknown>;
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return null;
    }
  }, [actionPayload]);

  const claimTask = async () => {
    if (!task) return;
    setIsSubmitting(true);
    try {
      await workflowService.claimTask(task.taskId);
      showToast('Task claimed.');
      await loadTask();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to claim task.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitAction = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!task || !actionCode || parsedActionPayload === null) return;

    const payload: TaskActionPayload = {
      action_code: actionCode,
      comments,
      payload: parsedActionPayload,
    };

    setIsSubmitting(true);
    const taskBeforeAction = task;
    try {
      const response = await workflowService.performTaskAction(taskBeforeAction.taskId, payload);
      const instanceId = workflowService.extractWorkflowInstanceId(response, taskBeforeAction) ?? taskBeforeAction.instanceId;
      showToast(actionSuccessMessage(actionCode));
      setActionCode(null);
      setComments('');
      setActionPayload('{}');
      if (instanceId) {
        workflowService.rememberWorkflowInstance({
          instanceId,
          actionCode,
          task: taskBeforeAction,
          response,
          comments,
        });
        window.setTimeout(() => navigate(`/workflow/instances/${instanceId}`), 800);
        return;
      }
      await loadTask();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Task action failed.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitReminder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!task) return;

    setIsSubmitting(true);
    try {
      await workflowService.sendReminder(task.taskId, { reminder_message: reminderMessage });
      showToast('Reminder sent.');
      setReminderOpen(false);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to send reminder.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAction = (nextActionCode: WorkflowActionCode) => {
    setActionCode(nextActionCode);
    setComments('');
    setActionPayload('{}');
  };

  if (!taskId) {
    return <EmptyState title="Task not found" description="No workflow task id was provided." />;
  }

  return (
    <>
      <PageHeader title={task?.title ?? 'Workflow Task'} subtitle="Task metadata, payload, and runtime actions.">
        <AppButton variant="outlined" color="inherit" startIcon={<ArrowBackIcon />} onClick={() => navigate('/workflow/tasks')}>
          Back
        </AppButton>
      </PageHeader>

      {isLoading ? (
        <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', p: 3 }}>
          <Typography color="text.secondary">Loading task detail...</Typography>
        </Paper>
      ) : !task ? (
        <EmptyState title="Task not found" description="The workflow service did not return task details." />
      ) : (
        <Stack spacing={2.5}>
          <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', p: { xs: 2, md: 3 } }}>
            <Stack spacing={2}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between">
                <Stack spacing={0.5}>
                  <Typography variant="h6">{task.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {task.entityName} / {task.entityRecordId}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {canClaim && (
                    <AppButton variant="outlined" startIcon={<AssignmentTurnedInIcon />} loading={isSubmitting} onClick={() => void claimTask()}>
                      Claim
                    </AppButton>
                  )}
                  {canApprove && taskAllows(task, 'APPROVE') && (
                    <AppButton color="success" startIcon={<CheckCircleIcon />} onClick={() => openAction('APPROVE')}>
                      Approve
                    </AppButton>
                  )}
                  {canReject && taskAllows(task, 'REJECT') && (
                    <AppButton color="error" startIcon={<ThumbDownIcon />} onClick={() => openAction('REJECT')}>
                      Reject
                    </AppButton>
                  )}
                  {canReturn && taskAllows(task, 'RETURN') && (
                    <AppButton variant="outlined" startIcon={<ReplayIcon />} onClick={() => openAction('RETURN')}>
                      Return
                    </AppButton>
                  )}
                  {canReminder && (
                    <AppButton variant="outlined" color="inherit" startIcon={<AlarmIcon />} onClick={() => setReminderOpen(true)}>
                      Reminder
                    </AppButton>
                  )}
                </Stack>
              </Stack>
              <Divider />
              <Stack direction="row" flexWrap="wrap" useFlexGap spacing={2}>
                {detailRows(task).map(([label, value]) => (
                  <Stack key={label} sx={{ minWidth: 180 }}>
                    <Typography variant="caption" color="text.secondary">
                      {label}
                    </Typography>
                    <Typography variant="body2">{value || '-'}</Typography>
                  </Stack>
                ))}
              </Stack>
              {task.instanceId && (
                <AppButton
                  variant="text"
                  sx={{ alignSelf: 'flex-start', px: 0 }}
                  onClick={() => navigate(`/workflow/instances/${task.instanceId}`)}
                >
                  View workflow instance
                </AppButton>
              )}
            </Stack>
          </Paper>

          <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', p: { xs: 2, md: 3 } }}>
            <Stack spacing={1}>
              <Typography variant="h6">Payload</Typography>
              <Typography
                component="pre"
                variant="body2"
                sx={{
                  bgcolor: 'background.default',
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  m: 0,
                  overflow: 'auto',
                  p: 2,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {JSON.stringify(task.payload ?? task.raw, null, 2)}
              </Typography>
            </Stack>
          </Paper>

          <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', p: { xs: 2, md: 3 } }}>
            <Stack spacing={1}>
              <Typography variant="h6">History</Typography>
              <Typography variant="body2" color="text.secondary">
                History and comments appear here when returned by the workflow service.
              </Typography>
              <Typography
                component="pre"
                variant="body2"
                sx={{ bgcolor: 'background.default', borderRadius: 1, m: 0, overflow: 'auto', p: 2, whiteSpace: 'pre-wrap' }}
              >
                {JSON.stringify(task.raw.history ?? task.raw.comments ?? task.raw.events ?? [], null, 2)}
              </Typography>
            </Stack>
          </Paper>
        </Stack>
      )}

      <AppDialog
        open={Boolean(actionCode)}
        title={`${actionCode ? actionCode.charAt(0) + actionCode.slice(1).toLowerCase() : 'Action'} task`}
        helperText="Submit a runtime action with comments and optional JSON payload."
        onClose={() => setActionCode(null)}
      >
        <Stack component="form" spacing={2} onSubmit={submitAction}>
          {parsedActionPayload === null && <Alert severity="error">Payload must be valid JSON object.</Alert>}
          <TextField label="Action code" value={actionCode ?? ''} disabled fullWidth />
          <TextField
            label="Comments"
            value={comments}
            onChange={(event) => setComments(event.target.value)}
            required
            multiline
            minRows={3}
            fullWidth
          />
          <TextField
            label="Payload JSON"
            value={actionPayload}
            onChange={(event) => setActionPayload(event.target.value)}
            multiline
            minRows={4}
            fullWidth
          />
          <DialogActions sx={{ px: 0, pb: 0 }}>
            <AppButton variant="outlined" color="inherit" onClick={() => setActionCode(null)}>
              Cancel
            </AppButton>
            <AppButton type="submit" loading={isSubmitting} disabled={parsedActionPayload === null}>
              Submit
            </AppButton>
          </DialogActions>
        </Stack>
      </AppDialog>

      <AppDialog
        open={reminderOpen}
        title="Send reminder"
        helperText="Send a reminder through the workflow runtime."
        onClose={() => setReminderOpen(false)}
      >
        <Stack component="form" spacing={2} onSubmit={submitReminder}>
          <TextField
            label="Reminder message"
            value={reminderMessage}
            onChange={(event) => setReminderMessage(event.target.value)}
            required
            multiline
            minRows={3}
            fullWidth
          />
          <DialogActions sx={{ px: 0, pb: 0 }}>
            <AppButton variant="outlined" color="inherit" onClick={() => setReminderOpen(false)}>
              Cancel
            </AppButton>
            <AppButton type="submit" loading={isSubmitting}>
              Send reminder
            </AppButton>
          </DialogActions>
        </Stack>
      </AppDialog>
    </>
  );
};
