import { useContext } from 'react';
import { ToastContext } from '@/shared/components/toast.context';

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within AppSnackbarProvider.');
  }

  return context;
};
