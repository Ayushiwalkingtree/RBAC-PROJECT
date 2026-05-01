import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  DialogActions,
  FormControlLabel,
  Grid,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useEffect } from 'react';
import { AppButton } from '@/shared/components/AppButton';
import { PermissionChip } from '@/shared/components/PermissionChip';
import {
  ACTION_LABELS,
  ADMIN_ACTION_OPTIONS,
  ADMIN_RESOURCE_TYPES,
  DEFAULT_ACTIONS_BY_RESOURCE_TYPE,
  RESOURCE_GROUP_OPTIONS,
  RESOURCE_TYPE_LABELS,
} from '@/shared/constants/permission.constants';
import { resourceSchema, type ResourceFormValues } from '@/features/resources/resource.schema';
import {
  emptyResourceFormValues,
  normalizeResourceFormValues,
  toPermissionDefinitions,
} from '@/features/resources/resourceForm.utils';
import type { ResourceRecord } from '@/shared/types/rbac.types';

type ResourceFormProps = {
  initialValues?: ResourceFormValues;
  loading?: boolean;
  parentResources: ResourceRecord[];
  showAdvanced: boolean;
  onCancel: () => void;
  onSubmit: (values: ResourceFormValues) => Promise<void> | void;
};

export const ResourceForm = ({
  initialValues,
  loading = false,
  parentResources,
  showAdvanced,
  onCancel,
  onSubmit,
}: ResourceFormProps) => {
  const { control, handleSubmit, reset, setValue } = useForm<ResourceFormValues>({
    resolver: zodResolver(resourceSchema),
    defaultValues: initialValues ?? emptyResourceFormValues,
  });
  const resourceType = useWatch({ control, name: 'resource_type' });
  const selectedPermissions = useWatch({ control, name: 'allowed_permissions' }) ?? [];

  useEffect(() => {
    reset(initialValues ?? emptyResourceFormValues);
  }, [initialValues, reset]);

  const toggleAction = (action: string) => {
    const exists = selectedPermissions.some((permission) => permission.key === action);
    const nextActions = exists
      ? selectedPermissions.filter((permission) => permission.key !== action).map((permission) => permission.key)
      : [...selectedPermissions.map((permission) => permission.key), action];
    setValue('allowed_permissions', toPermissionDefinitions(nextActions), { shouldDirty: true, shouldValidate: true });
  };

  const applyDefaults = () => {
    setValue(
      'allowed_permissions',
      toPermissionDefinitions(DEFAULT_ACTIONS_BY_RESOURCE_TYPE[resourceType] ?? ['VIEW']),
      { shouldDirty: true, shouldValidate: true },
    );
  };

  return (
    <Stack
      component="form"
      spacing={2.25}
      onSubmit={handleSubmit((values) => onSubmit(normalizeResourceFormValues(values)))}
    >
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Controller name="resource_name" control={control} render={({ field, fieldState }) => (
            <TextField {...field} label="Resource name" error={Boolean(fieldState.error)} helperText={fieldState.error?.message} fullWidth />
          )} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Controller name="resource_type" control={control} render={({ field }) => (
            <TextField
              {...field}
              select
              label="Resource type"
              fullWidth
              onChange={(event) => {
                field.onChange(event);
                setValue(
                  'allowed_permissions',
                  toPermissionDefinitions(DEFAULT_ACTIONS_BY_RESOURCE_TYPE[event.target.value] ?? ['VIEW']),
                  { shouldDirty: true, shouldValidate: true },
                );
              }}
            >
              {ADMIN_RESOURCE_TYPES.map((type) => (
                <MenuItem key={type} value={type}>{RESOURCE_TYPE_LABELS[type]}</MenuItem>
              ))}
            </TextField>
          )} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Controller name="resource_group" control={control} render={({ field, fieldState }) => (
            <TextField {...field} select label="Module / Group" error={Boolean(fieldState.error)} helperText={fieldState.error?.message} fullWidth>
              {RESOURCE_GROUP_OPTIONS.map((group) => <MenuItem key={group} value={group}>{group}</MenuItem>)}
            </TextField>
          )} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Controller name="parent_resource_key" control={control} render={({ field }) => (
            <TextField
              {...field}
              select
              label="Parent menu"
              helperText="This controls where the item appears in navigation."
              fullWidth
            >
              <MenuItem value="">None / Top level</MenuItem>
              {parentResources.map((resource) => (
                <MenuItem key={resource.resourceKey} value={resource.resourceKey}>
                  {resource.displayName ?? resource.resourceName}
                </MenuItem>
              ))}
            </TextField>
          )} />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Controller name="sequence_no" control={control} render={({ field }) => (
            <TextField {...field} value={field.value ?? ''} type="number" label="Sort order" fullWidth />
          )} />
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <Controller name="description" control={control} render={({ field }) => (
            <TextField {...field} label="Description" fullWidth />
          )} />
        </Grid>
      </Grid>

      <Stack spacing={1}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle2" fontWeight={900}>Available actions</Typography>
          <AppButton variant="text" size="small" onClick={applyDefaults}>Use defaults</AppButton>
        </Stack>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {ADMIN_ACTION_OPTIONS.map((action) => (
            <PermissionChip
              key={action}
              label={ACTION_LABELS[action] ?? action}
              selected={selectedPermissions.some((permission) => permission.key === action)}
              onClick={() => toggleAction(action)}
            />
          ))}
        </Stack>
      </Stack>

      <Stack direction="row" spacing={2}>
        <Controller name="is_ui_visible" control={control} render={({ field }) => (
          <FormControlLabel control={<Switch checked={field.value} onChange={(_, checked) => field.onChange(checked)} />} label="UI visible" />
        )} />
        <Controller name="is_active" control={control} render={({ field }) => (
          <FormControlLabel control={<Switch checked={field.value} onChange={(_, checked) => field.onChange(checked)} />} label="Active" />
        )} />
      </Stack>

      {showAdvanced && (
        <Accordion disableGutters elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2" fontWeight={900}>Advanced backend mapping</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Controller name="resource_key" control={control} render={({ field }) => (
                  <TextField {...field} label="Resource key" fullWidth />
                )} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Controller name="parent_resource_key" control={control} render={({ field }) => (
                  <TextField {...field} label="Parent resource key" fullWidth />
                )} />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Controller name="http_method" control={control} render={({ field }) => (
                  <TextField {...field} value={field.value ?? ''} select label="HTTP method" fullWidth>
                    {['', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((method) => (
                      <MenuItem key={method || 'none'} value={method}>{method || 'None'}</MenuItem>
                    ))}
                  </TextField>
                )} />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Controller name="api_path" control={control} render={({ field }) => (
                  <TextField {...field} label="API path" fullWidth />
                )} />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Controller name="microservice" control={control} render={({ field }) => (
                  <TextField {...field} label="Microservice" fullWidth />
                )} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Raw permission JSON"
                  value={JSON.stringify(selectedPermissions, null, 2)}
                  fullWidth
                  multiline
                  minRows={4}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      )}

      <DialogActions sx={{ px: 0 }}>
        <AppButton variant="outlined" color="inherit" onClick={onCancel}>Cancel</AppButton>
        <AppButton type="submit" loading={loading}>Save resource</AppButton>
      </DialogActions>
    </Stack>
  );
};
