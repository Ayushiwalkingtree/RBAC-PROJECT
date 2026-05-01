import AssessmentIcon from '@mui/icons-material/Assessment';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import PeopleIcon from '@mui/icons-material/People';
import SecurityIcon from '@mui/icons-material/Security';
import { Card, CardContent, Grid, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { dashboardService, type DashboardMetrics } from '@/features/dashboard/dashboard.service';
import { PageHeader } from '@/shared/components/PageHeader';
import { useAuthStore } from '@/features/auth/store/auth.store';

const metricIcons = [PeopleIcon, SecurityIcon, ConfirmationNumberIcon, AssessmentIcon] as const;

export const DashboardPage = () => {
  const session = useAuthStore((state) => state.session);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    users: 0,
    roles: 0,
    tickets: 0,
    reports: 0,
  });

  useEffect(() => {
    if (!session) {
      return;
    }

    void dashboardService.getMetrics(session.org.id).then(setMetrics);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.org.id]);

  const cards = [
    { label: 'Users', value: metrics.users },
    { label: 'Roles', value: metrics.roles },
    { label: 'Tickets', value: metrics.tickets },
    { label: 'Reports', value: metrics.reports },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Live counts from the local mock database for the current tenant."
      />
      <Grid container spacing={2}>
        {cards.map((metric, index) => {
          const Icon = metricIcons[index];
          return (
            <Grid key={metric.label} size={{ xs: 12, sm: 6, lg: 3 }}>
              <Card
                elevation={0}
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  transition: 'transform 160ms ease, box-shadow 160ms ease',
                  '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 },
                }}
              >
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
