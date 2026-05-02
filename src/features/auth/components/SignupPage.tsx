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
import { Link as RouterLink, Navigate, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((store) => store.isAuthenticated);
  const [error, setError] = useState('');
  const { control, handleSubmit, setValue, formState } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues,
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      setError('');
      const result = await authService.signupTenant(values);
      window.localStorage.setItem(STORAGE_KEYS.lastOrgCode, result.org.code);
      navigate(`${ROUTES.verifyEmail}?token=${encodeURIComponent(result.verificationToken)}`, {
        replace: true,
        state: {
          token: result.verificationToken,
          email: result.user.email,
          orgCode: result.org.code,
          successMessage: 'Organization created. First administrator created as Organization Admin.',
        },
      });
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
        <Paper component="form" onSubmit={onSubmit} elevation={0} sx={{ border: 1, borderColor: 'divider', p: 3 }}>
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="h4" fontWeight={900}>Create organization</Typography>
              <Typography variant="body2" color="text.secondary">
                The first user becomes the verified organization admin after email verification.
              </Typography>
            </Box>
            <Alert severity="info">Organization codes are global; emails are unique only inside an organization.</Alert>
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
      </Container>
    </Box>
  );
};
