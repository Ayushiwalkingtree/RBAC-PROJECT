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
    }}
  >
    <Stack spacing={2} alignItems="center">
      <InboxIcon color="primary" />
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
