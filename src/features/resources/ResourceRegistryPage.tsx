import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import {
  Box,
  Chip,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { AppButton } from '@/shared/components/AppButton';
import { AppDialog } from '@/shared/components/AppDialog';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { EmptyState } from '@/shared/components/EmptyState';
import { PageHeader } from '@/shared/components/PageHeader';
import { PermissionChip } from '@/shared/components/PermissionChip';
import { useToast } from '@/shared/components/useToast';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { ResourceForm } from '@/features/resources/ResourceForm';
import { emptyResourceFormValues, valuesFromResource } from '@/features/resources/resourceForm.utils';
import { resourceService } from '@/features/resources/resource.service';
import { PERMISSION_KEYS, RESOURCE_KEYS, RESOURCE_TYPES } from '@/shared/constants/permission.constants';
import { usePermission } from '@/shared/hooks/usePermission';
import {
  buildBusinessPermissionRows,
  buildTechnicalPermissionRows,
  getTechnicalSummary,
} from '@/shared/adapters/rbacDisplay.adapter';
import type { BusinessPermissionRow } from '@/shared/adapters/rbacDisplay.adapter';
import type { ResourceFormValues } from '@/features/resources/resource.schema';
import type { ResourceRecord } from '@/shared/types/rbac.types';

const canManageResources = (
  can: ReturnType<typeof usePermission>['can'],
  sessionOrgCode?: string,
): boolean =>
  sessionOrgCode === 'PLATFORM' ||
  (can(RESOURCE_KEYS.resourceRegistryMenu, PERMISSION_KEYS.view) &&
    can(RESOURCE_KEYS.resourceManageApi, PERMISSION_KEYS.create));

export const ResourceRegistryPage = () => {
  const session = useAuthStore((state) => state.session);
  const refreshSession = useAuthStore((state) => state.refreshSession);
  const { can } = usePermission();
  const { showToast } = useToast();
  const [resources, setResources] = useState<ResourceRecord[]>([]);
  const [selectedRowId, setSelectedRowId] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [showTechnicalResources, setShowTechnicalResources] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<ResourceRecord | null>(null);
  const [deletingResource, setDeletingResource] = useState<ResourceRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canManage = canManageResources(can, session?.org.code);
  const isPlatform = session?.org.code === 'PLATFORM';
  const parentResources = resources.filter(
    (resource) => resource.resourceType === RESOURCE_TYPES.menu && resource.isActive,
  );
  const businessRows = useMemo(() => buildBusinessPermissionRows(resources), [resources]);
  const technicalRows = useMemo(() => buildTechnicalPermissionRows(resources), [resources]);
  const registryRows = useMemo(
    () =>
      (showTechnicalResources ? technicalRows : businessRows).filter(
        (row) => !showTechnicalResources || typeFilter === 'ALL' || row.displayType === typeFilter,
      ),
    [businessRows, showTechnicalResources, technicalRows, typeFilter],
  );
  const selectedRow = registryRows.find((row) => row.id === selectedRowId) ?? registryRows[0];
  const primaryResource = selectedRow
    ? resources.find((resource) => resource.resourceKey === selectedRow.technicalResourceKeys[0])
    : undefined;

  const groupedRows = useMemo(
    () =>
      registryRows.reduce<Record<string, BusinessPermissionRow[]>>((groups, row) => ({
        ...groups,
        [row.displayGroup]: [...(groups[row.displayGroup] ?? []), row],
      }), {}),
    [registryRows],
  );

  const loadResources = async () => {
    const nextResources = await resourceService.listResources();
    setResources(nextResources);
  };

  useEffect(() => {
    void loadResources();
  }, []);

  const openCreate = () => {
    setEditingResource(null);
    setFormOpen(true);
  };

  const openEdit = (resource: ResourceRecord) => {
    setEditingResource(resource);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingResource(null);
  };

  const handleSubmit = async (values: ResourceFormValues) => {
    setIsSubmitting(true);
    try {
      if (editingResource) {
        await resourceService.updateResource(editingResource.id, values);
        showToast('Resource updated.');
      } else {
        const created = await resourceService.createResource(values);
        setSelectedRowId(showTechnicalResources ? `technical-${created.resourceKey}` : `resource-${created.resourceKey}`);
        showToast('Resource created.');
      }

      await loadResources();
      await refreshSession();
      closeForm();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Resource action failed.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingResource) return;

    setIsSubmitting(true);
    try {
      await resourceService.deleteResource(deletingResource.id);
      setSelectedRowId('');
      await loadResources();
      await refreshSession();
      showToast('Resource deleted and removed from role grants.');
      setDeletingResource(null);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to delete resource.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader title="Resource Registry" subtitle="Manage business features and their available actions.">
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
          {isPlatform && (
            <FormControlLabel
              control={
                <Switch
                  checked={showTechnicalResources}
                  onChange={(_, checked) => {
                    setShowTechnicalResources(checked);
                    setSelectedRowId('');
                  }}
                />
              }
              label="Show technical resources"
            />
          )}
          {canManage && (
            <AppButton startIcon={<AddIcon />} onClick={openCreate}>
              Create Resource
            </AppButton>
          )}
        </Stack>
      </PageHeader>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '360px 1fr' }, gap: 2 }}>
        <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', p: 2, minHeight: 560 }}>
          {showTechnicalResources && (
            <TextField
              select
              label="Resource type"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              fullWidth
              sx={{ mb: 2 }}
            >
              <MenuItem value="ALL">All types</MenuItem>
              {Object.values(RESOURCE_TYPES).map((type) => (
                <MenuItem key={type} value={type}>{type}</MenuItem>
              ))}
            </TextField>
          )}

          <Stack spacing={2}>
            {Object.entries(groupedRows).map(([group, rows]) => (
              <Box key={group}>
                <Typography variant="overline" color="text.secondary">{group}</Typography>
                <Stack spacing={0.75}>
                  {rows.map((row) => (
                    <Paper
                      key={row.id}
                      elevation={0}
                      onClick={() => setSelectedRowId(row.id)}
                      sx={{
                        p: 1.25,
                        cursor: 'pointer',
                        border: 1,
                        borderColor: selectedRow?.id === row.id ? 'primary.main' : 'divider',
                        bgcolor: selectedRow?.id === row.id ? 'action.selected' : 'background.paper',
                        transition: 'transform 160ms ease, border-color 160ms ease',
                        '&:hover': { transform: 'translateY(-1px)', borderColor: 'primary.main' },
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" spacing={1}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={800} noWrap>{row.displayName}</Typography>
                          <Typography variant="caption" color="text.secondary" noWrap display="block">
                            {row.description}
                          </Typography>
                        </Box>
                        <Chip label={row.displayType} size="small" variant="outlined" />
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              </Box>
            ))}
          </Stack>
        </Paper>

        <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', p: 2, minHeight: 560 }}>
          {!selectedRow ? (
            <EmptyState title="No resource selected" description="Choose a feature to view its available actions." />
          ) : (
            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="h5">{selectedRow.displayName}</Typography>
                    <Chip label={selectedRow.displayType} size="small" variant="outlined" />
                    {primaryResource && !primaryResource.isActive && <Chip label="Inactive" size="small" color="warning" />}
                  </Stack>
                  <Typography variant="body2" color="text.secondary">{selectedRow.description}</Typography>
                </Box>
                {canManage && primaryResource && (showTechnicalResources || selectedRow.technicalResourceKeys.length === 1) && (
                  <Stack direction="row" spacing={1}>
                    <Tooltip title="Edit resource">
                      <IconButton onClick={() => openEdit(primaryResource)} aria-label="Edit resource">
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete resource">
                      <IconButton color="error" onClick={() => setDeletingResource(primaryResource)} aria-label="Delete resource">
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                )}
              </Stack>
              <Divider />
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
                {[
                  ['Module', selectedRow.displayGroup],
                  ['Type', selectedRow.displayType],
                  ['Sort order', primaryResource?.sequenceNo ?? 'None'],
                  [
                    'Parent menu',
                    resources.find((resource) => resource.resourceKey === primaryResource?.parentResourceKey)?.resourceName ?? 'Top level',
                  ],
                  ['UI visible', primaryResource?.isUiVisible ? 'Yes' : 'No'],
                  ['Active', primaryResource?.isActive ? 'Yes' : 'No'],
                ].map(([label, value]) => (
                  <Box key={label}>
                    <Typography variant="caption" color="text.secondary">{label}</Typography>
                    <Typography variant="body2" fontWeight={800}>{value}</Typography>
                  </Box>
                ))}
              </Box>
              {isPlatform && showTechnicalResources && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant="subtitle2" fontWeight={900} sx={{ mb: 1 }}>Technical details</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                      {getTechnicalSummary(resources, selectedRow.technicalResourceKeys)}
                    </Typography>
                  </Box>
                </>
              )}
              <Divider />
              <Box>
                <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1 }}>Actions</Typography>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  {selectedRow.actions.map((permission) => (
                    <PermissionChip key={permission.id} label={permission.label} selected />
                  ))}
                </Stack>
              </Box>
            </Stack>
          )}
        </Paper>
      </Box>

      <AppDialog
        open={formOpen}
        title={editingResource ? 'Edit resource' : 'Create resource'}
        helperText="Create a business feature and choose the actions that roles may receive."
        onClose={closeForm}
        maxWidth="md"
      >
        <ResourceForm
          initialValues={editingResource ? valuesFromResource(editingResource) : emptyResourceFormValues}
          loading={isSubmitting}
          parentResources={parentResources}
          showAdvanced={isPlatform}
          onCancel={closeForm}
          onSubmit={handleSubmit}
        />
      </AppDialog>

      <ConfirmDialog
        open={Boolean(deletingResource)}
        title="Delete resource"
        description={`Delete ${deletingResource?.resourceName ?? 'this resource'} and remove its grants from all roles?`}
        confirmLabel="Delete"
        loading={isSubmitting}
        onCancel={() => setDeletingResource(null)}
        onConfirm={handleDelete}
      />
    </>
  );
};
