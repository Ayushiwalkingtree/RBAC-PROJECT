import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { APP_CONFIG } from '@/shared/constants/app.constants';
import { useAuthStore } from '@/features/auth/store/auth.store';

export const AuthGuard = () => {
  const location = useLocation();
  const session = useAuthStore((state) => state.session);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);

  if (!session || !isAuthenticated) {
    return <Navigate to={APP_CONFIG.loginRoute} replace state={{ from: location }} />;
  }

  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    logout();
    return <Navigate to={APP_CONFIG.loginRoute} replace state={{ from: location }} />;
  }

  return <Outlet />;
};
