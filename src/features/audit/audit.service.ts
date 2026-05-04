import { mockDbService } from '@/mock/services/mockDb.service';
import { apiClient, unwrapApiData, useMocks, type ApiEnvelope } from '@/shared/api/apiClient';
import type { AuditLog } from '@/shared/types/domain.types';

export type AuditLogFilters = {
  orgId: string;
  isPlatform: boolean;
  action?: string;
  user?: string;
  userId?: string;
  resourceType?: string;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
};

type BackendAuditLog = {
  id: number;
  at_organization_id: number;
  at_user_id?: number | null;
  action: string;
  actor_user_id?: number | null;
  target_user_id?: number | null;
  resource_type: string;
  resource_id?: string | null;
  resource_key?: string | null;
  message?: string | null;
  details_json?: Record<string, unknown> | null;
  old_value_json?: Record<string, unknown> | null;
  new_value_json?: Record<string, unknown> | null;
  ip_address?: string | null;
  user_agent?: string | null;
  correlation_id?: string | null;
  created_at: string;
};

const mapBackendAuditLog = (log: BackendAuditLog): AuditLog => ({
  id: String(log.id),
  orgId: String(log.at_organization_id),
  action: log.action,
  actorUserId: log.actor_user_id ? String(log.actor_user_id) : undefined,
  targetUserId: log.target_user_id ? String(log.target_user_id) : undefined,
  resourceType: log.resource_type,
  resourceId: log.resource_id ?? undefined,
  resourceKey: log.resource_key ?? undefined,
  message: log.message ?? `${log.action} on ${log.resource_type}`,
  metadata: {
    ...(log.details_json ?? {}),
    ...(log.old_value_json ? { oldValue: log.old_value_json } : {}),
    ...(log.new_value_json ? { newValue: log.new_value_json } : {}),
    ...(log.ip_address ? { ipAddress: log.ip_address } : {}),
    ...(log.user_agent ? { userAgent: log.user_agent } : {}),
    ...(log.correlation_id ? { correlationId: log.correlation_id } : {}),
  },
  createdAt: log.created_at,
});

export const auditService = {
  listAuditLogs: async (filters: AuditLogFilters): Promise<AuditLog[]> => {
    if (!useMocks) {
      const params = {
        action: filters.action || undefined,
        resource_type: filters.resourceType || undefined,
        user_id: filters.userId || (/^\d+$/u.test(filters.user ?? '') ? filters.user : undefined),
        date_from: filters.dateFrom || filters.date || undefined,
        date_to: filters.dateTo || filters.date || undefined,
      };
      const response = await apiClient.get<ApiEnvelope<BackendAuditLog[]>>('/audit-logs', { params });
      return unwrapApiData(response.data).map(mapBackendAuditLog);
    }

    const database = await mockDbService.getDatabase();
    const usersById = new Map(database.users.map((user) => [user.id, user]));

    return database.auditLogs
      .filter((log) => filters.isPlatform || log.orgId === filters.orgId)
      .filter((log) => !filters.action || log.action === filters.action)
      .filter((log) => !filters.resourceType || log.resourceType === filters.resourceType)
      .filter((log) => !filters.date || log.createdAt.slice(0, 10) === filters.date)
      .filter((log) => {
        if (!filters.user) return true;
        const userText = [
          log.actorEmail,
          log.actorUserId,
          log.targetUserId,
          usersById.get(log.actorUserId ?? '')?.name,
          usersById.get(log.targetUserId ?? '')?.name,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return userText.includes(filters.user.toLowerCase());
      })
      .sort((current, next) => next.createdAt.localeCompare(current.createdAt));
  },
};
