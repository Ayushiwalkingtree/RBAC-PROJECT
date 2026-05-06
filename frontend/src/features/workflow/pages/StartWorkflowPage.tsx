import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { type ChangeEvent, type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { workflowService, type StartWorkflowFormValues, type StartWorkflowPayload, type WorkflowPriority } from '@/features/workflow/services/workflow.service';
import { AppButton } from '@/shared/components/AppButton';
import { PageHeader } from '@/shared/components/PageHeader';
import { useToast } from '@/shared/components/useToast';
import { RESOURCE_PERMISSION_RULES } from '@/shared/constants/permission.constants';
import { usePermission } from '@/shared/hooks/usePermission';

const initialValues: StartWorkflowFormValues = {
  task_title: '',
  description: '',
  priority: 'MEDIUM',
  category: '',
  due_date: '',
  amount: '',
  currency: 'INR',
};

const priorities: WorkflowPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const stringFrom = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value;
    if (typeof value === 'number') return String(value);
  }
  return undefined;
};

export const StartWorkflowPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { canAll } = usePermission();
  const [values, setValues] = useState(initialValues);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastInstanceId, setLastInstanceId] = useState<string | null>(null);
  const canStartWorkflow = canAll(RESOURCE_PERMISSION_RULES.workflow.start);

  const updateField =
    (field: keyof StartWorkflowFormValues) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setValues((current) => ({ ...current, [field]: event.target.value }));
    };

  const buildPayload = (): StartWorkflowPayload => {
    const amount = values.amount ? Number(values.amount) : undefined;

    return {
      entity_name: 'TASK',
      entity_table_name: 'tasks',
      entity_record_id: `TASK-${Date.now()}`,
      payload: {
        title: values.task_title.trim(),
        description: values.description.trim(),
        priority: values.priority,
        category: values.category.trim(),
        due_date: values.due_date,
        ...(Number.isFinite(amount) ? { amount } : {}),
        ...(values.currency?.trim() ? { currency: values.currency.trim().toUpperCase() } : {}),
      },
    };
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canStartWorkflow) return;

    setIsSubmitting(true);
    try {
      const result = await workflowService.startWorkflow(buildPayload());
      const instanceId = stringFrom(result.instance_id, result.workflow_instance_id, result.id);
      showToast('Workflow started.');
      setValues(initialValues);
      setLastInstanceId(instanceId ?? null);
      navigate(instanceId ? `/workflow/instances/${instanceId}` : '/workflow/tasks');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to start workflow.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader title="Start Task Workflow" subtitle="Create a generic task workflow in the runtime service." />

      <Paper
        component="form"
        elevation={0}
        onSubmit={handleSubmit}
        sx={{
          border: 1,
          borderColor: 'divider',
          p: { xs: 2, md: 3 },
          maxWidth: 760,
        }}
      >
        <Stack spacing={2.25}>
          <TextField
            label="Task title"
            value={values.task_title}
            onChange={updateField('task_title')}
            required
            fullWidth
          />
          <TextField
            label="Description"
            value={values.description}
            onChange={updateField('description')}
            required
            multiline
            minRows={3}
            fullWidth
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              select
              label="Priority"
              value={values.priority}
              onChange={updateField('priority')}
              fullWidth
            >
              {priorities.map((priority) => (
                <MenuItem key={priority} value={priority}>
                  {priority}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Category"
              value={values.category}
              onChange={updateField('category')}
              required
              fullWidth
            />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Due date"
              type="date"
              value={values.due_date}
              onChange={updateField('due_date')}
              InputLabelProps={{ shrink: true }}
              required
              fullWidth
            />
            <TextField
              label="Amount"
              type="number"
              value={values.amount}
              onChange={updateField('amount')}
              inputProps={{ min: 0, step: 0.01 }}
              fullWidth
            />
            <TextField
              label="Currency"
              value={values.currency}
              onChange={updateField('currency')}
              fullWidth
            />
          </Stack>
          {lastInstanceId && (
            <Typography variant="body2" color="text.secondary">
              Last workflow instance: {lastInstanceId}
            </Typography>
          )}
          <Stack direction="row" justifyContent="flex-end">
            <AppButton type="submit" startIcon={<PlayArrowIcon />} loading={isSubmitting} disabled={!canStartWorkflow}>
              Start workflow
            </AppButton>
          </Stack>
        </Stack>
      </Paper>
    </>
  );
};
