import { mockDbService } from '@/mock/services/mockDb.service';
import { mergeRolePermissions } from '@/shared/utils/rbac';
import { navigationService } from '@/shared/services/navigation.service';
import type { UserRecord } from '@/shared/types/auth.types';
import type { NavigationItem } from '@/shared/types/navigation.types';
import type { EffectivePermissions, ResourceRecord } from '@/shared/types/rbac.types';

export type UserNavigationPreview = {
  user: UserRecord;
  permissions: EffectivePermissions;
  navigation: NavigationItem[];
  apiResources: ResourceRecord[];
};

export const navPreviewService = {
  listUsers: async (orgId: string): Promise<UserRecord[]> => {
    const database = await mockDbService.getDatabase();
    return database.users.filter((user) => user.orgId === orgId && !user.isDeleted);
  },

  getPreview: async (userId: string): Promise<UserNavigationPreview> => {
    const database = await mockDbService.getDatabase();
    const user = database.users.find((candidate) => candidate.id === userId && !candidate.isDeleted);
    if (!user) {
      throw new Error('User was not found.');
    }

    const roles = database.roles.filter((role) => user.roleIds.includes(role.id));
    const permissions = mergeRolePermissions(roles);
    const apiResources = database.resources.filter(
      (resource) => resource.resourceType === 'API' && permissions[resource.resourceKey]?.length,
    );

    return {
      user,
      permissions,
      navigation: navigationService.buildNavigation(database.resources, permissions, {
        orgCode: user.orgCode,
        roles: roles.map((role) => role.name),
      }),
      apiResources,
    };
  },
};
