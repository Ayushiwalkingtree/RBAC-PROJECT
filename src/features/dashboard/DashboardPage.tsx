import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PeopleIcon from '@mui/icons-material/People';
import SecurityIcon from '@mui/icons-material/Security';
import SpaceDashboardIcon from '@mui/icons-material/SpaceDashboard';
import { Card, CardContent, Grid, Stack, Typography } from '@mui/material';
import { PageHeader } from '@/shared/components/PageHeader';
import { useAuthStore } from '@/features/auth/store/auth.store';

const metricIcons = [SpaceDashboardIcon, PeopleIcon, SecurityIcon, CheckCircleIcon] as const;

export const DashboardPage = () => {
  const session = useAuthStore((state) => state.session);
  const metrics = [
    { label: 'Navigation items', value: session?.navigation.length ?? 0 },
    { label: 'Assigned roles', value: session?.roles.length ?? 0 },
    { label: 'Permissions', value: session?.permissions.length ?? 0 },
    { label: 'Tenant status', value: session?.org.status ?? 'unknown' },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Tenant-scoped overview generated from the simulated login payload."
      />
      <Grid container spacing={2}>
        {metrics.map((metric, index) => {
          const Icon = metricIcons[index];
          return (
            <Grid key={metric.label} size={{ xs: 12, sm: 6, lg: 3 }}>
              <Card elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
                <CardContent>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Icon color="primary" />
                    <Stack>
                      <Typography variant="body2" color="text.secondary">
                        {metric.label}
                      </Typography>
                      <Typography variant="h5">{metric.value}</Typography>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </>
  );
};
