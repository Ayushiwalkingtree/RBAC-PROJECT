import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import { Button } from '@mui/material';
import settingsData from '@/mock/data/settings.json';
import { DataTable } from '@/shared/components/DataTable';
import { PageHeader } from '@/shared/components/PageHeader';
import { PermissionGuard } from '@/shared/components/guards/PermissionGuard';
import { ACTION_KEYS, RESOURCE_KEYS } from '@/shared/constants/permission.constants';
import { useAuthStore } from '@/features/auth/store/auth.store';

type TenantSetting = {
  orgId: string;
  key: string;
  value: string;
};

const settings = settingsData as TenantSetting[];

export const SettingsPage = () => {
  const orgId = useAuthStore((state) => state.session?.org.id);
  const tenantSettings = settings.filter((setting) => setting.orgId === orgId);

  return (
    <>
      <PageHeader title="Settings" subtitle="Tenant configuration protected by granular permissions.">
        <PermissionGuard resource={RESOURCE_KEYS.settings} action={ACTION_KEYS.manage}>
          <Button startIcon={<ManageAccountsIcon />}>Manage settings</Button>
        </PermissionGuard>
      </PageHeader>
      <DataTable
        rows={tenantSettings}
        getRowId={(setting) => setting.key}
        columns={[
          { id: 'key', label: 'Setting', render: (setting) => setting.key },
          { id: 'value', label: 'Value', render: (setting) => setting.value },
        ]}
      />
    </>
  );
};
