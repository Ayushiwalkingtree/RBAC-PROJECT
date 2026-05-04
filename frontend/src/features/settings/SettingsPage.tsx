import SaveIcon from '@mui/icons-material/Save';
import {
  Alert,
  FormControl,
  Grid,
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
import { PageHeader } from '@/shared/components/PageHeader';
import { useToast } from '@/shared/components/useToast';
import { PermissionGuard } from '@/shared/components/guards/PermissionGuard';
import { PERMISSION_KEYS, RESOURCE_KEYS } from '@/shared/constants/permission.constants';
import { THEME_OPTIONS } from '@/shared/theme/theme.constants';
import { useThemeStore } from '@/shared/theme/theme.store';
import type { RefreshTokenRecord, TenantSetting } from '@/shared/types/domain.types';
import type { Organization } from '@/shared/types/auth.types';
import type { ThemeMode } from '@/shared/types/theme.types';

export const SettingsPage = () => {
  const session = useAuthStore((state) => state.session);
  const refreshSession = useAuthStore((state) => state.refreshSession);
  const mode = useThemeStore((state) => state.mode);
  const setMode = useThemeStore((state) => state.setMode);
  const { showToast } = useToast();
  const [settings, setSettings] = useState<TenantSetting[]>([]);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [sessions, setSessions] = useState<RefreshTokenRecord[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const loadSettings = async () => {
    if (!session) {
      return;
    }

    const [nextSettings, nextOrg, nextSessions] = await Promise.all([
      organizationService.listOrganizationSettings(session.org.id),
      organizationService.getOrganization(session.org.id),
      organizationService.listActiveSessions(session.org.id, session.user.id),
    ]);
    setSettings(nextSettings);
    setOrganization(nextOrg);
    setSessions(nextSessions);
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
    if (!session || !organization) {
      return;
    }

    setIsSaving(true);
    try {
      const savedOrg = await organizationService.updateOrganization(session.org.id, {
        name: organization.name,
        timezone: organization.timezone,
        logoUrl: organization.logoUrl,
        supportEmail: organization.supportEmail,
        allowedOrigins: organization.allowedOrigins ?? [],
        actorUserId: session.user.id,
        actorEmail: session.user.email,
      });
      const savedSettings = await organizationService.updateOrganizationSettings(session.org.id, settings);
      setOrganization(savedOrg);
      setSettings(savedSettings);
      await refreshSession();
      showToast('Settings saved.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to save settings.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleThemeChange = (event: SelectChangeEvent) => {
    setMode(event.target.value as ThemeMode);
  };

  const handleOrgChange = (key: keyof Organization, value: string) => {
    setOrganization((current) => (current ? { ...current, [key]: value } : current));
  };

  const handleAllowedOriginsChange = (value: string) => {
    setOrganization((current) =>
      current ? { ...current, allowedOrigins: value.split('\n').map((origin) => origin.trim()).filter(Boolean) } : current,
    );
  };

  return (
    <>
      <PageHeader title="Settings" subtitle="Tenant configuration.">
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <PermissionGuard resource={RESOURCE_KEYS.settingsManageApi} permission={PERMISSION_KEYS.update}>
            <AppButton startIcon={<SaveIcon />} loading={isSaving} onClick={() => void handleSave()}>
              Save settings
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
          {organization && (
            <Stack spacing={2}>
              <Alert severity="info">Organization code {organization.code} is permanent and cannot be edited.</Alert>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField label="Organization code" value={organization.code} disabled fullWidth />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField label="Organization name" value={organization.name} onChange={(event) => handleOrgChange('name', event.target.value)} fullWidth />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField label="Timezone" value={organization.timezone ?? ''} onChange={(event) => handleOrgChange('timezone', event.target.value)} fullWidth />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField label="Support email" value={organization.supportEmail ?? ''} onChange={(event) => handleOrgChange('supportEmail', event.target.value)} fullWidth />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField label="Logo URL" value={organization.logoUrl ?? ''} onChange={(event) => handleOrgChange('logoUrl', event.target.value)} fullWidth />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Allowed origins"
                    value={(organization.allowedOrigins ?? []).join('\n')}
                    onChange={(event) => handleAllowedOriginsChange(event.target.value)}
                    helperText="One origin per line."
                    fullWidth
                    multiline
                    minRows={3}
                  />
                </Grid>
              </Grid>
              {settings.length > 0 && (
                <Stack spacing={2}>
                  <Typography variant="subtitle2" fontWeight={900}>Additional settings</Typography>
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
              )}
            </Stack>
          )}
        </Paper>

        <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Sessions
          </Typography>
          <Stack spacing={1}>
            {sessions.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No active refresh sessions.</Typography>
            ) : (
              sessions.map((sessionRecord) => (
                <Paper key={sessionRecord.id} elevation={0} sx={{ border: 1, borderColor: 'divider', p: 1.5 }}>
                  <Typography variant="body2" fontWeight={800}>{sessionRecord.userAgent ?? 'Browser session'}</Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Created {new Date(sessionRecord.createdAt).toLocaleString()} · Expires {new Date(sessionRecord.expiresAt).toLocaleString()}
                  </Typography>
                </Paper>
              ))
            )}
          </Stack>
        </Paper>
      </Stack>
    </>
  );
};
