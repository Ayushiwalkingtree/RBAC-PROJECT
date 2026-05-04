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
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { authService } from '@/features/auth/services/auth.service';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { ROUTES } from '@/shared/constants/route.constants';

export const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const isAuthenticated = useAuthStore((store) => store.isAuthenticated);
  const session = useAuthStore((store) => store.session);
  const token = searchParams.get('token') ?? '';
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async () => {
    try {
      setError('');
      setIsVerifying(true);
      const message = await authService.verifyEmail(token);
      setStatus(message || 'Email verified successfully. You can now sign in.');
      window.localStorage.setItem('email_verified_event', String(Date.now()));
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : 'Unable to verify email.');
    } finally {
      setIsVerifying(false);
    }
  };

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
                In development, signup and user-create responses can show an Open verification link button.
              </Alert>
            )}
            {isAuthenticated && session?.user.email && (
              <Alert severity="info">
                You are currently signed in as {session.user.email}. Verifying this link will not switch accounts.
              </Alert>
            )}
            {status && <Alert severity="success">{status}</Alert>}
            {error && <Alert severity="error">{error}</Alert>}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }}>
              {isAuthenticated ? (
                <Link component={RouterLink} to={ROUTES.dashboard}>Back to current dashboard</Link>
              ) : (
                <Link component={RouterLink} to={ROUTES.login}>Go to sign in</Link>
              )}
              {!status && (
                <Button
                  type="button"
                  startIcon={<MarkEmailReadIcon />}
                  disabled={!token || isVerifying}
                  onClick={() => void handleVerify()}
                >
                  Verify Email
                </Button>
              )}
            </Stack>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
};
