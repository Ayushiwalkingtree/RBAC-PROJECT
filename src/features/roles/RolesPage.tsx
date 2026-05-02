import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { zodResolver } from '@hookform/resolvers/zod';
import { Chip, DialogActions, IconButton, Stack, TextField, Tooltip } from '@mui/material';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { roleSchema, type RoleFormValues } from '@/features/roles/role.schema';
import { roleService } from '@/features/roles/role.service';
import { AppButton } from '@/shared/components/AppButton';
import { AppDialog } from '@/shared/components/AppDialog';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { DataTable } from '@/shared/components/DataTable';
import { EmptyState } from '@/shared/components/EmptyState';
import { PageHeader } from '@/shared/components/PageHeader';
import { useToast } from '@/shared/components/useToast';
import { PermissionGuard } from '@/shared/components/guards/PermissionGuard';
import { PERMISSION_KEYS, RESOURCE_KEYS } from '@/shared/constants/permission.constants';
import type { Role } from '@/shared/types/rbac.types';

const emptyRoleValues: RoleFormValues = {
  role_code: '',
  role_name: '',
  description: '',
};

export const RolesPage = () => {
  const session = useAuthStore((state) => state.session);
  const refreshSession = useAuthStore((state) => state.refreshSession);
  const { showToast } = useToast();
  const [roles, setRoles] = useState<Role[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { control, handleSubmit, reset } = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: emptyRoleValues,
  });

  const loadRoles = async () => {
    if (!session) {
      return;
    }

    setRoles(await roleService.listRoles(session.org.id));
  };

  useEffect(() => {
    void loadRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.org.id]);

  const closeDialog = () => {
    setCreateDialogOpen(false);
    setEditingRole(null);
    reset(emptyRoleValues);
  };

  const openEditDialog = (role: Role) => {
    setEditingRole(role);
    reset({
      role_code: role.code,
      role_name: role.name,
      description: role.description,
    });
  };

  const onSubmit = handleSubmit(async (values) => {
    if (!session) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingRole) {
        await roleService.updateRole(editingRole.id, {
          ...values,
          orgId: session.org.id,
          actorUserId: session.user.id,
          actorEmail: session.user.email,
        });
        showToast('Role updated.');
      } else {
        await roleService.createRole({
          ...values,
          orgId: session.org.id,
          actorUserId: session.user.id,
          actorEmail: session.user.email,
        });
        showToast('Role created.');
      }

      await loadRoles();
      await refreshSession();
      closeDialog();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Role action failed.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  });

  const handleDeleteRole = async () => {
    if (!deletingRole) {
      return;
    }

    setIsSubmitting(true);
    try {
      await roleService.deleteRole(deletingRole.id);
      await loadRoles();
      await refreshSession();
      showToast('Role deleted.');
      setDeletingRole(null);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to delete role.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader title="Roles" subtitle="Create role bundles; enforcement still uses permissions only.">
        <PermissionGuard resource={RESOURCE_KEYS.roleManageApi} permission={PERMISSION_KEYS.create}>
          <AppButton startIcon={<AddIcon />} onClick={() => setCreateDialogOpen(true)}>
            Create role
          </AppButton>
        </PermissionGuard>
      </PageHeader>

      {roles.length === 0 ? (
        <EmptyState title="No roles found" description="Create a role, then grant permissions in the matrix." />
      ) : (
        <DataTable
          rows={roles}
          getRowId={(role) => role.id}
          columns={[
            { id: 'code', label: 'Code', render: (role) => role.code },
            { id: 'name', label: 'Name', render: (role) => role.name },
            { id: 'description', label: 'Description', render: (role) => role.description },
            {
              id: 'system',
              label: 'Type',
              render: (role) => <Chip label={role.isSystem ? 'System' : 'Custom'} size="small" />,
            },
            {
              id: 'permissions',
              label: 'Permissions',
              render: (role) => (
                <Chip
                  label={Object.values(role.permissions).reduce((total, grants) => total + grants.length, 0)}
                  size="small"
                />
              ),
            },
            {
              id: 'actions',
              label: 'Actions',
              render: (role) => (
                <Stack direction="row" spacing={0.5}>
                  <PermissionGuard resource={RESOURCE_KEYS.roleManageApi} permission={PERMISSION_KEYS.update}>
                    <Tooltip title="Edit role">
                      <IconButton size="small" aria-label="Edit role" onClick={() => openEditDialog(role)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </PermissionGuard>
                  <PermissionGuard resource={RESOURCE_KEYS.roleManageApi} permission={PERMISSION_KEYS.delete}>
                    <Tooltip title={role.isSystem ? 'System roles cannot be deleted' : 'Delete role'}>
                      <span>
                        <IconButton
                          size="small"
                          aria-label="Delete role"
                          color="error"
                          disabled={role.isSystem}
                          onClick={() => setDeletingRole(role)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </PermissionGuard>
                </Stack>
              ),
            },
          ]}
        />
      )}

      <AppDialog
        open={createDialogOpen || editingRole !== null}
        title={editingRole ? 'Edit role' : 'Create role'}
        helperText="Role codes are unique inside the current organization."
        onClose={closeDialog}
      >
        <Stack component="form" spacing={2.5} onSubmit={onSubmit}>
          <Controller
            name="role_code"
            control={control}
            render={({ field, fieldState }) => (
              <TextField {...field} label="Role code" error={Boolean(fieldState.error)} helperText={fieldState.error?.message} fullWidth />
            )}
          />
          <Controller
            name="role_name"
            control={control}
            render={({ field, fieldState }) => (
              <TextField {...field} label="Role name" error={Boolean(fieldState.error)} helperText={fieldState.error?.message} fullWidth />
            )}
          />
          <Controller
            name="description"
            control={control}
            render={({ field, fieldState }) => (
              <TextField {...field} label="Description" error={Boolean(fieldState.error)} helperText={fieldState.error?.message} fullWidth multiline minRows={3} />
            )}
          />
          <DialogActions sx={{ px: 0 }}>
            <AppButton variant="outlined" color="inherit" onClick={closeDialog}>
              Cancel
            </AppButton>
            <AppButton type="submit" loading={isSubmitting}>
              {editingRole ? 'Save role' : 'Create role'}
            </AppButton>
          </DialogActions>
        </Stack>
      </AppDialog>

      <ConfirmDialog
        open={Boolean(deletingRole)}
        title="Delete role"
        description={`Delete ${deletingRole?.name ?? 'this role'}? This is only allowed when no active users have it.`}
        confirmLabel="Delete"
        loading={isSubmitting}
        onCancel={() => setDeletingRole(null)}
        onConfirm={handleDeleteRole}
      />
    </>
  );
};
