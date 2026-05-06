import HowToRegIcon from '@mui/icons-material/HowToReg';
import {
  Alert,
  Box,
  Button,
  Container,
  Grid,
  Link,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useState } from 'react';
import { Link as RouterLink, Navigate } from 'react-router-dom';
import { authService } from '@/features/auth/services/auth.service';
import { signupSchema, type SignupFormValues } from '@/features/auth/schemas/signup.schema';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { APP_CONFIG } from '@/shared/constants/app.constants';
import { ROUTES } from '@/shared/constants/route.constants';
import { STORAGE_KEYS } from '@/shared/constants/storage.constants';

const defaultValues: SignupFormValues = {
  org_name: '',
  org_code: '',
  admin_name: '',
  admin_email: '',
  password: '',
  timezone: 'Asia/Calcutta',
  plan: 'Starter',
};

const plans = ['Starter', 'Business', 'Enterprise'];
const timezones = ['Asia/Calcutta', 'UTC', 'America/New_York', 'Europe/London', 'Asia/Singapore'];

const generateOrgCode = (name: string): string =>
  name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/gu, '_')
    .replace(/^_+|_+$/gu, '');

export const SignupPage = () => {
  const isAuthenticated = useAuthStore((store) => store.isAuthenticated);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [devVerificationUrl, setDevVerificationUrl] = useState('');
  const { control, handleSubmit, setValue, formState } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues,
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      setError('');
      setSuccessMessage('');
      setDevVerificationUrl('');
      const result = await authService.signupTenant(values);
      window.localStorage.setItem(STORAGE_KEYS.lastOrgCode, result.org.code);
      setSuccessMessage(result.message ?? 'Organization created. Please check your email to verify your account.');
      setDevVerificationUrl(result.devVerificationUrl ?? '');
    } catch (signupError) {
      setError(signupError instanceof Error ? signupError.message : 'Unable to create organization.');
    }
  });

  if (isAuthenticated) {
    return <Navigate to={APP_CONFIG.defaultRoute} replace />;
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', alignItems: 'center', py: 5 }}>
      <Container maxWidth="md">
        <Stack spacing={2.5} alignItems="center">
          <Stack spacing={1} alignItems="center" textAlign="center">
            <Box
              sx={{
                width: 46,
                height: 46,
                borderRadius: 1.5,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                display: 'grid',
                placeItems: 'center',
                fontWeight: 900,
              }}
            >
              CI
            </Box>
            <Box>
              <Typography variant="h4">Create organization</Typography>
              <Typography variant="body2" color="text.secondary">
                Set up a tenant and verify the first administrator.
              </Typography>
            </Box>
          </Stack>
          <Paper
            component="form"
            onSubmit={onSubmit}
            elevation={0}
            sx={{
              width: '100%',
              border: 1,
              borderColor: 'divider',
              p: 3,
              boxShadow: '0 8px 24px rgba(24, 36, 51, 0.08)',
            }}
          >
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="h5">Organization details</Typography>
                <Typography variant="body2" color="text.secondary">
                  The first user becomes the verified organization admin after email verification.
                </Typography>
              </Box>
            <Alert severity="info">Organization codes are global; emails are unique only inside an organization.</Alert>
            {successMessage && (
              <Alert
                severity="success"
                action={(
                  <Stack direction="row" spacing={1}>
                    {devVerificationUrl && (
                      <Button href={devVerificationUrl} color="inherit" size="small">
                        Open verification link
                      </Button>
                    )}
                    <Button component={RouterLink} to={ROUTES.login} color="inherit" size="small">
                      Back to sign in
                    </Button>
                  </Stack>
                )}
              >
                {successMessage}
              </Alert>
            )}
            {error && <Alert severity="error">{error}</Alert>}
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Controller name="org_name" control={control} render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="Organization name"
                    error={Boolean(fieldState.error)}
                    helperText={fieldState.error?.message}
                    onChange={(event) => {
                      field.onChange(event);
                      if (!formState.dirtyFields.org_code) {
                        setValue('org_code', generateOrgCode(event.target.value), {
                          shouldDirty: false,
                          shouldValidate: true,
                        });
                      }
                    }}
                    fullWidth
                  />
                )} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Controller name="org_code" control={control} render={({ field, fieldState }) => (
                  <TextField {...field} label="Organization code" error={Boolean(fieldState.error)} helperText={fieldState.error?.message} fullWidth />
                )} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Controller name="admin_name" control={control} render={({ field, fieldState }) => (
                  <TextField {...field} label="Admin name" error={Boolean(fieldState.error)} helperText={fieldState.error?.message} fullWidth />
                )} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Controller name="admin_email" control={control} render={({ field, fieldState }) => (
                  <TextField {...field} label="Admin email" error={Boolean(fieldState.error)} helperText={fieldState.error?.message} fullWidth />
                )} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Controller name="password" control={control} render={({ field, fieldState }) => (
                  <TextField {...field} type="password" label="Password" error={Boolean(fieldState.error)} helperText={fieldState.error?.message} fullWidth />
                )} />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <Controller name="timezone" control={control} render={({ field }) => (
                  <TextField {...field} select label="Timezone" fullWidth>
                    {timezones.map((timezone) => <MenuItem key={timezone} value={timezone}>{timezone}</MenuItem>)}
                  </TextField>
                )} />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <Controller name="plan" control={control} render={({ field }) => (
                  <TextField {...field} select label="Plan" fullWidth>
                    {plans.map((plan) => <MenuItem key={plan} value={plan}>{plan}</MenuItem>)}
                  </TextField>
                )} />
              </Grid>
            </Grid>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }}>
              <Link component={RouterLink} to={ROUTES.login}>Back to sign in</Link>
              <Button type="submit" size="large" startIcon={<HowToRegIcon />}>Create and verify</Button>
            </Stack>
          </Stack>
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
};
