import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SaveIcon from '@mui/icons-material/Save';
import { Box, Chip, CircularProgress, Divider, Paper, Stack, Tooltip, Typography } from '@mui/material';
import { useMemo, useState } from 'react';
import {
  tenantAdminAccessService,
  type TenantAdminAccessMatrix,
  type TenantAdminRow,
} from '@/features/tenantAdminAccess/tenantAdminAccess.service';
import { AppButton } from '@/shared/components/AppButton';
import { DataTable } from '@/shared/components/DataTable';
import { EmptyState } from '@/shared/components/EmptyState';
import { PageHeader } from '@/shared/components/PageHeader';
import { PermissionChip } from '@/shared/components/PermissionChip';
import { useToast } from '@/shared/components/useToast';
import {
  applyBusinessActionToggle,
  buildBusinessPermissionRows,
  getTechnicalSummary,
  isBusinessActionSelected,
} from '@/shared/adapters/rbacDisplay.adapter';
import type { BusinessPermissionAction } from '@/shared/adapters/rbacDisplay.adapter';
import type { RolePermissionGrants } from '@/shared/types/rbac.types';
import { useEffect } from 'react';

const countGrants = (permissions: RolePermissionGrants): number =>
  Object.values(permissions).reduce((total, grants) => total + grants.length, 0);

