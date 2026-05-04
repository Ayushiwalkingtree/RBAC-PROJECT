import EditIcon from '@mui/icons-material/Edit';
import { Box, Chip, CircularProgress, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { DataTable } from '@/shared/components/DataTable';
import { EmptyState } from '@/shared/components/EmptyState';
import { PageHeader } from '@/shared/components/PageHeader';
import { PermissionChip } from '@/shared/components/PermissionChip';
import { useToast } from '@/shared/components/useToast';
import { useAuthStore } from '@/features/auth/store/auth.store';
import {
  navPreviewService,
  type PreviewOrganization,
  type UserNavigationPreview,
} from '@/features/navPreview/navPreview.service';
import type { UserRecord } from '@/shared/types/auth.types';
import type { NavigationItem } from '@/shared/types/navigation.types';
import { AppButton } from '@/shared/components/AppButton';
import { PERMISSION_KEYS, RESOURCE_KEYS } from '@/shared/constants/permission.constants';
import { ROUTES } from '@/shared/constants/route.constants';
import { usePermission } from '@/shared/hooks/usePermission';
import { useNavigate } from 'react-router-dom';

const isPlatformSuperAdminSession = (session: ReturnType<typeof useAuthStore.getState>['session']): boolean =>
  session?.org.code === 'PLATFORM' &&
  session.user.roles.some((role) => role.toUpperCase().replaceAll('_', ' ').includes('SUPER ADMIN'));

const renderNavItems = (items: NavigationItem[], depth = 0) => (
  <Stack spacing={0.75}>
    {items.map((item) => (
      <Box key={item.id} sx={{ pl: depth * 2 }}>
        <Typography variant={depth === 0 ? 'body2' : 'caption'} fontWeight={depth === 0 ? 900 : 700}>
          {item.label}
        </Typography>
        {item.children?.length ? renderNavItems(item.children, depth + 1) : null}
      </Box>
    ))}
  </Stack>
);

export const NavPreviewPage = () => {
  const session = useAuthStore((state) => state.session);
  const { showToast } = useToast();
  const { can } = usePermission();
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<PreviewOrganization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [preview, setPreview] = useState<UserNavigationPreview | null>(null);
  const [isLoadingOrganizations, setIsLoadingOrganizations] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const isPlatformSuperAdmin = isPlatformSuperAdminSession(session);
  const canEditNavigationOrder = isPlatformSuperAdmin || can(RESOURCE_KEYS.navOrderMenu, PERMISSION_KEYS.view);

  const selectedOrganization = useMemo(
    () => organizations.find((org) => org.orgId === selectedOrgId),
    [organizations, selectedOrgId],
  );

  const loadUsers = async (orgId: string, orgCode = '') => {
    setIsLoadingUsers(true);
    setUsers([]);
    setSelectedUserId('');
    setPreview(null);
    try {
      const nextUsers = isPlatformSuperAdmin
        ? await navPreviewService.listPlatformUsers(orgId, orgCode)
        : await navPreviewService.listUsers(orgId, orgCode);
      setUsers(nextUsers);
      setSelectedUserId(nextUsers[0]?.id ?? '');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to load users.', 'error');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (!session) return;

    if (isPlatformSuperAdmin) {
      setIsLoadingOrganizations(true);
      void navPreviewService
        .listOrganizations()
        .then((nextOrganizations) => {
          setOrganizations(nextOrganizations);
          setSelectedOrgId('');
          setUsers([]);
          setSelectedUserId('');
          setPreview(null);
        })
        .catch((error) => {
          showToast(error instanceof Error ? error.message : 'Unable to load organizations.', 'error');
        })
        .finally(() => setIsLoadingOrganizations(false));
      return;
    }

    void loadUsers(session.org.id, session.org.code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlatformSuperAdmin, session?.org.id]);

  useEffect(() => {
    if (!selectedUserId || !session) return;

    setIsLoadingPreview(true);
    const orgId = isPlatformSuperAdmin ? selectedOrgId : session.org.id;
    const orgCode = isPlatformSuperAdmin ? selectedOrganization?.orgCode ?? '' : session.org.code;
    const request = isPlatformSuperAdmin
      ? navPreviewService.getPlatformPreview(orgId, selectedUserId, orgCode)
      : navPreviewService.getPreview(selectedUserId, orgId, orgCode);

    void request
      .then(setPreview)
      .catch((error) => {
        setPreview(null);
        showToast(error instanceof Error ? error.message : 'Unable to load navigation preview.', 'error');
      })
      .finally(() => setIsLoadingPreview(false));
  }, [isPlatformSuperAdmin, selectedOrgId, selectedOrganization?.orgCode, selectedUserId, session, showToast]);

  const handleOrganizationChange = (orgId: string) => {
    const organization = organizations.find((org) => org.orgId === orgId);
    setSelectedOrgId(orgId);
    if (!organization) {
      setUsers([]);
      setSelectedUserId('');
      setPreview(null);
      return;
    }
    void loadUsers(organization.orgId, organization.orgCode);
  };

  return (
    <>
      <PageHeader title="Nav Preview" subtitle="Verify a user's menu tree and API access from effective permissions.">
        {canEditNavigationOrder && (
          <Stack direction="row" spacing={1}>
            <AppButton startIcon={<EditIcon />} onClick={() => navigate(ROUTES.navigationOrder)}>
              Edit navigation order
            </AppButton>
            <AppButton
              variant="outlined"
              startIcon={<EditIcon />}
              disabled={!selectedUserId}
              onClick={() => {
                const selectedUser = users.find((user) => user.id === selectedUserId);
                const userLabel = encodeURIComponent(selectedUser?.email ?? selectedUser?.name ?? 'selected user');
                navigate(`${ROUTES.navigationOrder}?userId=${selectedUserId}&userLabel=${userLabel}`);
              }}
            >
              Customize for this user
            </AppButton>
          </Stack>
        )}
      </PageHeader>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '420px 1fr' }, gap: 2 }}>
        <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', p: 2 }}>
          <Stack spacing={2}>
            {isPlatformSuperAdmin && (
              <TextField
                select
                label="Organization"
                value={selectedOrgId}
                onChange={(event) => handleOrganizationChange(event.target.value)}
                disabled={isLoadingOrganizations}
                fullWidth
              >
                <MenuItem value="">Select organization</MenuItem>
                {organizations.map((org) => (
                  <MenuItem key={org.orgId} value={org.orgId}>
                    {org.orgName} | {org.orgCode}
                  </MenuItem>
                ))}
              </TextField>
            )}

            {isLoadingUsers ? (
              <Stack alignItems="center" sx={{ py: 4 }}>
                <CircularProgress size={28} />
              </Stack>
            ) : users.length === 0 ? (
              <EmptyState
                title={isPlatformSuperAdmin && !selectedOrgId ? 'Select organization' : 'No users found'}
                description={isPlatformSuperAdmin && !selectedOrgId ? 'Choose an organization to load its users.' : 'Users will appear here when available.'}
              />
            ) : (
              <DataTable
                rows={users}
                getRowId={(user) => user.id}
                getRowSx={(user) =>
                  user.id === selectedUserId
                    ? { bgcolor: 'action.selected', '&:hover': { bgcolor: 'action.selected' } }
                    : undefined
                }
                columns={[
                  {
                    id: 'user',
                    label: 'User',
                    render: (user) => (
                      <Box
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedUserId(user.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            setSelectedUserId(user.id);
                          }
                        }}
                        sx={{ cursor: 'pointer' }}
                      >
                        <Typography variant="body2" fontWeight={900}>{user.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{user.email}</Typography>
                        <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mt: 0.75 }}>
                          {(user.roleCodes?.length ? user.roleCodes : user.roleIds).map((role) => (
                            <Chip key={role} label={role} size="small" variant="outlined" />
                          ))}
                        </Stack>
                      </Box>
                    ),
                  },
                  {
                    id: 'status',
                    label: 'Status',
                    render: (user) => (
                      <Stack spacing={0.5}>
                        <Chip label={user.status === 'active' ? 'Active' : 'Inactive'} size="small" />
                        <Chip
                          label={user.isEmailVerified ? 'Verified' : 'Unverified'}
                          size="small"
                          color={user.isEmailVerified ? 'success' : 'warning'}
                        />
                      </Stack>
                    ),
                  },
                ]}
              />
            )}
          </Stack>
        </Paper>

        <Stack spacing={2}>
          {isLoadingPreview ? (
            <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', p: 2, minHeight: 320 }}>
              <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 280 }}>
                <CircularProgress />
              </Stack>
            </Paper>
          ) : !preview ? (
            <EmptyState title="No preview" description="Select a user to calculate navigation." />
          ) : (
            <>
              <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', p: 2 }}>
                <Typography variant="h6">Selected user</Typography>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                  <Chip label={preview.user.name} />
                  <Chip label={preview.user.email} variant="outlined" />
                  {preview.roles.map((role) => <Chip key={role.id} label={role.code} size="small" />)}
                </Stack>
              </Paper>
              <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', p: 2 }}>
                <Typography variant="h6">Menu tree</Typography>
                <Box sx={{ mt: 2 }}>
                  {preview.navigation.length === 0 ? (
                    <EmptyState title="No navigation items available for this user." description="Grant menu or dashboard VIEW access to show navigation." />
                  ) : (
                    renderNavItems(preview.navigation)
                  )}
                </Box>
              </Paper>
              <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', p: 2 }}>
                <Typography variant="h6">API access</Typography>
                <Stack spacing={1.25} sx={{ mt: 2 }}>
                  {preview.apiResources.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">No API permissions are assigned.</Typography>
                  ) : preview.apiResources.map((resource) => (
                    <Stack key={resource.id} direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
                      <Typography variant="body2" fontWeight={900}>{resource.resourceKey}</Typography>
                      {(preview.permissions[resource.resourceKey] ?? []).map((permission) => (
                        <PermissionChip key={`${resource.resourceKey}-${permission}`} label={permission} selected />
                      ))}
                    </Stack>
                  ))}
                </Stack>
              </Paper>
            </>
          )}
        </Stack>
      </Box>
    </>
  );
};
