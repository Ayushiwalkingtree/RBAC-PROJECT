import type { EffectivePermissions } from '@/shared/types/rbac.types';

const escapeCsv = (value: string): string => `"${value.replaceAll('"', '""')}"`;

export type AccessibleReport = {
  id: string;
  resourceKey: string;
  name: string;
  category: string;
  description: string;
  canDownload: boolean;
};

export const reportService = {
  listAccessibleReports: async (permissions: EffectivePermissions): Promise<AccessibleReport[]> => {
    void permissions;
    return [];
  },

  exportReportCsv: async (report: AccessibleReport): Promise<{ fileName: string; csv: string }> => {
    const rows = [
      ['Report', 'Category', 'Description'],
      [report.name, report.category, report.description],
    ];
    const csv = rows.map((row) => row.map(escapeCsv).join(',')).join('\n');

    return {
      fileName: `${report.resourceKey.toLowerCase()}.csv`,
      csv,
    };
  },
};
