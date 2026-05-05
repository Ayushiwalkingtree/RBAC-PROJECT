import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
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
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppButton } from '@/shared/components/AppButton';
import { AppDialog } from '@/shared/components/AppDialog';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { EmptyState } from '@/shared/components/EmptyState';
import { PageHeader } from '@/shared/components/PageHeader';
import { PermissionChip } from '@/shared/components/PermissionChip';
import { useToast } from '@/shared/components/useToast';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { usePermission } from '@/shared/hooks/usePermission';
import { ResourceForm } from '@/features/resources/ResourceForm';
import { emptyResourceFormValues, valuesFromResource } from '@/features/resources/resourceForm.utils';
import { resourceService } from '@/features/resources/resource.service';
import { PERMISSION_KEYS, RESOURCE_KEYS, RESOURCE_TYPES } from '@/shared/constants/permission.constants';
import {
  buildBusinessPermissionRows,
  buildTechnicalPermissionRows,
  getTechnicalSummary,
} from '@/shared/adapters/rbacDisplay.adapter';
import type { BusinessPermissionRow } from '@/shared/adapters/rbacDisplay.adapter';
import type { ResourceFormValues } from '@/features/resources/resource.schema';
import type { ResourceRecord } from '@/shared/types/rbac.types';
import type { NavigationItem } from '@/shared/types/navigation.types';

const navigableTypes = new Set<string>([
  RESOURCE_TYPES.menu,
  RESOURCE_TYPES.page,
  RESOURCE_TYPES.report,
  RESOURCE_TYPES.dashboard,
]);

const canManageResources = (
  sessionOrgCode?: string,
  roles: string[] = [],
): boolean =>
  sessionOrgCode === 'PLATFORM' &&
  roles.some((role) => role.toUpperCase().replace(/[\s-]+/g, '_') === 'SUPER_ADMIN');

const flattenNavigationKeys = (items: NavigationItem[]): Set<string> =>
  items.reduce((keys, item) => {
    keys.add(item.resourceKey);
    flattenNavigationKeys(item.children ?? []).forEach((key) => keys.add(key));
    return keys;
  }, new Set<string>());

type SortableNavigationRowProps = {
  resource: ResourceRecord;
  parentOptions: ResourceRecord[];
  onParentChange: (resourceId: string, parentResourceKey: string) => void;
};

const SortableNavigationRow = ({ resource, parentOptions, onParentChange }: SortableNavigationRowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: resource.id });

  return (
    <Paper
      ref={setNodeRef}
      elevation={0}
      sx={{
        border: 1,
        borderColor: 'divider',
        p: 1.25,
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }}>
        <IconButton {...attributes} {...listeners} aria-label="Drag navigation item" size="small">
          <DragIndicatorIcon fontSize="small" />
        </IconButton>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="body2" fontWeight={900} noWrap>
            {resource.displayName ?? resource.resourceName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Sequence {resource.sequenceNo ?? 9999}
          </Typography>
        </Box>
        <TextField
          select
          label="Parent"
          value={resource.parentResourceKey ?? ''}
          onChange={(event) => onParentChange(resource.id, event.target.value)}
          size="small"
          sx={{ minWidth: 240 }}
        >
          <MenuItem value="">Top level</MenuItem>
          {parentOptions
            .filter((parent) => parent.resourceKey !== resource.resourceKey)
            .map((parent) => (
              <MenuItem key={parent.resourceKey} value={parent.resourceKey}>
                {parent.displayName ?? parent.resourceName}
              </MenuItem>
            ))}
        </TextField>
      </Stack>
    </Paper>
  );
};

