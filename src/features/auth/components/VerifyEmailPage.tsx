import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import {
  Alert,
  Box,
  Button,
  Container,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { Link as RouterLink, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '@/features/auth/services/auth.service';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { APP_CONFIG } from '@/shared/constants/app.constants';
import { ROUTES } from '@/shared/constants/route.constants';

type VerifyState = {
  token?: string;
  email?: string;
  orgCode?: string;
  successMessage?: string;
};

export const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((store) => store.isAuthenticated);
  const state = location.state as VerifyState | null;
  const [token, setToken] = useState(state?.token ?? searchParams.get('token') ?? '');
  const [details, setDetails] = useState(state);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;

    void authService.getVerificationToken(token).then((record) => {
      if (!record) return;
      setDetails((current) => ({
        ...current,
        token,
        email: 'email' in record ? record.email : current?.email,
      }));
    });
  }, [token]);

  const handleVerify = async () => {
    try {
      setError('');
      await authService.verifyEmail(token);
      setStatus('Email verified. You can sign in now.');
      window.setTimeout(() => navigate(ROUTES.login, { replace: true }), 600);
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : 'Unable to verify email.');
    }
  };

  if (isAuthenticated) {
    return <Navigate to={APP_CONFIG.defaultRoute} replace />;
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', alignItems: 'center', py: 5 }}>
      <Container maxWidth="sm">
        <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', p: 3 }}>
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="h4" fontWeight={900}>Verify email</Typography>
              {token && (
                <Typography variant="body2" color="text.secondary">
                  Verification token received.
                </Typography>
              )}
            </Box>
            {details?.successMessage && <Alert severity="success">{details.successMessage}</Alert>}
            {details?.email && (
              <Alert severity="info">
                Verification pending for {details.email}{details.orgCode ? ` in ${details.orgCode}` : ''}.
              </Alert>
            )}
            {status && <Alert severity="success">{status}</Alert>}
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Verification token"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              fullWidth
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }}>
              <Link component={RouterLink} to={ROUTES.login}>Back to sign in</Link>
              <Button startIcon={<MarkEmailReadIcon />} disabled={!token} onClick={() => void handleVerify()}>
                Verify Email
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
};
