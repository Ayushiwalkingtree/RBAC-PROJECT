import SaveIcon from '@mui/icons-material/Save';
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { permissionService } from '@/features/permissions/permission.service';
import { AppButton } from '@/shared/components/AppButton';
import { EmptyState } from '@/shared/components/EmptyState';
import { PageHeader } from '@/shared/components/PageHeader';
import { PermissionChip } from '@/shared/components/PermissionChip';
import { useToast } from '@/shared/components/useToast';
import { PermissionGuard } from '@/shared/components/guards/PermissionGuard';
import { ACTION_KEYS, RESOURCE_KEYS } from '@/shared/constants/permission.constants';
import type { Permission, Resource, Role } from '@/shared/types/rbac.types';

export const PermissionsMatrixPage = () => {
  const session = useAuthStore((state) => state.session);
  const refreshSession = useAuthStore((state) => state.refreshSession);
  const { showToast } = useToast();
  const [roles, setRoles] = useState<Role[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [draftPermissionIds, setDraftPermissionIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const selectedRole = roles.find((role) => role.id === selectedRoleId);

  const groupedResources = useMemo(
    () =>
      resources.reduce<Record<string, Resource[]>>((groups, resource) => {
        return {
          ...groups,
          [resource.group]: [...(groups[resource.group] ?? []), resource],
        };
      }, {}),
    [resources],
  );

  const loadMatrix = async () => {
    if (!session) {
      return;
    }

    const matrix = await permissionService.getRolePermissionsMatrix(session.org.id);
    setRoles(matrix.roles);
    setResources(matrix.resources);
    setPermissions(matrix.permissions);

    const nextRoleId = selectedRoleId || matrix.roles[0]?.id || '';
    setSelectedRoleId(nextRoleId);
    const role = matrix.roles.find((candidate) => candidate.id === nextRoleId);
    setDraftPermissionIds(role?.permissionIds ?? []);
  };

  useEffect(() => {
    void loadMatrix();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.org.id]);

  const handleRoleChange = (event: SelectChangeEvent) => {
    const roleId = event.target.value;
    const role = roles.find((candidate) => candidate.id === roleId);
    setSelectedRoleId(roleId);
    setDraftPermissionIds(role?.permissionIds ?? []);
  };

  const togglePermission = (permissionId: string) => {
    setDraftPermissionIds((current) =>
      current.includes(permissionId)
        ? current.filter((id) => id !== permissionId)
        : [...current, permissionId],
    );
  };

  const handleSave = async () => {
    if (!selectedRoleId) {
      return;
    }

    setIsSaving(true);
    try {
      await permissionService.updateRolePermissions(selectedRoleId, draftPermissionIds);
      await loadMatrix();
      await refreshSession();
      showToast('Permissions saved.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to save permissions.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Permissions Matrix" subtitle="Select a role and configure allowed resource actions.">
        <PermissionGuard resource={RESOURCE_KEYS.permissions} action={ACTION_KEYS.assign}>
          <AppButton startIcon={<SaveIcon />} loading={isSaving} onClick={() => void handleSave()}>
            Save permissions
          </AppButton>
        </PermissionGuard>
      </PageHeader>

      {roles.length === 0 ? (
        <EmptyState title="No roles available" description="Create a role before assigning permissions." />
      ) : (
        <Stack spacing={2}>
          <FormControl size="small" sx={{ maxWidth: 360 }}>
            <InputLabel>Role</InputLabel>
            <Select label="Role" value={selectedRoleId} onChange={handleRoleChange}>
              {roles.map((role) => (
                <MenuItem key={role.id} value={role.id}>
                  {role.code} · {role.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {selectedRole && (
            <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', p: 2 }}>
              <Typography variant="h6">{selectedRole.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedRole.description}
              </Typography>
            </Paper>
          )}

          {Object.entries(groupedResources).map(([group, groupResources]) => (
            <Paper key={group} elevation={0} sx={{ border: 1, borderColor: 'divider', p: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                {group}
              </Typography>
              <Stack spacing={2}>
                {groupResources.map((resource) => {
                  const resourcePermissions = permissions.filter(
                    (permission) => permission.resource === resource.id,
                  );

                  return (
                    <Box key={resource.id}>
                      <Typography variant="subtitle1" fontWeight={800}>
                        {resource.label}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {resource.description}
                      </Typography>
                      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                        {resourcePermissions.map((permission) => (
                          <PermissionChip
                            key={permission.id}
                            label={permission.action}
                            selected={draftPermissionIds.includes(permission.id)}
                            onClick={() => togglePermission(permission.id)}
                          />
                        ))}
                      </Stack>
                    </Box>
                  );
                })}
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </>
  );
};
