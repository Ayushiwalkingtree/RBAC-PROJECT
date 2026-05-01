import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { Box, Chip, Divider, IconButton, MenuItem, Paper, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { AppButton } from '@/shared/components/AppButton';
import { AppDialog } from '@/shared/components/AppDialog';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { EmptyState } from '@/shared/components/EmptyState';
import { PageHeader } from '@/shared/components/PageHeader';
import { PermissionChip } from '@/shared/components/PermissionChip';
import { ResourceTypeBadge } from '@/shared/components/ResourceTypeBadge';
import { useToast } from '@/shared/components/useToast';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { ResourceForm } from '@/features/resources/ResourceForm';
import { emptyResourceFormValues, valuesFromResource } from '@/features/resources/resourceForm.utils';
import { resourceService } from '@/features/resources/resource.service';
import { PERMISSION_KEYS, RESOURCE_KEYS, RESOURCE_TYPES } from '@/shared/constants/permission.constants';
import { usePermission } from '@/shared/hooks/usePermission';
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
  const [selectedResourceId, setSelectedResourceId] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<ResourceRecord | null>(null);
  const [deletingResource, setDeletingResource] = useState<ResourceRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedResource = resources.find((resource) => resource.id === selectedResourceId) ?? resources[0];
  const canManage = canManageResources(can, session?.org.code);

  const filteredResources = useMemo(
    () => resources.filter((resource) => typeFilter === 'ALL' || resource.resourceType === typeFilter),
    [resources, typeFilter],
  );

  const groupedResources = useMemo(
    () =>
      filteredResources.reduce<Record<string, ResourceRecord[]>>((groups, resource) => ({
        ...groups,
        [resource.resourceGroup]: [...(groups[resource.resourceGroup] ?? []), resource],
      }), {}),
    [filteredResources],
  );

  const loadResources = async () => {
    const nextResources = await resourceService.listResources();
    setResources(nextResources);
    setSelectedResourceId((current) => current || nextResources[0]?.id || '');
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
        setSelectedResourceId(created.id);
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
      setSelectedResourceId('');
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
      <PageHeader title="Resource Registry" subtitle="Define menus, APIs, buttons, actions, reports, and dashboards.">
        {canManage && (
          <AppButton startIcon={<AddIcon />} onClick={openCreate}>
            Create Resource
          </AppButton>
        )}
      </PageHeader>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '360px 1fr' }, gap: 2 }}>
        <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', p: 2, minHeight: 560 }}>
          <TextField select label="Resource type" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} fullWidth sx={{ mb: 2 }}>
            <MenuItem value="ALL">All types</MenuItem>
            {Object.values(RESOURCE_TYPES).map((type) => <MenuItem key={type} value={type}>{type}</MenuItem>)}
          </TextField>
          <Stack spacing={2}>
            {Object.entries(groupedResources).map(([group, groupResources]) => (
              <Box key={group}>
                <Typography variant="overline" color="text.secondary">{group}</Typography>
                <Stack spacing={0.75}>
                  {groupResources.map((resource) => (
                    <Paper
                      key={resource.id}
                      elevation={0}
                      onClick={() => setSelectedResourceId(resource.id)}
                      sx={{
                        p: 1.25,
                        cursor: 'pointer',
                        border: 1,
                        borderColor: selectedResource?.id === resource.id ? 'primary.main' : 'divider',
                        bgcolor: selectedResource?.id === resource.id ? 'action.selected' : 'background.paper',
                        transition: 'transform 160ms ease, border-color 160ms ease',
                        '&:hover': { transform: 'translateY(-1px)', borderColor: 'primary.main' },
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" spacing={1}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={800} noWrap>{resource.resourceName}</Typography>
                          <Typography variant="caption" color="text.secondary" noWrap display="block">{resource.resourceKey}</Typography>
                        </Box>
                        <ResourceTypeBadge type={resource.resourceType} />
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              </Box>
            ))}
          </Stack>
        </Paper>

        <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', p: 2, minHeight: 560 }}>
          {!selectedResource ? (
            <EmptyState title="No resource selected" description="Choose a resource to view its registry detail." />
          ) : (
            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="h5">{selectedResource.resourceName}</Typography>
                    <ResourceTypeBadge type={selectedResource.resourceType} />
                    {!selectedResource.isActive && <Chip label="Inactive" size="small" color="warning" />}
                  </Stack>
                  <Typography variant="body2" color="text.secondary">{selectedResource.description}</Typography>
                </Box>
                {canManage && (
                  <Stack direction="row" spacing={1}>
                    <Tooltip title="Edit resource">
                      <IconButton onClick={() => openEdit(selectedResource)} aria-label="Edit resource">
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete resource">
                      <IconButton color="error" onClick={() => setDeletingResource(selectedResource)} aria-label="Delete resource">
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                )}
              </Stack>
              <Divider />
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
                {[
                  ['Resource key', selectedResource.resourceKey],
                  ['Group', selectedResource.resourceGroup],
                  ['Sequence', selectedResource.sequenceNo ?? 'None'],
                  ['Parent', selectedResource.parentResourceKey ?? 'None'],
                  ['HTTP method', selectedResource.httpMethod ?? 'None'],
                  ['API path', selectedResource.apiPath ?? 'None'],
                  ['Microservice', selectedResource.microservice ?? 'None'],
                  ['UI visible', selectedResource.isUiVisible ? 'Yes' : 'No'],
                ].map(([label, value]) => (
                  <Box key={label}>
                    <Typography variant="caption" color="text.secondary">{label}</Typography>
                    <Typography variant="body2" fontWeight={800}>{value}</Typography>
                  </Box>
                ))}
              </Box>
              <Divider />
              <Box>
                <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1 }}>Allowed permissions</Typography>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  {selectedResource.allowedPermissions.map((permission) => (
                    <PermissionChip key={permission.key} label={`${permission.key} · ${permission.label}`} selected />
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
        helperText="Each resource owns the permission keys that roles may grant."
        onClose={closeForm}
        maxWidth="md"
      >
        <ResourceForm
          initialValues={editingResource ? valuesFromResource(editingResource) : emptyResourceFormValues}
          loading={isSubmitting}
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
