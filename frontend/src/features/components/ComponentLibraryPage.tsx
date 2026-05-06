import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import {
  Alert,
  Avatar,
  Box,
  Card,
  CardContent,
  Checkbox,
  DialogActions,
  Divider,
  FormControlLabel,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { AppButton } from '@/shared/components/AppButton';
import { AppDialog } from '@/shared/components/AppDialog';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { DataTable } from '@/shared/components/DataTable';
import { EmptyState } from '@/shared/components/EmptyState';
import { PageHeader } from '@/shared/components/PageHeader';
import { PermissionChip } from '@/shared/components/PermissionChip';
import { ResourceTypeBadge } from '@/shared/components/ResourceTypeBadge';
import { useToast } from '@/shared/components/useToast';

type DemoRow = {
  id: string;
  name: string;
  type: 'MENU' | 'API' | 'REPORT';
  status: string;
};

const demoRows: DemoRow[] = [
  { id: 'CMP-001', name: 'Permission Matrix', type: 'MENU', status: 'Active' },
  { id: 'CMP-002', name: 'Audit Logs API', type: 'API', status: 'Read only' },
  { id: 'CMP-003', name: 'Daily Report', type: 'REPORT', status: 'Available' },
];

const tabs = ['Buttons & UI', 'Forms', 'Data Table', 'Feedback', 'Data Display'] as const;

// Showcase only: this page previews shared components and must not own app behavior.
// App-wide UI changes belong in shared components and the MUI theme, not in this page.
export const ComponentLibraryPage = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <PageHeader
        title="Component Library"
        subtitle="Reusable UI patterns used across the application"
      />

      <Alert severity="info" sx={{ mb: 2 }}>
        This page is a visual reference for shared UI components. Update shared components to affect the whole app.
      </Alert>

      <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', overflow: 'hidden' }}>
        <Tabs
          value={activeTab}
          onChange={(_, nextTab: number) => setActiveTab(nextTab)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ px: 1.5, borderBottom: 1, borderColor: 'divider' }}
        >
          {tabs.map((tab) => (
            <Tab key={tab} label={tab} />
          ))}
        </Tabs>

        <Box sx={{ p: 2 }}>
          {activeTab === 0 && (
            <Stack spacing={2}>
              <Typography variant="h6">Buttons & UI</Typography>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                <AppButton startIcon={<AddIcon />}>Primary action</AppButton>
                <AppButton variant="outlined" startIcon={<SaveIcon />}>Secondary action</AppButton>
                <AppButton color="error" startIcon={<DeleteIcon />}>Danger action</AppButton>
                <AppButton loading>Loading</AppButton>
              </Stack>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                <PermissionChip label="View" selected />
                <PermissionChip label="Configure" />
                <ResourceTypeBadge type="MENU" />
                <ResourceTypeBadge type="API" />
                <ResourceTypeBadge type="REPORT" />
              </Stack>
            </Stack>
          )}

          {activeTab === 1 && (
            <Stack spacing={2}>
              <Typography variant="h6">Forms</Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField label="Text field" defaultValue="Tenant Access Console" fullWidth />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField select label="Select" defaultValue="Admin" fullWidth>
                    {['Admin', 'Maker', 'Checker'].map((option) => (
                      <MenuItem key={option} value={option}>{option}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
                    <FormControlLabel control={<Checkbox defaultChecked />} label="Checkbox" />
                    <FormControlLabel control={<Switch defaultChecked />} label="Toggle" />
                  </Stack>
                </Grid>
              </Grid>
            </Stack>
          )}

          {activeTab === 2 && (
            <Stack spacing={2}>
              <Typography variant="h6">Data Table</Typography>
              <DataTable
                rows={demoRows}
                getRowId={(row) => row.id}
                columns={[
                  { id: 'id', label: 'ID', render: (row) => row.id },
                  { id: 'name', label: 'Name', render: (row) => row.name },
                  { id: 'type', label: 'Type', render: (row) => <ResourceTypeBadge type={row.type} /> },
                  { id: 'status', label: 'Status', render: (row) => row.status },
                ]}
              />
            </Stack>
          )}

          {activeTab === 3 && (
            <Stack spacing={2}>
              <Typography variant="h6">Feedback</Typography>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                <AppButton onClick={() => showToast('Toast preview')}>Show toast</AppButton>
                <AppButton variant="outlined" onClick={() => setDialogOpen(true)}>Open dialog</AppButton>
                <AppButton color="error" onClick={() => setConfirmOpen(true)}>Open confirm</AppButton>
              </Stack>
              <EmptyState
                title="Empty state"
                description="Use this pattern when a page has no records to display."
              />
            </Stack>
          )}

          {activeTab === 4 && (
            <Stack spacing={2}>
              <Typography variant="h6">Data Display</Typography>
              <Grid container spacing={2}>
                {[
                  ['Users', '128'],
                  ['Roles', '14'],
                  ['Reports', '8'],
                ].map(([label, value]) => (
                  <Grid key={label} size={{ xs: 12, sm: 4 }}>
                    <Card elevation={0}>
                      <CardContent>
                        <Stack spacing={1.5}>
                          <Stack direction="row" spacing={1.25} alignItems="center">
                            <Avatar sx={{ bgcolor: 'primary.main', width: 34, height: 34 }}>{label[0]}</Avatar>
                            <Box>
                              <Typography variant="body2" color="text.secondary">{label}</Typography>
                              <Typography variant="h5">{value}</Typography>
                            </Box>
                          </Stack>
                          <Divider />
                          <PermissionChip label="Preview" selected />
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Stack>
          )}
        </Box>
      </Paper>

      <AppDialog
        open={dialogOpen}
        title="Shared dialog"
        helperText="This previews AppDialog styling only."
        onClose={() => setDialogOpen(false)}
      >
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Dialog content uses the same shared component as application forms.
          </Typography>
          <DialogActions sx={{ px: 0, pb: 0 }}>
            <AppButton variant="outlined" color="inherit" onClick={() => setDialogOpen(false)}>
              Cancel
            </AppButton>
            <AppButton onClick={() => setDialogOpen(false)}>Done</AppButton>
          </DialogActions>
        </Stack>
      </AppDialog>

      <ConfirmDialog
        open={confirmOpen}
        title="Confirm action"
        description="This previews the shared confirm dialog pattern."
        confirmLabel="Confirm"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => setConfirmOpen(false)}
      />
    </>
  );
};
