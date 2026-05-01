import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { Button } from '@mui/material';
import reportsData from '@/mock/data/reports.json';
import { DataTable } from '@/shared/components/DataTable';
import { PageHeader } from '@/shared/components/PageHeader';
import { PermissionGuard } from '@/shared/components/guards/PermissionGuard';
import { ACTION_KEYS, RESOURCE_KEYS } from '@/shared/constants/permission.constants';
import { useAuthStore } from '@/features/auth/store/auth.store';

type Report = {
  id: string;
  orgId: string;
  name: string;
  category: string;
  updatedAt: string;
};

const reports = reportsData as Report[];

export const ReportsPage = () => {
  const orgId = useAuthStore((state) => state.session?.org.id);
  const tenantReports = reports.filter((report) => report.orgId === orgId);

  return (
    <>
      <PageHeader title="Reports" subtitle="Tenant analytics and export workflows.">
        <PermissionGuard resource={RESOURCE_KEYS.reports} action={ACTION_KEYS.export}>
          <Button startIcon={<FileDownloadIcon />}>Export reports</Button>
        </PermissionGuard>
      </PageHeader>
      <DataTable
        rows={tenantReports}
        getRowId={(report) => report.id}
        columns={[
          { id: 'name', label: 'Name', render: (report) => report.name },
          { id: 'category', label: 'Category', render: (report) => report.category },
          { id: 'updatedAt', label: 'Updated', render: (report) => report.updatedAt },
        ]}
      />
    </>
  );
};
