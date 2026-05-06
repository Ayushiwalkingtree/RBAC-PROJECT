import LoginIcon from '@mui/icons-material/Login';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Collapse,
  Container,
  Divider,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { APP_CONFIG } from '@/shared/constants/app.constants';
import { authService } from '@/features/auth/services/auth.service';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { loginSchema, type LoginFormValues } from '@/features/auth/schemas/login.schema';
import { ROUTES } from '@/shared/constants/route.constants';
import { STORAGE_KEYS } from '@/shared/constants/storage.constants';
import type { Organization } from '@/shared/types/auth.types';

type LocationState = {
  from?: {
    pathname?: string;
  };
};

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const login = useAuthStore((store) => store.login);
  const error = useAuthStore((store) => store.error);
  const isLoading = useAuthStore((store) => store.isLoading);
  const isAuthenticated = useAuthStore((store) => store.isAuthenticated);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [showAdvancedOrgCode, setShowAdvancedOrgCode] = useState(false);
  const lastOrgCode =
    typeof window === 'undefined' ? undefined : window.localStorage.getItem(STORAGE_KEYS.lastOrgCode) ?? undefined;

  const { control, handleSubmit } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      org_code: lastOrgCode ?? '',
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    void authService.listOrganizations().then((nextOrganizations) => {
      setOrganizations(nextOrganizations);
    });
  }, []);

  const orgByCode = useMemo(
    () => new Map(organizations.map((organization) => [organization.code, organization])),
    [organizations],
  );

  const onSubmit = handleSubmit(async (values) => {
    window.localStorage.setItem(STORAGE_KEYS.lastOrgCode, values.org_code);
    await login(values);
    const nextSession = useAuthStore.getState().session;
    navigate(state?.from?.pathname ?? nextSession?.navigation[0]?.path ?? APP_CONFIG.defaultRoute, { replace: true });
  });

  if (isAuthenticated) {
    return <Navigate to={APP_CONFIG.defaultRoute} replace />;
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 5,
      }}
    >
      <Container maxWidth="sm">
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
              <Typography variant="h4">Welcome back</Typography>
              <Typography variant="body2" color="text.secondary">
                Sign in to {APP_CONFIG.name}
              </Typography>
            </Box>
          </Stack>
          <Paper
            component="form"
            onSubmit={onSubmit}
            elevation={0}
            sx={{
              width: '100%',
              maxWidth: 400,
              p: 3,
              border: 1,
              borderColor: 'divider',
              boxShadow: '0 8px 24px rgba(24, 36, 51, 0.08)',
            }}
          >
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="h5">Sign in</Typography>
                <Typography variant="body2" color="text.secondary">
                  Choose an organization, then sign in with tenant-scoped credentials.
                </Typography>
              </Box>
              {error && <Alert severity="error">{error}</Alert>}
              <Controller
                name="org_code"
                control={control}
                render={({ field, fieldState }) => {
                  const selectedOrganization = orgByCode.get(field.value) ?? null;

                  return (
                    <Stack spacing={1.25}>
                      <Autocomplete
                        options={organizations}
                        value={selectedOrganization}
                        isOptionEqualToValue={(option, value) => option.code === value.code}
                        getOptionLabel={(option) => option.name}
                        onChange={(_, organization) => field.onChange(organization?.code ?? '')}
                        renderOption={(props, organization) => (
                          <Box component="li" {...props}>
                            <Box>
                              <Typography variant="body2" fontWeight={800}>
                                {organization.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {organization.code}
                              </Typography>
                            </Box>
                          </Box>
                        )}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Organization"
                            error={Boolean(fieldState.error)}
                            helperText={fieldState.error?.message ?? selectedOrganization?.code}
                            fullWidth
                          />
                        )}
                      />
                      <Button
                        variant="text"
                        size="small"
                        onClick={() => setShowAdvancedOrgCode((current) => !current)}
                        sx={{ alignSelf: 'flex-start' }}
                      >
                        Advanced / Use organization code
                      </Button>
                      <Collapse in={showAdvancedOrgCode}>
                        <Stack spacing={1.25}>
                          <Divider />
                          <TextField
                            {...field}
                            label="Organization code"
                            error={Boolean(fieldState.error)}
                            helperText="Use this when an organization is hidden from the list."
                            autoComplete="organization"
                            fullWidth
                          />
                        </Stack>
                      </Collapse>
                    </Stack>
                  );
                }}
              />
              <Controller
                name="email"
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="Email"
                    error={Boolean(fieldState.error)}
                    helperText={fieldState.error?.message}
                    autoComplete="email"
                    fullWidth
                  />
                )}
              />
              <Controller
                name="password"
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    type="password"
                    label="Password"
                    error={Boolean(fieldState.error)}
                    helperText={fieldState.error?.message}
                    autoComplete="current-password"
                    fullWidth
                  />
                )}
              />
              <Button type="submit" startIcon={<LoginIcon />} disabled={isLoading} size="large" fullWidth>
                {isLoading ? 'Signing in...' : 'Sign in'}
              </Button>
              <Link component={RouterLink} to={ROUTES.signup} textAlign="center">
                Create a new organization
              </Link>
            </Stack>
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
};
