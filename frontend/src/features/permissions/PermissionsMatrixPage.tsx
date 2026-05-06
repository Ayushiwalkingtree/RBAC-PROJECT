import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SaveIcon from '@mui/icons-material/Save';
import { Alert, Box, Chip, CircularProgress, Divider, Paper, Stack, Tooltip, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { permissionService } from '@/features/permissions/permission.service';
import { AppButton } from '@/shared/components/AppButton';
import { EmptyState } from '@/shared/components/EmptyState';
import { PageHeader } from '@/shared/components/PageHeader';
import { PermissionChip } from '@/shared/components/PermissionChip';
import { useToast } from '@/shared/components/useToast';
import { PERMISSION_KEYS, RESOURCE_KEYS } from '@/shared/constants/permission.constants';
import { usePermission } from '@/shared/hooks/usePermission';
import {
  applyBusinessActionToggle,
  buildBusinessPermissionRows,
  getTechnicalSummary,
  isBusinessActionSelected,
  normalizePermissionMatrixDependencies,
} from '@/shared/adapters/rbacDisplay.adapter';
import type { BusinessPermissionAction } from '@/shared/adapters/rbacDisplay.adapter';
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
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  const canReadMatrix = can(RESOURCE_KEYS.permissionGrantApi, PERMISSION_KEYS.read);
  const canConfigure = can(RESOURCE_KEYS.permissionGrantApi, PERMISSION_KEYS.configure);
  const selectedRole = roles.find((role) => role.id === selectedRoleId);

  const displayRows = useMemo(() => buildBusinessPermissionRows(resources), [resources]);
  const groupedRows = useMemo(
    () =>
      displayRows.reduce<Record<string, typeof displayRows>>((groups, row) => ({
        ...groups,
        [row.displayGroup]: [...(groups[row.displayGroup] ?? []), row],
      }), {}),
    [displayRows],
  );

  const loadMatrix = async (preferredRoleId = selectedRoleId) => {
    if (!session || !canReadMatrix) return;

    setIsLoading(true);
    setLoadError('');
    try {
      const matrix = await permissionService.getRolePermissionsMatrix(session.org.id);
      setRoles(matrix.roles);
      setResources(matrix.resources);
      const currentRoleStillVisible = matrix.roles.some((role) => role.id === preferredRoleId);
      const nextRoleId = currentRoleStillVisible ? preferredRoleId : matrix.roles[0]?.id || '';
      setSelectedRoleId(nextRoleId);
      const role = matrix.roles.find((candidate) => candidate.id === nextRoleId);
      setDraftPermissions(normalizePermissionMatrixDependencies(role?.permissions ?? {}));
      setIsDirty(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load permission matrix.';
      setLoadError(message);
      showToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!canReadMatrix) return;
    setRoles([]);
    setResources([]);
    setSelectedRoleId('');
    setDraftPermissions({});
    setIsDirty(false);
    void loadMatrix('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.org.id, canReadMatrix]);

  const selectRole = (role: Role) => {
    setSelectedRoleId(role.id);
    setDraftPermissions(normalizePermissionMatrixDependencies(role.permissions));
    setIsDirty(false);
  };

  const toggleGrant = (action: BusinessPermissionAction) => {
    if (!canConfigure) return;

    setDraftPermissions((current) => applyBusinessActionToggle(current, action));
    setIsDirty(true);
  };

  const discardChanges = () => {
    setDraftPermissions(normalizePermissionMatrixDependencies(selectedRole?.permissions ?? {}));
    setIsDirty(false);
  };

  const handleSave = async () => {
    if (!selectedRoleId || !canConfigure) return;

    setIsSaving(true);
    try {
      const affectsCurrentSession = Boolean(
        selectedRole?.code && session?.user.roles.includes(selectedRole.code),
      );
      await permissionService.updateRolePermissions(selectedRoleId, normalizePermissionMatrixDependencies(draftPermissions), {
        userId: session?.user.id,
        email: session?.user.email,
      });
      if (affectsCurrentSession) {
        await refreshSession();
      }
      await loadMatrix(selectedRoleId);
      showToast(
        affectsCurrentSession
          ? 'Permissions updated. Navigation refreshed.'
          : 'Permissions updated.',
      );
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to save permissions.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {!canReadMatrix ? (
        <EmptyState title="Unauthorized" description="You do not have permission to view this page." />
      ) : (
        <>
      <PageHeader title="Permission Matrix" subtitle="Grant each role permissions on registered resources.">
        <Stack direction="row" spacing={1}>
          {import.meta.env.DEV && session && (
            <Chip label={`Org ${session.org.id} / ${session.org.code}`} size="small" variant="outlined" />
          )}
          {isDirty && <Chip color="warning" label="Unsaved changes" />}
          <AppButton variant="outlined" startIcon={<RestartAltIcon />} disabled={!isDirty} onClick={discardChanges}>
            Discard
          </AppButton>
          <Tooltip title={!canConfigure ? "You don't have permission to configure permissions" : ''}>
            <span>
              <AppButton startIcon={<SaveIcon />} loading={isSaving} disabled={!canConfigure || !isDirty} onClick={() => void handleSave()}>
                Save
              </AppButton>
            </span>
          </Tooltip>
        </Stack>
      </PageHeader>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '320px 1fr' }, gap: 2 }}>
        <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', p: 2, minHeight: 620 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Roles</Typography>
          {isLoading ? (
            <Stack alignItems="center" sx={{ py: 6 }}>
              <CircularProgress size={28} />
            </Stack>
          ) : (
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
          )}
        </Paper>

        <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', p: 2, minHeight: 620 }}>
          {loadError ? (
            <Alert severity="error">{loadError}</Alert>
          ) : isLoading ? (
            <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 500 }}>
              <CircularProgress />
            </Stack>
          ) : !selectedRole ? (
            <EmptyState title="No role selected" description="Select a role to configure permissions." />
          ) : (
            <Stack spacing={2}>
              <Box>
                <Typography variant="h5">{selectedRole.name}</Typography>
                <Typography variant="body2" color="text.secondary">{selectedRole.description}</Typography>
              </Box>
              {!canConfigure && <Alert severity="info">You can view this matrix, but cannot configure grants.</Alert>}
              <Divider />
              {Object.entries(groupedRows).map(([group, rows]) => (
                <Box key={group}>
                  <Typography variant="h6" sx={{ mb: 1 }}>{group}</Typography>
                  <Stack spacing={1.25}>
                    {rows.map((row) => (
                      <Paper key={row.id} elevation={0} sx={{ p: 1.5, border: 1, borderColor: 'divider' }}>
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} justifyContent="space-between">
                          <Box>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Tooltip title={getTechnicalSummary(resources, row.technicalResourceKeys)}>
                                <Typography variant="subtitle2" fontWeight={900}>{row.displayName}</Typography>
                              </Tooltip>
                              <Chip label={row.displayType} size="small" variant="outlined" />
                            </Stack>
                            <Typography variant="caption" color="text.secondary">{row.description}</Typography>
                          </Box>
                          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                            {row.actions.map((permission) => (
                              <Tooltip
                                key={permission.id}
                                title={!canConfigure ? "You don't have permission to configure permissions" : ''}
                              >
                                <span>
                                  <PermissionChip
                                    label={permission.label}
                                    selected={isBusinessActionSelected(draftPermissions, permission)}
                                    disabled={!canConfigure}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      toggleGrant(permission);
                                    }}
                                  />
                                </span>
                              </Tooltip>
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
      )}
    </>
  );
};
