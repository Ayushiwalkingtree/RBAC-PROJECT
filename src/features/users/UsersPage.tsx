import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import ToggleOffIcon from '@mui/icons-material/ToggleOff';
import ToggleOnIcon from '@mui/icons-material/ToggleOn';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Chip,
  DialogActions,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { roleService } from '@/features/roles/role.service';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { userSchema, type UserFormValues } from '@/features/users/user.schema';
import { userService } from '@/features/users/user.service';
import { AppButton } from '@/shared/components/AppButton';
import { AppDialog } from '@/shared/components/AppDialog';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { DataTable } from '@/shared/components/DataTable';
import { EmptyState } from '@/shared/components/EmptyState';
import { PageHeader } from '@/shared/components/PageHeader';
import { RoleSelect } from '@/shared/components/RoleSelect';
import { useToast } from '@/shared/components/useToast';
import { RESOURCE_PERMISSION_RULES } from '@/shared/constants/permission.constants';
import { usePermission } from '@/shared/hooks/usePermission';
import type { UserRecord } from '@/shared/types/auth.types';
import type { Role } from '@/shared/types/rbac.types';

const emptyUserValues: UserFormValues = {
  full_name: '',
  email: '',
  password: '',
  department: '',
  role_ids: [],
  is_active: true,
};

