import { mockDbService } from '@/mock/services/mockDb.service';

export type DashboardMetrics = {
  users: number;
  roles: number;
  tickets: number;
  reports: number;
};

export const dashboardService = {
  getMetrics: async (orgId: string): Promise<DashboardMetrics> => {
    const database = await mockDbService.getDatabase();

    return {
      users: database.users.filter((user) => user.orgId === orgId && !user.isDeleted).length,
      roles: database.roles.filter((role) => role.orgId === orgId).length,
      tickets: database.tickets.filter((ticket) => ticket.orgId === orgId && !ticket.isDeleted).length,
      reports: database.reports.filter((report) => report.orgId === orgId).length,
    };
  },
};
