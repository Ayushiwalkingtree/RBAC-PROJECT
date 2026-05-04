import SaveIcon from '@mui/icons-material/Save';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { Alert, Box, CircularProgress, IconButton, Paper, Stack, Typography } from '@mui/material';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useEffect, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { AppButton } from '@/shared/components/AppButton';
import { EmptyState } from '@/shared/components/EmptyState';
import { PageHeader } from '@/shared/components/PageHeader';
import { useToast } from '@/shared/components/useToast';
import { navigationOrderService } from '@/shared/services/navigationOrder.service';
import type { NavigationItem } from '@/shared/types/navigation.types';

type SortableNavigationItemProps = {
  item: NavigationItem;
  depth: number;
  renderChildren: (items: NavigationItem[], depth: number) => ReactNode;
};

const SortableNavigationItem = ({ item, depth, renderChildren }: SortableNavigationItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  return (
    <Box ref={setNodeRef} sx={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.55 : 1 }}>
      <Paper elevation={0} sx={{ border: 1, borderColor: isDragging ? 'primary.main' : 'divider', p: 1.25, mb: 0.75 }}>
        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ pl: depth * 2 }}>
          <IconButton {...attributes} {...listeners} size="small" aria-label="Drag navigation item">
            <DragIndicatorIcon fontSize="small" />
          </IconButton>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={900}>{item.label}</Typography>
            <Typography variant="caption" color="text.secondary">
              {item.resourceKey} | Sequence {item.sequenceNo}
            </Typography>
          </Box>
        </Stack>
      </Paper>
      {item.children?.length ? renderChildren(item.children, depth + 1) : null}
    </Box>
  );
};

const reorderItems = (items: NavigationItem[], activeId: string, overId: string): NavigationItem[] => {
  const oldIndex = items.findIndex((item) => item.id === activeId);
  const newIndex = items.findIndex((item) => item.id === overId);
  if (oldIndex < 0 || newIndex < 0) return items;
  return arrayMove(items, oldIndex, newIndex).map((item, index) => ({
    ...item,
    sequenceNo: (index + 1) * 10,
    order: (index + 1) * 10,
  }));
};

const findParentResourceKey = (
  items: NavigationItem[],
  targetId: string,
  parentResourceKey?: string,
): string | undefined | null => {
  for (const item of items) {
    if (item.id === targetId) return parentResourceKey;
    const childParent = findParentResourceKey(item.children ?? [], targetId, item.resourceKey);
    if (childParent !== null) return childParent;
  }
  return null;
};

const reorderSiblingsInTree = (
  items: NavigationItem[],
  parentResourceKey: string | undefined,
  activeId: string,
  overId: string,
): NavigationItem[] => {
  if (!parentResourceKey) return reorderItems(items, activeId, overId);
  return items.map((item) => {
    if (item.resourceKey === parentResourceKey) {
      return { ...item, children: reorderItems(item.children ?? [], activeId, overId) };
    }
    return { ...item, children: reorderSiblingsInTree(item.children ?? [], parentResourceKey, activeId, overId) };
  });
};

export const NavigationOrderPage = () => {
  const refreshSession = useAuthStore((state) => state.refreshSession);
  const session = useAuthStore((state) => state.session);
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('userId');
  const userLabel = searchParams.get('userLabel');
  const isUserMode = Boolean(userId);
  const [navigation, setNavigation] = useState<NavigationItem[]>([]);
  const [draftNavigation, setDraftNavigation] = useState<NavigationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const loadNavigation = async () => {
    setIsLoading(true);
    try {
      const tree = userId
        ? await navigationOrderService.getUserNavigationTree(userId)
        : await navigationOrderService.getNavigationTree();
      setNavigation(tree);
      setDraftNavigation(tree);
      setIsDirty(false);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to load navigation order.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadNavigation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeParent = findParentResourceKey(draftNavigation, String(active.id));
    const overParent = findParentResourceKey(draftNavigation, String(over.id));
    if (activeParent !== overParent) {
      showToast('Move items within the same parent for now.', 'info');
      return;
    }
    setDraftNavigation((current) => reorderSiblingsInTree(current, activeParent ?? undefined, String(active.id), String(over.id)));
    setIsDirty(true);
  };

  const saveNavigation = async () => {
    setIsSaving(true);
    try {
      if (userId) {
        await navigationOrderService.persistUserNavigationOrder(userId, draftNavigation);
      } else {
        await navigationOrderService.persistNavigationOrder(draftNavigation);
      }
      if (!isUserMode || userId === session?.user.id) {
        await refreshSession();
      }
      setNavigation(draftNavigation);
      setIsDirty(false);
      showToast('Navigation order updated.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to update navigation order.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const renderItems = (items: NavigationItem[], depth = 0): ReactNode => (
    <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
      {items.map((item) => (
        <SortableNavigationItem key={item.id} item={item} depth={depth} renderChildren={renderItems} />
      ))}
    </SortableContext>
  );

  return (
    <>
      <PageHeader
        title={isUserMode ? 'User Navigation Order' : 'Navigation Order'}
        subtitle={
          isUserMode
            ? `Customize visible sidebar order for ${userLabel || 'selected user'}.`
            : 'Reorder visible sidebar items without changing permissions.'
        }
      >
        <Stack direction="row" spacing={1}>
          <AppButton
            variant="outlined"
            startIcon={<RestartAltIcon />}
            disabled={!isDirty}
            onClick={() => {
              setDraftNavigation(navigation);
              setIsDirty(false);
            }}
          >
            Cancel
          </AppButton>
          <AppButton startIcon={<SaveIcon />} loading={isSaving} disabled={!isDirty} onClick={() => void saveNavigation()}>
            Save
          </AppButton>
        </Stack>
      </PageHeader>

      <Stack spacing={2}>
        {isUserMode && (
          <Alert severity="warning">
            User-specific navigation overrides can create inconsistent experience. Use sparingly.
          </Alert>
        )}
        <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', p: 2, minHeight: 520 }}>
        {isLoading ? (
          <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 460 }}>
            <CircularProgress />
          </Stack>
        ) : draftNavigation.length === 0 ? (
          <EmptyState title="No navigation items" description="Visible navigation resources will appear here." />
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <Stack spacing={0.25}>{renderItems(draftNavigation)}</Stack>
          </DndContext>
        )}
        </Paper>
      </Stack>
    </>
  );
};
