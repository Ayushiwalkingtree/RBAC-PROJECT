import { mockDbService } from '@/mock/services/mockDb.service';
import type { Report } from '@/shared/types/domain.types';

const escapeCsv = (value: string): string => `"${value.replaceAll('"', '""')}"`;

export const reportService = {
  listReports: async (orgId: string): Promise<Report[]> => {
    const database = await mockDbService.getDatabase();
    return database.reports.filter((report) => report.orgId === orgId);
  },

  exportReportsCsv: async (orgId: string): Promise<{ fileName: string; csv: string }> => {
    const reports = await reportService.listReports(orgId);
    const rows = [
      ['Name', 'Category', 'Updated At'],
      ...reports.map((report) => [report.name, report.category, report.updatedAt]),
    ];
    const csv = rows.map((row) => row.map(escapeCsv).join(',')).join('\n');

    return {
      fileName: `reports-${orgId}.csv`,
      csv,
    };
  },
};
