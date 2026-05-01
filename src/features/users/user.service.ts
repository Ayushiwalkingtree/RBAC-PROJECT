import { mockDbService } from '@/mock/services/mockDb.service';
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
      };

      return { ...database, users: [...database.users, createdUser] };
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

  assignUserRoles: async (userId: string, roleIds: string[]): Promise<UserRecord> => {
    let updatedUser: UserRecord | null = null;
    await mockDbService.updateDatabase((database) => ({
      ...database,
      users: database.users.map((user) => {
        if (user.id !== userId) {
          return user;
        }

        updatedUser = { ...user, roleIds };
        return updatedUser;
      }),
    }));

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
};