export const UsersPage = () => {
  const session = useAuthStore((state) => state.session);
  const refreshSession = useAuthStore((state) => state.refreshSession);
  const { canAny } = usePermission();
  const { showToast } = useToast();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [roleAssignmentUser, setRoleAssignmentUser] = useState<UserRecord | null>(null);
  const [roleAssignmentDraft, setRoleAssignmentDraft] = useState<string[]>([]);
  const [deleteUser, setDeleteUser] = useState<UserRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { control, handleSubmit, reset } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: emptyUserValues,
  });

  const roleNameById = useMemo(
    () => new Map(roles.map((role) => [role.id, role.name])),
    [roles],
  );
  const canCreateUser = canAny(RESOURCE_PERMISSION_RULES.users.create);
  const canUpdateUser = canAny(RESOURCE_PERMISSION_RULES.users.update);
  const canDeleteUser = canAny(RESOURCE_PERMISSION_RULES.users.delete);

  const loadData = async () => {
    if (!session) {
      return;
    }

    const [nextUsers, nextRoles] = await Promise.all([
      userService.listUsers(session.org.id),
      roleService.listRoles(session.org.id),
    ]);
    setUsers(nextUsers);
    setRoles(nextRoles);
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.org.id]);

  const openCreateDialog = () => {
    setEditingUser(null);
    setCreateDialogOpen(true);
    reset(emptyUserValues);
  };

  const openEditDialog = (user: UserRecord) => {
    setEditingUser(user);
    reset({
      full_name: user.name,
      email: user.email,
      password: '',
      department: user.department,
      role_ids: user.roleIds,
      is_active: user.status === 'active',
    });
  };

  const closeFormDialog = () => {
    setEditingUser(null);
    setCreateDialogOpen(false);
    reset(emptyUserValues);
  };

  const onSubmit = handleSubmit(async (values) => {
    if (!session) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingUser) {
        await userService.updateUser({ ...values, id: editingUser.id });
        showToast('User updated.');
      } else {
        if (!values.password) {
          throw new Error('Password is required for new users.');
        }
        await userService.createUser({
          ...values,
          orgId: session.org.id,
          orgCode: session.org.code,
          password: values.password,
          actorUserId: session.user.id,
          actorEmail: session.user.email,
        });
        showToast('User created.');
      }

      await loadData();
      await refreshSession();
      closeFormDialog();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'User action failed.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  });

  const openAssignRolesDialog = (user: UserRecord) => {
    setRoleAssignmentUser(user);
    setRoleAssignmentDraft(user.roleIds);
  };

  const handleAssignRoles = async () => {
    if (!roleAssignmentUser) {
      return;
    }

    setIsSubmitting(true);
    try {
      await userService.assignUserRoles(roleAssignmentUser.id, roleAssignmentDraft, {
        userId: session?.user.id,
        email: session?.user.email,
      });
      await loadData();
      await refreshSession();
      showToast('Roles assigned.');
      setRoleAssignmentUser(null);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to assign roles.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (user: UserRecord) => {
    try {
      await userService.setUserActive(user.id, user.status !== 'active');
      await loadData();
      await refreshSession();
      showToast(user.status === 'active' ? 'User deactivated.' : 'User activated.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to update user status.', 'error');
    }
  };

  const handleVerifyEmail = async (user: UserRecord) => {
    try {
      await userService.verifyUserEmail(user.id);
      await loadData();
      await refreshSession();
      showToast('Email verified.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to verify email.', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteUser) {
      return;
    }

    setIsSubmitting(true);
    try {
      await userService.deleteUser(deleteUser.id);
      await loadData();
      await refreshSession();
      showToast('User deleted.');
      setDeleteUser(null);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to delete user.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formDialogOpen = createDialogOpen || editingUser !== null;

  return (
    <>
      <PageHeader title="Users" subtitle="Create users, assign roles, and manage tenant access.">
        {canCreateUser && (
          <AppButton startIcon={<AddIcon />} onClick={openCreateDialog}>
            Create user
          </AppButton>
        )}
      </PageHeader>

      {users.length === 0 ? (
        <EmptyState title="No users found" description="Create a tenant user to get started." />
      ) : (
        <DataTable
          rows={users}
          getRowId={(user) => user.id}
          columns={[
            { id: 'name', label: 'Name', render: (user) => user.name },
            { id: 'email', label: 'Email', render: (user) => user.email },
            { id: 'department', label: 'Department', render: (user) => user.department },
            {
              id: 'roles',
              label: 'Roles',
              render: (user) => (
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  {user.roleIds.map((roleId) => (
                    <Chip key={roleId} label={roleNameById.get(roleId) ?? roleId} size="small" />
                  ))}
                </Stack>
              ),
            },
            { id: 'status', label: 'Status', render: (user) => user.status },
            {
              id: 'emailVerified',
              label: 'Email',
              render: (user) => (
                <Chip
                  label={user.isEmailVerified ? 'Verified' : 'Unverified'}
                  size="small"
                  color={user.isEmailVerified ? 'success' : 'warning'}
                />
              ),
            },
            {
              id: 'actions',
              label: 'Actions',
              render: (user) => (
                <Stack direction="row" spacing={0.5}>
                  {canUpdateUser && (
                    <>
                    <Tooltip title="Edit user">
                      <IconButton size="small" aria-label="Edit user" onClick={() => openEditDialog(user)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    </>
                  )}
                  {canUpdateUser && (
                    <>
                    <Tooltip title="Assign roles">
                      <IconButton
                        size="small"
                        aria-label="Assign roles"
                        onClick={() => openAssignRolesDialog(user)}
                      >
                        <GroupAddIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    </>
                  )}
                  {canUpdateUser && (
                    <>
                    {!user.isEmailVerified && (
                      <Tooltip title="Mock verify email">
                        <IconButton
                          size="small"
                          aria-label="Verify email"
                          onClick={() => void handleVerifyEmail(user)}
                        >
                          <MarkEmailReadIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title={user.status === 'active' ? 'Deactivate user' : 'Activate user'}>
                      <IconButton
                        size="small"
                        aria-label="Toggle active user"
                        onClick={() => void handleToggleActive(user)}
                      >
                        {user.status === 'active' ? (
                          <ToggleOnIcon fontSize="small" color="success" />
                        ) : (
                          <ToggleOffIcon fontSize="small" />
                        )}
                      </IconButton>
                    </Tooltip>
                    </>
                  )}
                  {canDeleteUser && (
                    <Tooltip title="Delete user">
                      <IconButton
                        size="small"
                        aria-label="Delete user"
                        color="error"
                        onClick={() => setDeleteUser(user)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
              ),
            },
          ]}
        />
      )}

      <AppDialog
        open={formDialogOpen}
        title={editingUser ? 'Edit user' : 'Create user'}
        helperText="Users are unique by email within a single organization."
        onClose={closeFormDialog}
      >
        <Stack component="form" spacing={2.5} onSubmit={onSubmit}>
          <Controller
            name="full_name"
            control={control}
            render={({ field, fieldState }) => (
              <TextField {...field} label="Full name" error={Boolean(fieldState.error)} helperText={fieldState.error?.message} fullWidth />
            )}
          />
          <Controller
            name="email"
            control={control}
            render={({ field, fieldState }) => (
              <TextField {...field} label="Email" error={Boolean(fieldState.error)} helperText={fieldState.error?.message} fullWidth />
            )}
          />
          <Controller
            name="password"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                type="password"
                label={editingUser ? 'New password' : 'Password'}
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message ?? (editingUser ? 'Leave blank to keep current password.' : undefined)}
                fullWidth
              />
            )}
          />
          <Controller
            name="department"
            control={control}
            render={({ field, fieldState }) => (
              <TextField {...field} label="Department" error={Boolean(fieldState.error)} helperText={fieldState.error?.message} fullWidth />
            )}
          />
          <Controller
            name="role_ids"
            control={control}
            render={({ field, fieldState }) => (
              <Stack spacing={0.5}>
                <RoleSelect roles={roles} value={field.value} onChange={field.onChange} />
                {fieldState.error?.message && (
                  <Chip color="error" size="small" label={fieldState.error.message} />
                )}
              </Stack>
            )}
          />
          <Controller
            name="is_active"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={<Switch checked={field.value} onChange={(_, checked) => field.onChange(checked)} />}
                label="Active"
              />
            )}
          />
          <DialogActions sx={{ px: 0 }}>
            <AppButton variant="outlined" color="inherit" onClick={closeFormDialog}>
              Cancel
            </AppButton>
            <AppButton type="submit" loading={isSubmitting}>
              {editingUser ? 'Save user' : 'Create user'}
            </AppButton>
          </DialogActions>
        </Stack>
      </AppDialog>

      <AppDialog
        open={Boolean(roleAssignmentUser)}
        title="Assign roles"
        helperText="Role changes refresh affected permissions immediately."
        onClose={() => setRoleAssignmentUser(null)}
      >
        <Stack spacing={2}>
          <RoleSelect
            roles={roles}
            value={roleAssignmentDraft}
            onChange={setRoleAssignmentDraft}
          />
          <Stack spacing={1}>
            <Typography variant="subtitle2">Effective permissions</Typography>
            {roles
              .filter((role) => roleAssignmentDraft.includes(role.id))
              .map((role) => (
                <Typography key={role.id} variant="caption" color="text.secondary">
                  {role.code}: {Object.entries(role.permissions).map(([resource, permissions]) => `${resource} [${permissions.join(', ')}]`).join('; ') || 'No grants'}
                </Typography>
              ))}
          </Stack>
          <DialogActions sx={{ px: 0 }}>
            <AppButton variant="outlined" color="inherit" onClick={() => setRoleAssignmentUser(null)}>
              Cancel
            </AppButton>
            <AppButton loading={isSubmitting} onClick={() => void handleAssignRoles()}>
              Save roles
            </AppButton>
          </DialogActions>
        </Stack>
      </AppDialog>

      <ConfirmDialog
        open={Boolean(deleteUser)}
        title="Delete user"
        description={`Soft delete ${deleteUser?.name ?? 'this user'}? They will no longer be able to sign in.`}
        confirmLabel="Delete"
        loading={isSubmitting}
        onCancel={() => setDeleteUser(null)}
        onConfirm={handleDelete}
      />
    </>
  );
};
