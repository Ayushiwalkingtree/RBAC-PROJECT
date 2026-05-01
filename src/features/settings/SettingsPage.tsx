import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SaveIcon from '@mui/icons-material/Save';
import {
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { organizationService } from '@/features/settings/organization.service';
import { AppButton } from '@/shared/components/AppButton';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { PageHeader } from '@/shared/components/PageHeader';
import { useToast } from '@/shared/components/useToast';
import { PermissionGuard } from '@/shared/components/guards/PermissionGuard';
import { PERMISSION_KEYS, RESOURCE_KEYS } from '@/shared/constants/permission.constants';
import { THEME_OPTIONS } from '@/shared/theme/theme.constants';
import { useThemeStore } from '@/shared/theme/theme.store';
import type { TenantSetting } from '@/shared/types/domain.types';
import type { ThemeMode } from '@/shared/types/theme.types';

export const SettingsPage = () => {
  const session = useAuthStore((state) => state.session);
  const refreshSession = useAuthStore((state) => state.refreshSession);
  const logout = useAuthStore((state) => state.logout);
  const mode = useThemeStore((state) => state.mode);
  const setMode = useThemeStore((state) => state.setMode);
  const { showToast } = useToast();
  const [settings, setSettings] = useState<TenantSetting[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  const loadSettings = async () => {
    if (!session) {
      return;
    }

    setSettings(await organizationService.listOrganizationSettings(session.org.id));
  };

  useEffect(() => {
    void loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.org.id]);

  const handleSettingChange = (key: string, value: string) => {
    setSettings((current) =>
      current.map((setting) => (setting.key === key ? { ...setting, value } : setting)),
    );
  };

  const handleSave = async () => {
    if (!session) {
      return;
    }

    setIsSaving(true);
    try {
      const savedSettings = await organizationService.updateOrganizationSettings(session.org.id, settings);
      setSettings(savedSettings);
      await refreshSession();
      showToast('Settings saved.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to save settings.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    setIsSaving(true);
    try {
      await organizationService.resetMockDatabase();
      showToast('Mock data reset. Please sign in again.', 'info');
      logout();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to reset mock data.', 'error');
    } finally {
      setIsSaving(false);
      setResetOpen(false);
    }
  };

  const handleThemeChange = (event: SelectChangeEvent) => {
    setMode(event.target.value as ThemeMode);
  };

  return (
    <>
      <PageHeader title="Settings" subtitle="Tenant configuration and local mock database controls.">
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <PermissionGuard resource={RESOURCE_KEYS.settingsManageApi} permission={PERMISSION_KEYS.update}>
            <AppButton startIcon={<SaveIcon />} loading={isSaving} onClick={() => void handleSave()}>
              Save settings
            </AppButton>
          </PermissionGuard>
          <PermissionGuard resource={RESOURCE_KEYS.settingsManageApi} permission={PERMISSION_KEYS.update}>
            <AppButton color="error" startIcon={<RestartAltIcon />} onClick={() => setResetOpen(true)}>
              Reset Mock Data
            </AppButton>
          </PermissionGuard>
        </Stack>
      </PageHeader>

      <Stack spacing={2}>
        <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Appearance
          </Typography>
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>Theme</InputLabel>
            <Select label="Theme" value={mode} onChange={handleThemeChange}>
              {THEME_OPTIONS.map((option) => (
                <MenuItem key={option.id} value={option.id}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Paper>

        <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Organization settings
          </Typography>
          <Stack spacing={2}>
            {settings.map((setting) => (
              <TextField
                key={setting.key}
                label={setting.key}
                value={setting.value}
                onChange={(event) => handleSettingChange(setting.key, event.target.value)}
                fullWidth
              />
            ))}
          </Stack>
        </Paper>
      </Stack>

      <ConfirmDialog
        open={resetOpen}
        title="Reset mock data"
        description="This clears local mock database changes and restores the original JSON seed data. You will be signed out."
        confirmLabel="Reset"
        loading={isSaving}
        onCancel={() => setResetOpen(false)}
        onConfirm={handleReset}
      />
    </>
  );
};
