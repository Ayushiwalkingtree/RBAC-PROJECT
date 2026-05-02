import { mockDbService } from '@/mock/services/mockDb.service';
import type { AuditLog } from '@/shared/types/domain.types';

export type AuditLogFilters = {
  orgId: string;
  isPlatform: boolean;
  action?: string;
  user?: string;
  resourceType?: string;
  date?: string;
};

export const auditService = {
  listAuditLogs: async (filters: AuditLogFilters): Promise<AuditLog[]> => {
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
