import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  DialogActions,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Tooltip,
} from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { useEffect } from 'react';
import { AppButton } from '@/shared/components/AppButton';
import { RESOURCE_TYPES } from '@/shared/constants/permission.constants';
import { resourceSchema, type ResourceFormValues } from '@/features/resources/resource.schema';
import { emptyResourceFormValues } from '@/features/resources/resourceForm.utils';

type ResourceFormProps = {
  initialValues?: ResourceFormValues;
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (values: ResourceFormValues) => Promise<void> | void;
};

export const ResourceForm = ({ initialValues, loading = false, onCancel, onSubmit }: ResourceFormProps) => {
  const { control, handleSubmit, reset } = useForm<ResourceFormValues>({
    resolver: zodResolver(resourceSchema),
    defaultValues: initialValues ?? emptyResourceFormValues,
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'allowed_permissions' });

  useEffect(() => {
    reset(initialValues ?? emptyResourceFormValues);
  }, [initialValues, reset]);

  return (
    <Stack component="form" spacing={2} onSubmit={handleSubmit(onSubmit)}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Controller name="resource_key" control={control} render={({ field, fieldState }) => (
            <TextField {...field} label="Resource key" error={Boolean(fieldState.error)} helperText={fieldState.error?.message} fullWidth />
          )} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Controller name="resource_name" control={control} render={({ field, fieldState }) => (
            <TextField {...field} label="Resource name" error={Boolean(fieldState.error)} helperText={fieldState.error?.message} fullWidth />
          )} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Controller name="resource_type" control={control} render={({ field }) => (
            <TextField {...field} select label="Resource type" fullWidth>
              {Object.values(RESOURCE_TYPES).map((type) => <MenuItem key={type} value={type}>{type}</MenuItem>)}
            </TextField>
          )} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Controller name="resource_group" control={control} render={({ field, fieldState }) => (
            <TextField {...field} label="Resource group" error={Boolean(fieldState.error)} helperText={fieldState.error?.message} fullWidth />
          )} />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Controller name="description" control={control} render={({ field, fieldState }) => (
            <TextField {...field} label="Description" error={Boolean(fieldState.error)} helperText={fieldState.error?.message} fullWidth multiline minRows={2} />
          )} />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Controller name="sequence_no" control={control} render={({ field, fieldState }) => (
            <TextField {...field} value={field.value ?? ''} type="number" label="Sequence no" error={Boolean(fieldState.error)} helperText={fieldState.error?.message} fullWidth />
          )} />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Controller name="parent_resource_key" control={control} render={({ field }) => (
            <TextField {...field} label="Parent resource key" fullWidth />
          )} />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Controller name="http_method" control={control} render={({ field, fieldState }) => (
            <TextField {...field} value={field.value ?? ''} select label="HTTP method" error={Boolean(fieldState.error)} helperText={fieldState.error?.message} fullWidth>
              {['', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((method) => <MenuItem key={method || 'none'} value={method}>{method || 'None'}</MenuItem>)}
            </TextField>
          )} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Controller name="api_path" control={control} render={({ field, fieldState }) => (
            <TextField {...field} label="API path" error={Boolean(fieldState.error)} helperText={fieldState.error?.message} fullWidth />
          )} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Controller name="microservice" control={control} render={({ field, fieldState }) => (
            <TextField {...field} label="Microservice" error={Boolean(fieldState.error)} helperText={fieldState.error?.message} fullWidth />
          )} />
        </Grid>
      </Grid>

      <Stack spacing={1}>
        {fields.map((field, index) => (
          <Grid container spacing={1} key={field.id}>
            <Grid size={{ xs: 5 }}>
              <Controller name={`allowed_permissions.${index}.key`} control={control} render={({ field: permissionField }) => (
                <TextField {...permissionField} label="Permission key" fullWidth />
              )} />
            </Grid>
            <Grid size={{ xs: 5 }}>
              <Controller name={`allowed_permissions.${index}.label`} control={control} render={({ field: permissionField }) => (
                <TextField {...permissionField} label="Permission label" fullWidth />
              )} />
            </Grid>
            <Grid size={{ xs: 2 }}>
              <Tooltip title="Remove permission">
                <IconButton onClick={() => remove(index)} aria-label="Remove permission">
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            </Grid>
          </Grid>
        ))}
        <AppButton variant="outlined" startIcon={<AddIcon />} onClick={() => append({ key: '', label: '' })}>
          Add permission
        </AppButton>
      </Stack>

      <Stack direction="row" spacing={2}>
        <Controller name="is_ui_visible" control={control} render={({ field }) => (
          <FormControlLabel control={<Switch checked={field.value} onChange={(_, checked) => field.onChange(checked)} />} label="UI visible" />
        )} />
        <Controller name="is_active" control={control} render={({ field }) => (
          <FormControlLabel control={<Switch checked={field.value} onChange={(_, checked) => field.onChange(checked)} />} label="Active" />
        )} />
      </Stack>

      <DialogActions sx={{ px: 0 }}>
        <AppButton variant="outlined" color="inherit" onClick={onCancel}>Cancel</AppButton>
        <AppButton type="submit" loading={loading}>Save resource</AppButton>
      </DialogActions>
    </Stack>
  );
};
