import { DialogActions, DialogContentText, Stack } from '@mui/material';
import { AppButton } from '@/shared/components/AppButton';
import { AppDialog } from '@/shared/components/AppDialog';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
};

export const ConfirmDialog = ({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  loading = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) => (
  <AppDialog open={open} title={title} onClose={onCancel} maxWidth="xs">
    <Stack spacing={2}>
      <DialogContentText>{description}</DialogContentText>
      <DialogActions sx={{ px: 0, pb: 0, gap: 1 }}>
        <AppButton variant="outlined" color="inherit" onClick={onCancel}>
          Cancel
        </AppButton>
        <AppButton color="error" loading={loading} onClick={onConfirm}>
          {confirmLabel}
        </AppButton>
      </DialogActions>
    </Stack>
  </AppDialog>
);
