import { Alert, Snackbar } from '@mui/material';
import { useCallback, useMemo, useState, type PropsWithChildren } from 'react';
import { ToastContext, type ToastSeverity } from '@/shared/components/toast.context';

type ToastState = {
  message: string;
  severity: ToastSeverity;
};

export const AppSnackbarProvider = ({ children }: PropsWithChildren) => {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((message: string, severity: ToastSeverity = 'success') => {
    setToast({ message, severity });
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={3200}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {toast ? (
          <Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)}>
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </ToastContext.Provider>
  );
};
