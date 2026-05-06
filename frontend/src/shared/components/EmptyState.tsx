import InboxIcon from '@mui/icons-material/Inbox';
import { Paper, Stack, Typography } from '@mui/material';
import type { PropsWithChildren } from 'react';

type EmptyStateProps = PropsWithChildren<{
  title: string;
  description: string;
}>;

export const EmptyState = ({ title, description, children }: EmptyStateProps) => (
  <Paper
    elevation={0}
    sx={{
      border: 1,
      borderColor: 'divider',
      p: 4,
      textAlign: 'center',
      boxShadow: '0 1px 2px rgba(24, 36, 51, 0.04)',
    }}
  >
    <Stack spacing={2} alignItems="center">
      <Stack
        alignItems="center"
        justifyContent="center"
        sx={{
          width: 44,
          height: 44,
          borderRadius: 1.5,
          bgcolor: 'primary.light',
          color: 'primary.main',
        }}
      >
        <InboxIcon fontSize="small" />
      </Stack>
      <Stack spacing={0.5}>
        <Typography variant="h6">{title}</Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </Stack>
      {children}
    </Stack>
  </Paper>
);
