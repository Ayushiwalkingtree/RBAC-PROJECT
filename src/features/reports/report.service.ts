import { mockDbService } from '@/mock/services/mockDb.service';
import { PERMISSION_KEYS } from '@/shared/constants/permission.constants';
import { canAccess } from '@/shared/utils/rbac';
import { buildReportRows, toBusinessResourceName } from '@/shared/utils/rbacDisplay.adapter';
import type { EffectivePermissions, ResourceRecord } from '@/shared/types/rbac.types';

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
    const database = await mockDbService.getDatabase();
    return buildReportRows(database.resources)
      .filter((resource) => canAccess(permissions, resource.resourceKey, PERMISSION_KEYS.view))
      .map((resource: ResourceRecord) => ({
        id: resource.id,
        resourceKey: resource.resourceKey,
        name: toBusinessResourceName(resource),
        category: resource.displayCategory ?? resource.resourceGroup,
        description: resource.description,
        canDownload: canAccess(permissions, resource.resourceKey, PERMISSION_KEYS.download),
      }));
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
