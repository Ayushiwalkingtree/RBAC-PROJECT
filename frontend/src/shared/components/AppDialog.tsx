import {
  Dialog,
  DialogContent,
  DialogTitle,
  Fade,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { DialogProps } from '@mui/material';
import type { PropsWithChildren } from 'react';

type AppDialogProps = PropsWithChildren<{
  open: boolean;
  title: string;
  helperText?: string;
  onClose: () => void;
  maxWidth?: DialogProps['maxWidth'];
}>;

export const AppDialog = ({
  open,
  title,
  helperText,
  onClose,
  maxWidth = 'sm',
  children,
}: AppDialogProps) => (
  <Dialog
    open={open}
    onClose={onClose}
    maxWidth={maxWidth}
    fullWidth
    TransitionComponent={Fade}
    PaperProps={{
      sx: {
        borderRadius: 3,
        overflow: 'hidden',
      },
    }}
  >
    <DialogTitle sx={{ pb: 1 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
        <Stack spacing={0.5}>
          <Typography variant="h6">{title}</Typography>
          {helperText && (
            <Typography variant="body2" color="text.secondary">
              {helperText}
            </Typography>
          )}
        </Stack>
        <IconButton onClick={onClose} aria-label="Close dialog" size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>
    </DialogTitle>
    <DialogContent sx={{ pt: 2 }}>{children}</DialogContent>
  </Dialog>
);
