import { apiClient, unwrapApiData, type ApiEnvelope } from '@/shared/api/apiClient';

export type DashboardMetrics = {
  users: number;
  roles: number;
  tickets: number;
  reports: number;
};

export const dashboardService = {
  getMetrics: async (): Promise<DashboardMetrics> => {
    const [usersResponse, rolesResponse] = await Promise.all([
      apiClient.get<ApiEnvelope<unknown[]>>('/users'),
      apiClient.get<ApiEnvelope<unknown[]>>('/roles'),
    ]);

    return {
      users: unwrapApiData(usersResponse.data).length,
      roles: unwrapApiData(rolesResponse.data).length,
      tickets: 0,
      reports: 0,
    };
  },
};
