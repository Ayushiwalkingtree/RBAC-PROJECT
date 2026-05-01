import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SaveIcon from '@mui/icons-material/Save';
import { Alert, Box, Chip, Divider, Paper, Stack, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { permissionService } from '@/features/permissions/permission.service';
import { AppButton } from '@/shared/components/AppButton';
import { EmptyState } from '@/shared/components/EmptyState';
import { PageHeader } from '@/shared/components/PageHeader';
import { PermissionChip } from '@/shared/components/PermissionChip';
import { ResourceTypeBadge } from '@/shared/components/ResourceTypeBadge';
import { useToast } from '@/shared/components/useToast';
import { PERMISSION_KEYS, RESOURCE_KEYS } from '@/shared/constants/permission.constants';
import { usePermission } from '@/shared/hooks/usePermission';
import type { ResourceRecord, Role, RolePermissionGrants } from '@/shared/types/rbac.types';

const countGrants = (permissions: RolePermissionGrants): number =>
  Object.values(permissions).reduce((total, grants) => total + grants.length, 0);

export const PermissionsMatrixPage = () => {
  const session = useAuthStore((state) => state.session);
  const refreshSession = useAuthStore((state) => state.refreshSession);
  const { can } = usePermission();
  const { showToast } = useToast();
  const [roles, setRoles] = useState<Role[]>([]);
  const [resources, setResources] = useState<ResourceRecord[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [draftPermissions, setDraftPermissions] = useState<RolePermissionGrants>({});
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const canConfigure = can(RESOURCE_KEYS.permissionGrantApi, PERMISSION_KEYS.configure);
  const selectedRole = roles.find((role) => role.id === selectedRoleId);

  const groupedResources = useMemo(
    () =>
      resources.reduce<Record<string, ResourceRecord[]>>((groups, resource) => ({
        ...groups,
        [resource.resourceGroup]: [...(groups[resource.resourceGroup] ?? []), resource],
      }), {}),
    [resources],
  );

  const loadMatrix = async () => {
    if (!session) return;

    const matrix = await permissionService.getRolePermissionsMatrix(session.org.id);
    setRoles(matrix.roles);
    setResources(matrix.resources);
    const nextRoleId = selectedRoleId || matrix.roles[0]?.id || '';
    setSelectedRoleId(nextRoleId);
    const role = matrix.roles.find((candidate) => candidate.id === nextRoleId);
    setDraftPermissions(role?.permissions ?? {});
    setIsDirty(false);
  };

  useEffect(() => {
    void loadMatrix();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.org.id]);

  const selectRole = (role: Role) => {
    setSelectedRoleId(role.id);
    setDraftPermissions(role.permissions);
    setIsDirty(false);
  };

  const toggleGrant = (resourceKey: string, permissionKey: string) => {
    if (!canConfigure) return;

    setDraftPermissions((current) => {
      const currentPermissions = current[resourceKey] ?? [];
      const nextPermissions = currentPermissions.includes(permissionKey)
        ? currentPermissions.filter((permission) => permission !== permissionKey)
        : [...currentPermissions, permissionKey];
      const next = { ...current, [resourceKey]: nextPermissions };
      if (nextPermissions.length === 0) {
        delete next[resourceKey];
      }
      return next;
    });
    setIsDirty(true);
  };

  const discardChanges = () => {
    setDraftPermissions(selectedRole?.permissions ?? {});
    setIsDirty(false);
  };

  const handleSave = async () => {
    if (!selectedRoleId) return;

    setIsSaving(true);
    try {
      await permissionService.updateRolePermissions(selectedRoleId, draftPermissions);
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
      <PageHeader title="Permission Matrix" subtitle="Grant each role permissions on registered resources.">
        <Stack direction="row" spacing={1}>
          {isDirty && <Chip color="warning" label="Unsaved changes" />}
          <AppButton variant="outlined" startIcon={<RestartAltIcon />} disabled={!isDirty} onClick={discardChanges}>
            Discard
          </AppButton>
          <AppButton startIcon={<SaveIcon />} loading={isSaving} disabled={!canConfigure || !isDirty} onClick={() => void handleSave()}>
            Save
          </AppButton>
        </Stack>
      </PageHeader>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '320px 1fr' }, gap: 2 }}>
        <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', p: 2, minHeight: 620 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Roles</Typography>
          <Stack spacing={1}>
            {roles.map((role) => (
              <Paper
                key={role.id}
                elevation={0}
                onClick={() => selectRole(role)}
                sx={{
                  p: 1.5,
                  cursor: 'pointer',
                  border: 1,
                  borderColor: selectedRoleId === role.id ? 'primary.main' : 'divider',
                  bgcolor: selectedRoleId === role.id ? 'action.selected' : 'background.paper',
                  transition: 'transform 160ms ease, border-color 160ms ease',
                  '&:hover': { transform: 'translateY(-1px)', borderColor: 'primary.main' },
                }}
              >
                <Typography variant="body2" fontWeight={900}>{role.code}</Typography>
                <Typography variant="caption" color="text.secondary">{role.name}</Typography>
                <Typography variant="caption" display="block">{countGrants(role.permissions)} grants</Typography>
              </Paper>
            ))}
          </Stack>
        </Paper>

        <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', p: 2, minHeight: 620 }}>
          {!selectedRole ? (
            <EmptyState title="No role selected" description="Select a role to configure permissions." />
          ) : (
            <Stack spacing={2}>
              <Box>
                <Typography variant="h5">{selectedRole.name}</Typography>
                <Typography variant="body2" color="text.secondary">{selectedRole.description}</Typography>
              </Box>
              {!canConfigure && <Alert severity="info">You can view this matrix, but cannot configure grants.</Alert>}
              <Divider />
              {Object.entries(groupedResources).map(([group, groupResources]) => (
                <Box key={group}>
                  <Typography variant="h6" sx={{ mb: 1 }}>{group}</Typography>
                  <Stack spacing={1.25}>
                    {groupResources.map((resource) => (
                      <Paper key={resource.id} elevation={0} sx={{ p: 1.5, border: 1, borderColor: 'divider' }}>
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} justifyContent="space-between">
                          <Box>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="subtitle2" fontWeight={900}>{resource.resourceName}</Typography>
                              <ResourceTypeBadge type={resource.resourceType} />
                            </Stack>
                            <Typography variant="caption" color="text.secondary">{resource.resourceKey}</Typography>
                          </Box>
                          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                            {resource.allowedPermissions.map((permission) => (
                              <PermissionChip
                                key={`${resource.resourceKey}-${permission.key}`}
                                label={permission.key}
                                selected={(draftPermissions[resource.resourceKey] ?? []).includes(permission.key)}
                                onClick={() => toggleGrant(resource.resourceKey, permission.key)}
                              />
                            ))}
                          </Stack>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </Paper>
      </Box>
    </>
  );
};