export const ResourceRegistryPage = () => {
  const session = useAuthStore((state) => state.session);
  const refreshSession = useAuthStore((state) => state.refreshSession);
  const { can } = usePermission();
  const { showToast } = useToast();
  const [resources, setResources] = useState<ResourceRecord[]>([]);
  const [selectedRowId, setSelectedRowId] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [showTechnicalResources, setShowTechnicalResources] = useState(false);
  const [navigationOrderMode, setNavigationOrderMode] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<ResourceRecord | null>(null);
  const [deletingResource, setDeletingResource] = useState<ResourceRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const isPlatformSuperAdmin =
    canManageResources(session?.org.code, session?.user.roles);
  const canReadResources =
    can(RESOURCE_KEYS.resourceManageApi, PERMISSION_KEYS.read) ||
    can(RESOURCE_KEYS.resourceRegistryMenu, PERMISSION_KEYS.view);
  const canCreateResource = can(RESOURCE_KEYS.resourceManageApi, PERMISSION_KEYS.create);
  const canUpdateResource = can(RESOURCE_KEYS.resourceManageApi, PERMISSION_KEYS.update);
  const canDeleteResource = can(RESOURCE_KEYS.resourceManageApi, PERMISSION_KEYS.delete);
  const canManageNavigationOrder =
    can(RESOURCE_KEYS.navOrderMenu, PERMISSION_KEYS.view) &&
    can(RESOURCE_KEYS.navOrderApi, PERMISSION_KEYS.update);
  const isPlatform = session?.org.code === 'PLATFORM';
  const visibleNavigationKeys = useMemo(
    () => flattenNavigationKeys(session?.navigation ?? []),
    [session?.navigation],
  );
  const parentResources = resources.filter(
    (resource) => resource.resourceType === RESOURCE_TYPES.menu && resource.isActive,
  );
  const visibleParentResources = parentResources.filter((resource) => visibleNavigationKeys.has(resource.resourceKey));
  const navResources = useMemo(
    () =>
      resources
        .filter((resource) => resource.isActive && resource.isUiVisible && navigableTypes.has(resource.resourceType))
        .filter((resource) => visibleNavigationKeys.has(resource.resourceKey))
        .sort((current, next) => (current.sequenceNo ?? 9999) - (next.sequenceNo ?? 9999)),
    [resources, visibleNavigationKeys],
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

  const loadResources = useCallback(async () => {
    if (!canReadResources) {
      setResources([]);
      return;
    }
    const nextResources = await resourceService.listResources();
    setResources(nextResources);
  }, [canReadResources]);

  useEffect(() => {
    void loadResources();
  }, [loadResources]);

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
    if (!session) return;

    setIsSubmitting(true);
    try {
      if (editingResource) {
        await resourceService.updateResource(editingResource.id, values, {
          isPlatformSuperAdmin,
          userId: session.user.id,
          email: session.user.email,
        });
        showToast('Resource updated.');
      } else {
        const created = await resourceService.createResource(values, {
          isPlatformSuperAdmin,
          userId: session.user.id,
          email: session.user.email,
        });
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
      await resourceService.deleteResource(deletingResource.id, {
        isPlatformSuperAdmin,
        userId: session?.user.id,
        email: session?.user.email,
      });
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

  const persistNavigationUpdates = async (
    updates: Array<Pick<ResourceRecord, 'id' | 'parentResourceKey' | 'sequenceNo'>>,
  ) => {
    try {
      const nextResources = await resourceService.updateNavigationOrder(updates);
      setResources(nextResources);
      await refreshSession();
      showToast('Navigation order updated.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to update navigation order.', 'error');
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = navResources.findIndex((resource) => resource.id === active.id);
    const newIndex = navResources.findIndex((resource) => resource.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(navResources, oldIndex, newIndex);
    void persistNavigationUpdates(
      reordered.map((resource, index) => ({
        id: resource.id,
        parentResourceKey: resource.parentResourceKey,
        sequenceNo: (index + 1) * 10,
      })),
    );
  };

  const handleParentChange = (resourceId: string, parentResourceKey: string) => {
    const resource = resources.find((candidate) => candidate.id === resourceId);
    if (!resource) return;

    void persistNavigationUpdates([
      {
        id: resource.id,
        parentResourceKey: parentResourceKey || undefined,
        sequenceNo: resource.sequenceNo,
      },
    ]);
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
          {canManageNavigationOrder && (
            <FormControlLabel
              control={<Switch checked={navigationOrderMode} onChange={(_, checked) => setNavigationOrderMode(checked)} />}
              label="Navigation Order"
            />
          )}
          {canCreateResource && (
            <AppButton startIcon={<AddIcon />} onClick={openCreate}>
              Create Resource
            </AppButton>
          )}
        </Stack>
      </PageHeader>

      {navigationOrderMode ? (
        <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', p: 2 }}>
          <Typography variant="h6" sx={{ mb: 0.5 }}>Navigation Order</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Drag items to reorder. Use the parent dropdown to nest an item under an active menu.
          </Typography>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={navResources.map((resource) => resource.id)} strategy={verticalListSortingStrategy}>
              <Stack spacing={1}>
                {navResources.map((resource) => (
                  <SortableNavigationRow
                    key={resource.id}
                    resource={resource}
                    parentOptions={visibleParentResources}
                    onParentChange={handleParentChange}
                  />
                ))}
              </Stack>
            </SortableContext>
          </DndContext>
        </Paper>
      ) : (
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
                {primaryResource && (showTechnicalResources || selectedRow.technicalResourceKeys.length === 1) && (
                  <Stack direction="row" spacing={1}>
                    {canUpdateResource && (
                      <Tooltip title="Edit resource">
                        <IconButton onClick={() => openEdit(primaryResource)} aria-label="Edit resource">
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    {canDeleteResource && (
                      <Tooltip title="Delete resource">
                        <IconButton color="error" onClick={() => setDeletingResource(primaryResource)} aria-label="Delete resource">
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    )}
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
      )}

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
