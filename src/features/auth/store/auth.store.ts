import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '@/shared/constants/storage.constants';
import type { AuthSession, LoginCredentials } from '@/shared/types/auth.types';
import { authService } from '@/features/auth/services/auth.service';

type AuthState = {
  session: AuthSession | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  refreshSession: () => Promise<void>;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      isLoading: false,
      error: null,
      isAuthenticated: false,
      login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
          const session = await authService.login(credentials);
          set({ session, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unable to sign in.',
            isLoading: false,
            isAuthenticated: false,
            session: null,
          });
          throw error;
        }
      },
      logout: () => set({ session: null, isAuthenticated: false, error: null }),
      clearError: () => set({ error: null }),
      refreshSession: async () => {
        const currentSession = useAuthStore.getState().session;
        if (!currentSession) {
          return;
        }

        const refreshedSession = await authService.refreshCurrentUserPermissions(currentSession);
        if (!refreshedSession) {
          set({ session: null, isAuthenticated: false });
          return;
        }

        set({ session: refreshedSession, isAuthenticated: true });
      },
    }),
    {
      name: STORAGE_KEYS.auth,
      partialize: (state) => ({
        session: state.session,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