export const TenantAdminAccessPage = () => {
  const { showToast } = useToast();
  const [admins, setAdmins] = useState<TenantAdminRow[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<TenantAdminRow | null>(null);
  const [matrix, setMatrix] = useState<TenantAdminAccessMatrix | null>(null);
  const [draftPermissions, setDraftPermissions] = useState<RolePermissionGrants>({});
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingMatrix, setIsLoadingMatrix] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const rows = useMemo(
    () => buildBusinessPermissionRows(matrix?.resources ?? []),
    [matrix?.resources],
  );
  const groupedRows = useMemo(
    () =>
      rows.reduce<Record<string, typeof rows>>((groups, row) => ({
        ...groups,
        [row.displayGroup]: [...(groups[row.displayGroup] ?? []), row],
      }), {}),
    [rows],
  );

  const loadAdmins = async () => {
    setIsLoadingList(true);
    try {
      setAdmins(await tenantAdminAccessService.listTenantAdmins());
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to load tenant admins.', 'error');
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    void loadAdmins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const manageAccess = async (admin: TenantAdminRow) => {
    setSelectedAdmin(admin);
    setIsLoadingMatrix(true);
    setIsDirty(false);
    try {
      const nextMatrix = await tenantAdminAccessService.getTenantAdminPermissions(admin.orgId);
      setMatrix(nextMatrix);
      setDraftPermissions(nextMatrix.permissions);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to load tenant admin access.', 'error');
    } finally {
      setIsLoadingMatrix(false);
    }
  };

  const toggleGrant = (action: BusinessPermissionAction) => {
    setDraftPermissions((current) => applyBusinessActionToggle(current, action));
    setIsDirty(true);
  };

  const discardChanges = () => {
    setDraftPermissions(matrix?.permissions ?? {});
    setIsDirty(false);
  };

  const saveAccess = async () => {
    if (!selectedAdmin) return;
    setIsSaving(true);
    try {
      const nextMatrix = await tenantAdminAccessService.updateTenantAdminPermissions(selectedAdmin.orgId, draftPermissions);
      setMatrix(nextMatrix);
      setDraftPermissions(nextMatrix.permissions);
      setIsDirty(false);
      await loadAdmins();
      showToast('Tenant admin access updated. Changes apply after next login.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to update tenant admin access.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Tenant Admin Access"
        subtitle="Control which permissions organization admins can delegate inside their tenant."
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '460px 1fr' }, gap: 2 }}>
        <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', p: 2, minHeight: 620 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Organization admins</Typography>
          {isLoadingList ? (
            <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress size={28} /></Stack>
          ) : admins.length === 0 ? (
            <EmptyState title="No tenant admins found" description="Signup-created organization admins will appear here." />
          ) : (
            <DataTable
              rows={admins}
              getRowId={(admin) => `${admin.orgId}-${admin.adminUserId}`}
              columns={[
                {
                  id: 'organization',
                  label: 'Organization',
                  render: (admin) => (
                    <Box>
                      <Typography variant="body2" fontWeight={900}>{admin.orgName}</Typography>
                      <Typography variant="caption" color="text.secondary">{admin.orgCode}</Typography>
                    </Box>
                  ),
                },
                {
                  id: 'admin',
                  label: 'Admin',
                  render: (admin) => (
                    <Box>
                      <Typography variant="body2">{admin.adminName}</Typography>
                      <Typography variant="caption" color="text.secondary">{admin.adminEmail}</Typography>
                    </Box>
                  ),
                },
                {
                  id: 'status',
                  label: 'Status',
                  render: (admin) => (
                    <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
                      <Chip label={admin.isActive ? 'Active' : 'Inactive'} size="small" />
                      <Chip
                        label={admin.isEmailVerified ? 'Verified' : 'Unverified'}
                        size="small"
                        color={admin.isEmailVerified ? 'success' : 'warning'}
                      />
                    </Stack>
                  ),
                },
                {
                  id: 'actions',
                  label: 'Actions',
                  render: (admin) => (
                    <Stack spacing={0.75}>
                      <Chip label={`${admin.permissionsCount} grants`} size="small" variant="outlined" />
                      <AppButton size="small" onClick={() => void manageAccess(admin)}>
                        Manage Access
                      </AppButton>
                    </Stack>
                  ),
                },
              ]}
            />
          )}
        </Paper>

        <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', p: 2, minHeight: 620 }}>
          {!selectedAdmin ? (
            <EmptyState title="Select a tenant admin" description="Choose Manage Access to edit ORG_ADMIN permissions." />
          ) : isLoadingMatrix ? (
            <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 500 }}>
              <CircularProgress />
            </Stack>
          ) : (
            <Stack spacing={2}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} justifyContent="space-between">
                <Box>
                  <Typography variant="h5">{selectedAdmin.orgName}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedAdmin.adminName} | {selectedAdmin.adminRoleCode} | {countGrants(draftPermissions)} grants
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  {isDirty && <Chip color="warning" label="Unsaved changes" />}
                  <AppButton variant="outlined" startIcon={<RestartAltIcon />} disabled={!isDirty} onClick={discardChanges}>
                    Discard
                  </AppButton>
                  <AppButton startIcon={<SaveIcon />} loading={isSaving} disabled={!isDirty} onClick={() => void saveAccess()}>
                    Save
                  </AppButton>
                </Stack>
              </Stack>
              <Divider />
              {Object.entries(groupedRows).map(([group, groupRows]) => (
                <Box key={group}>
                  <Typography variant="h6" sx={{ mb: 1 }}>{group}</Typography>
                  <Stack spacing={1.25}>
                    {groupRows.map((row) => (
                      <Paper key={row.id} elevation={0} sx={{ p: 1.5, border: 1, borderColor: 'divider' }}>
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} justifyContent="space-between">
                          <Box>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Tooltip title={getTechnicalSummary(matrix?.resources ?? [], row.technicalResourceKeys)}>
                                <Typography variant="subtitle2" fontWeight={900}>{row.displayName}</Typography>
                              </Tooltip>
                              <Chip label={row.displayType} size="small" variant="outlined" />
                            </Stack>
                            <Typography variant="caption" color="text.secondary">{row.description}</Typography>
                          </Box>
                          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                            {row.actions.map((permission) => (
                              <PermissionChip
                                key={permission.id}
                                label={permission.label}
                                selected={isBusinessActionSelected(draftPermissions, permission)}
                                onClick={() => toggleGrant(permission)}
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
