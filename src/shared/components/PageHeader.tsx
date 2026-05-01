import { Stack, Typography } from '@mui/material';
import type { PropsWithChildren } from 'react';

type PageHeaderProps = PropsWithChildren<{
  title: string;
  subtitle: string;
}>;

export const PageHeader = ({ title, subtitle, children }: PageHeaderProps) => (
  <Stack
    direction={{ xs: 'column', sm: 'row' }}
    spacing={2}
    alignItems={{ xs: 'stretch', sm: 'center' }}
    justifyContent="space-between"
    sx={{ mb: 3 }}
  >
    <Stack spacing={0.5}>
      <Typography variant="h4">{title}</Typography>
      <Typography variant="body2" color="text.secondary">
        {subtitle}
      </Typography>
    </Stack>
    {children}
  </Stack>
);
