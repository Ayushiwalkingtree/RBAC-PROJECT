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
              <Typography variant="h4">Verify email</Typography>
              <Typography variant="body2" color="text.secondary">
                {token ? 'Ready to verify your email.' : 'Invalid or missing verification link.'}
              </Typography>
            </Box>
          </Stack>
          <Paper
            elevation={0}
            sx={{
              width: '100%',
              maxWidth: 420,
              border: 1,
              borderColor: 'divider',
              p: 3,
              boxShadow: '0 8px 24px rgba(24, 36, 51, 0.08)',
            }}
          >
            <Stack spacing={2.5}>
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
        </Stack>
      </Container>
    </Box>
  );
};
