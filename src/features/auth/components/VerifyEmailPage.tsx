import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import {
  Alert,
  Box,
  Button,
  Container,
  Link,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { Link as RouterLink, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '@/features/auth/services/auth.service';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { APP_CONFIG } from '@/shared/constants/app.constants';
import { ROUTES } from '@/shared/constants/route.constants';

export const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((store) => store.isAuthenticated);
  const token = searchParams.get('token') ?? '';
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

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
              {token ? (
                <Typography variant="body2" color="text.secondary">
                  Ready to verify your email.
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Invalid or missing verification link.
                </Typography>
              )}
            </Box>
            {import.meta.env.DEV && (
              <Alert severity="info">
                In development, check backend console for the verification link.
              </Alert>
            )}
            {status && <Alert severity="success">{status}</Alert>}
            {error && <Alert severity="error">{error}</Alert>}
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
