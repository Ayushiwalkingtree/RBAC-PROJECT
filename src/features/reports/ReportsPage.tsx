import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { useEffect, useState } from 'react';
import { reportService } from '@/features/reports/report.service';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { AppButton } from '@/shared/components/AppButton';
import { DataTable } from '@/shared/components/DataTable';
import { EmptyState } from '@/shared/components/EmptyState';
import { PageHeader } from '@/shared/components/PageHeader';
import { useToast } from '@/shared/components/useToast';
import { RESOURCE_PERMISSION_RULES } from '@/shared/constants/permission.constants';
import { usePermission } from '@/shared/hooks/usePermission';
import type { Report } from '@/shared/types/domain.types';

const downloadCsv = (fileName: string, csv: string) => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};

export const ReportsPage = () => {
  const session = useAuthStore((state) => state.session);
  const { canAny } = usePermission();
  const { showToast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const canDownloadReports =
    canAny(RESOURCE_PERMISSION_RULES.reports.downloadDaily) ||
    canAny(RESOURCE_PERMISSION_RULES.reports.downloadMonthly);

  const loadReports = async () => {
    if (!session) {
      return;
    }

    setReports(await reportService.listReports(session.org.id));
  };

  useEffect(() => {
    void loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.org.id]);

  const handleExport = async () => {
    if (!session) {
      return;
    }

    setIsExporting(true);
    try {
      const result = await reportService.exportReportsCsv(session.org.id);
      downloadCsv(result.fileName, result.csv);
      showToast('Reports CSV generated.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to export reports.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <PageHeader title="Reports" subtitle="Tenant analytics and export workflows.">
        {canDownloadReports && (
          <AppButton startIcon={<FileDownloadIcon />} loading={isExporting} onClick={() => void handleExport()}>
            Export reports
          </AppButton>
        )}
      </PageHeader>

      {reports.length === 0 ? (
        <EmptyState title="No reports found" description="Report rows appear here when available." />
      ) : (
        <DataTable
          rows={reports}
          getRowId={(report) => report.id}
          columns={[
            { id: 'name', label: 'Name', render: (report) => report.name },
            { id: 'category', label: 'Category', render: (report) => report.category },
            { id: 'updatedAt', label: 'Updated', render: (report) => report.updatedAt },
          ]}
        />
      )}
    </>
  );
};
