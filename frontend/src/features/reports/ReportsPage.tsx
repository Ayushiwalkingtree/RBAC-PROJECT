import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { Chip, Stack } from '@mui/material';
import { useEffect, useState } from 'react';
import { reportService, type AccessibleReport } from '@/features/reports/report.service';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { AppButton } from '@/shared/components/AppButton';
import { DataTable } from '@/shared/components/DataTable';
import { EmptyState } from '@/shared/components/EmptyState';
import { PageHeader } from '@/shared/components/PageHeader';
import { useToast } from '@/shared/components/useToast';

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
  const permissions = useAuthStore((state) => state.session?.permissions ?? {});
  const { showToast } = useToast();
  const [reports, setReports] = useState<AccessibleReport[]>([]);
  const [exportingReportId, setExportingReportId] = useState<string | null>(null);

  const loadReports = async () => {
    setReports(await reportService.listAccessibleReports(permissions));
  };

  useEffect(() => {
    void loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissions]);

  const handleExport = async (report: AccessibleReport) => {
    setExportingReportId(report.id);
    try {
      const result = await reportService.exportReportCsv(report);
      downloadCsv(result.fileName, result.csv);
      showToast(`${report.name} downloaded.`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to download report.', 'error');
    } finally {
      setExportingReportId(null);
    }
  };

  return (
    <>
      <PageHeader title="Reports" subtitle="Reports available for your role permissions." />

      {reports.length === 0 ? (
        <EmptyState title="You do not have access to reports" description="Ask an administrator to grant report view permissions." />
      ) : (
        <DataTable
          rows={reports}
          getRowId={(report) => report.id}
          columns={[
            { id: 'name', label: 'Report', render: (report) => report.name },
            { id: 'category', label: 'Module', render: (report) => report.category },
            { id: 'description', label: 'Description', render: (report) => report.description },
            {
              id: 'access',
              label: 'Access',
              render: (report) => (
                <Stack direction="row" spacing={1}>
                  <Chip size="small" color="primary" label="View" />
                  {report.canDownload && <Chip size="small" color="secondary" label="Download" />}
                </Stack>
              ),
            },
            {
              id: 'actions',
              label: 'Actions',
              render: (report) =>
                report.canDownload ? (
                  <AppButton
                    size="small"
                    startIcon={<FileDownloadIcon />}
                    loading={exportingReportId === report.id}
                    onClick={() => void handleExport(report)}
                  >
                    Download
                  </AppButton>
                ) : null,
            },
          ]}
        />
      )}
    </>
  );
};
