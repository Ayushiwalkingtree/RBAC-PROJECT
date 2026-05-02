import { appendAuditLog, mockDbService } from '@/mock/services/mockDb.service';
import { validatePasswordPolicy } from '@/features/auth/services/auth.service';
import { createId } from '@/shared/utils/id';
import type { UserRecord } from '@/shared/types/auth.types';

const normalize = (value: string): string => value.trim().toLowerCase();

export type CreateUserInput = {
  orgId: string;
  orgCode: string;
  full_name: string;
  email: string;
  password: string;
  department: string;
  role_ids: string[];
  is_active: boolean;
  actorUserId?: string;
  actorEmail?: string;
};

export type UpdateUserInput = Omit<CreateUserInput, 'orgId' | 'orgCode' | 'password'> & {
  id: string;
  password?: string;
};

export const userService = {
  listUsers: async (orgId: string): Promise<UserRecord[]> => {
    const database = await mockDbService.getDatabase();
    return database.users.filter((user) => user.orgId === orgId && !user.isDeleted);
  },

  createUser: async (input: CreateUserInput): Promise<UserRecord> => {
    validatePasswordPolicy(input.password);
    let createdUser: UserRecord | null = null;
    await mockDbService.updateDatabase((database) => {
      const duplicate = database.users.some(
        (user) =>
          user.orgId === input.orgId &&
          !user.isDeleted &&
          normalize(user.email) === normalize(input.email),
      );

      if (duplicate) {
        throw new Error('Email already exists in this organization.');
      }

      const invalidRole = input.role_ids.find(
        (roleId) => !database.roles.some((role) => role.id === roleId && role.orgId === input.orgId),
      );
      if (invalidRole) {
        throw new Error(`Role ${invalidRole} does not belong to this organization.`);
      }

      createdUser = {
        id: createId('usr'),
        orgId: input.orgId,
        orgCode: input.orgCode,
        email: input.email.trim(),
        password: input.password,
        name: input.full_name.trim(),
        title: input.department.trim(),
        department: input.department.trim(),
        status: input.is_active ? 'active' : 'disabled',
        roleIds: input.role_ids,
        isDeleted: false,
        isEmailVerified: false,
        failedAttempts: 0,
        lockedUntil: null,
        createdAt: new Date().toISOString(),
      };

      const verificationToken = `${input.orgCode.toLowerCase()}-${createId('verify')}`;
      const nextDatabase = {
        ...database,
        users: [...database.users, createdUser],
        verificationTokens: [
          ...database.verificationTokens,
          {
            id: createId('vt'),
            orgId: input.orgId,
            userId: createdUser.id,
            email: createdUser.email,
            token: verificationToken,
            createdAt: new Date().toISOString(),
          },
        ],
      };

      return appendAuditLog(nextDatabase, {
        orgId: input.orgId,
        action: 'USER_CREATED',
        actorUserId: input.actorUserId,
        actorEmail: input.actorEmail,
        targetUserId: createdUser.id,
        resourceType: 'USER',
        resourceId: createdUser.id,
        message: `${createdUser.email} was created.`,
      });
    });

    if (!createdUser) {
      throw new Error('Unable to create user.');
    }

    return createdUser;
  },

  updateUser: async (input: UpdateUserInput): Promise<UserRecord> => {
    let updatedUser: UserRecord | null = null;
    await mockDbService.updateDatabase((database) => {
      const duplicate = database.users.some(
        (user) =>
          user.id !== input.id &&
          user.orgId === database.users.find((candidate) => candidate.id === input.id)?.orgId &&
          !user.isDeleted &&
          normalize(user.email) === normalize(input.email),
      );

      if (duplicate) {
        throw new Error('Email already exists in this organization.');
      }

      const existingUser = database.users.find((candidate) => candidate.id === input.id);
      if (!existingUser) {
        throw new Error('User was not found.');
      }

      if (input.password?.trim()) {
        validatePasswordPolicy(input.password);
      }

      const invalidRole = input.role_ids.find(
        (roleId) => !database.roles.some((role) => role.id === roleId && role.orgId === existingUser.orgId),
      );
      if (invalidRole) {
        throw new Error(`Role ${invalidRole} does not belong to this organization.`);
      }

      return {
        ...database,
        users: database.users.map((user) => {
          if (user.id !== input.id) {
            return user;
          }

          updatedUser = {
            ...user,
            email: input.email.trim(),
            password: input.password?.trim() ? input.password : user.password,
            name: input.full_name.trim(),
            title: input.department.trim(),
            department: input.department.trim(),
            roleIds: input.role_ids,
            status: input.is_active ? 'active' : 'disabled',
          };

          return updatedUser;
        }),
      };
    });

    if (!updatedUser) {
      throw new Error('User was not found.');
    }

    return updatedUser;
  },

  assignUserRoles: async (
    userId: string,
    roleIds: string[],
    actor?: { userId?: string; email?: string },
  ): Promise<UserRecord> => {
    if (roleIds.length === 0) {
      throw new Error('A user must keep at least one role.');
    }

    let updatedUser: UserRecord | null = null;
    await mockDbService.updateDatabase((database) => {
      const user = database.users.find((candidate) => candidate.id === userId && !candidate.isDeleted);
      if (!user) {
        throw new Error('User was not found.');
      }

      const invalidRole = roleIds.find(
        (roleId) => !database.roles.some((role) => role.id === roleId && role.orgId === user.orgId),
      );
      if (invalidRole) {
        throw new Error(`Role ${invalidRole} does not belong to this organization.`);
      }

      const previousRoles = new Set(user.roleIds);
      const nextRoles = new Set(roleIds);
      let nextDatabase = {
        ...database,
        users: database.users.map((candidate) => {
        if (candidate.id !== userId) {
          return candidate;
        }

        updatedUser = { ...candidate, roleIds };
        return updatedUser;
      }),
      };

      roleIds
        .filter((roleId) => !previousRoles.has(roleId))
        .forEach((roleId) => {
          nextDatabase = appendAuditLog(nextDatabase, {
            orgId: user.orgId,
            action: 'ROLE_ASSIGNED',
            actorUserId: actor?.userId,
            actorEmail: actor?.email,
            targetUserId: user.id,
            resourceType: 'USER_ROLE',
            resourceId: roleId,
            message: `Role ${roleId} assigned to ${user.email}.`,
          });
        });
      user.roleIds
        .filter((roleId) => !nextRoles.has(roleId))
        .forEach((roleId) => {
          nextDatabase = appendAuditLog(nextDatabase, {
            orgId: user.orgId,
            action: 'ROLE_REMOVED',
            actorUserId: actor?.userId,
            actorEmail: actor?.email,
            targetUserId: user.id,
            resourceType: 'USER_ROLE',
            resourceId: roleId,
            message: `Role ${roleId} removed from ${user.email}.`,
          });
        });

      return nextDatabase;
    });

    if (!updatedUser) {
      throw new Error('User was not found.');
    }

    return updatedUser;
  },

  setUserActive: async (userId: string, isActive: boolean): Promise<UserRecord> => {
    let updatedUser: UserRecord | null = null;
    await mockDbService.updateDatabase((database) => ({
      ...database,
      users: database.users.map((user) => {
        if (user.id !== userId) {
          return user;
        }

        updatedUser = { ...user, status: isActive ? 'active' : 'disabled' };
        return updatedUser;
      }),
    }));

    if (!updatedUser) {
      throw new Error('User was not found.');
    }

    return updatedUser;
  },

  deleteUser: async (userId: string): Promise<void> => {
    await mockDbService.updateDatabase((database) => ({
      ...database,
      users: database.users.map((user) =>
        user.id === userId ? { ...user, isDeleted: true, status: 'disabled' } : user,
      ),
    }));
  },

  verifyUserEmail: async (userId: string): Promise<UserRecord> => {
    let updatedUser: UserRecord | null = null;
    await mockDbService.updateDatabase((database) => {
      const user = database.users.find((candidate) => candidate.id === userId && !candidate.isDeleted);
      if (!user) {
        throw new Error('User was not found.');
      }

      updatedUser = { ...user, isEmailVerified: true };
      return appendAuditLog(
        {
          ...database,
          users: database.users.map((candidate) => (candidate.id === userId ? updatedUser as UserRecord : candidate)),
          verificationTokens: database.verificationTokens.map((token) =>
            token.userId === userId ? { ...token, verifiedAt: token.verifiedAt ?? new Date().toISOString() } : token,
          ),
        },
        {
          orgId: user.orgId,
          action: 'EMAIL_VERIFIED',
          actorUserId: userId,
          actorEmail: user.email,
          targetUserId: userId,
          resourceType: 'USER',
          resourceId: userId,
          message: `${user.email} verified email.`,
        },
      );
    });

    if (!updatedUser) {
      throw new Error('Unable to verify user.');
    }

    return updatedUser;
  },
};
