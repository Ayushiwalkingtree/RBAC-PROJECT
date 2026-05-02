import Brightness4Icon from '@mui/icons-material/Brightness4';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import EditIcon from '@mui/icons-material/Edit';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import {
  AppBar,
  Avatar,
  Box,
  Collapse,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useEffect, useMemo, useState, type PropsWithChildren, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { APP_CONFIG } from '@/shared/constants/app.constants';
import { PERMISSION_KEYS, RESOURCE_KEYS } from '@/shared/constants/permission.constants';
import { STORAGE_KEYS } from '@/shared/constants/storage.constants';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { AppButton } from '@/shared/components/AppButton';
import { useToast } from '@/shared/components/useToast';
import { usePermission } from '@/shared/hooks/usePermission';
import { navigationOrderService } from '@/shared/services/navigationOrder.service';
import { useThemeStore } from '@/shared/theme/theme.store';
import type { NavigationItem } from '@/shared/types/navigation.types';
import { NavigationIcon } from './NavigationIcon';

const drawerContentId = 'tenant-navigation';

const cloneNavigation = (items: NavigationItem[]): NavigationItem[] =>
  items.map((item) => ({
    ...item,
    children: cloneNavigation(item.children ?? []),
  }));

const findParentResourceKey = (
  items: NavigationItem[],
  targetId: string,
  parentResourceKey?: string,
): string | undefined | null => {
  for (const item of items) {
    if (item.id === targetId) {
      return parentResourceKey;
    }

    const childParent = findParentResourceKey(item.children ?? [], targetId, item.resourceKey);
    if (childParent !== null) {
      return childParent;
    }
  }

  return null;
};

const reorderItems = (items: NavigationItem[], activeId: string, overId: string): NavigationItem[] => {
  const oldIndex = items.findIndex((item) => item.id === activeId);
  const newIndex = items.findIndex((item) => item.id === overId);
  if (oldIndex < 0 || newIndex < 0) {
    return items;
  }

  return arrayMove(items, oldIndex, newIndex).map((item, index) => ({
    ...item,
    sequenceNo: (index + 1) * 10,
    order: (index + 1) * 10,
  }));
};

const reorderSiblingsInTree = (
  items: NavigationItem[],
  parentResourceKey: string | undefined,
  activeId: string,
  overId: string,
): NavigationItem[] => {
  if (!parentResourceKey) {
    return reorderItems(items, activeId, overId);
  }

  return items.map((item) => {
    if (item.resourceKey === parentResourceKey) {
      return {
        ...item,
        children: reorderItems(item.children ?? [], activeId, overId),
      };
    }

    return {
      ...item,
      children: reorderSiblingsInTree(item.children ?? [], parentResourceKey, activeId, overId),
    };
  });
};

type SortableNavItemProps = {
  item: NavigationItem;
  depth: number;
  expandedItems: Record<string, boolean>;
  activeParents: Set<string>;
  onToggleExpanded: (resourceKey: string) => void;
  renderChildren: (items: NavigationItem[], depth: number) => ReactNode;
};

const SortableNavItem = ({
  item,
  depth,
  expandedItems,
  activeParents,
  onToggleExpanded,
  renderChildren,
}: SortableNavItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const hasChildren = Boolean(item.children?.length);
  const isExpanded = expandedItems[item.resourceKey] ?? activeParents.has(item.resourceKey);

  return (
    <Box
      ref={setNodeRef}
      sx={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.55 : 1,
      }}
    >
      <ListItemButton
        component="div"
        sx={{
          borderRadius: 1,
          mb: 0.5,
          pl: 1.5 + depth * 2,
          border: isDragging ? 1 : 0,
          borderColor: 'primary.main',
          bgcolor: isDragging ? 'action.selected' : undefined,
          cursor: 'grab',
        }}
      >
        <Tooltip title="Drag to reorder navigation">
          <IconButton {...attributes} {...listeners} size="small" aria-label="Drag to reorder navigation" sx={{ mr: 1 }}>
            <DragIndicatorIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <ListItemIcon sx={{ minWidth: 34 }}>
          <NavigationIcon name={item.icon} />
        </ListItemIcon>
        <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 700 }} />
        {hasChildren && (
          <IconButton
            size="small"
            edge="end"
            aria-label={isExpanded ? 'Collapse navigation item' : 'Expand navigation item'}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onToggleExpanded(item.resourceKey);
            }}
          >
            {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </IconButton>
        )}
      </ListItemButton>
      {hasChildren && (
        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          {renderChildren(item.children ?? [], depth + 1)}
        </Collapse>
      )}
    </Box>
  );
};

export const AppShell = ({ children }: PropsWithChildren) => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isNavEditMode, setIsNavEditMode] = useState(false);
  const [draftNavigation, setDraftNavigation] = useState<NavigationItem[]>([]);
  const [isSavingNav, setIsSavingNav] = useState(false);
  const session = useAuthStore((state) => state.session);
  const logout = useAuthStore((state) => state.logout);
  const refreshSession = useAuthStore((state) => state.refreshSession);
  const cycleMode = useThemeStore((state) => state.cycleMode);
  const mode = useThemeStore((state) => state.mode);
  const { can } = usePermission();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>(() => {
    const stored = window.localStorage.getItem(STORAGE_KEYS.navExpanded);
    return stored ? (JSON.parse(stored) as Record<string, boolean>) : {};
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.navExpanded, JSON.stringify(expandedItems));
  }, [expandedItems]);

  useEffect(() => {
    if (!isNavEditMode) {
      setDraftNavigation(cloneNavigation(session?.navigation ?? []));
    }
  }, [isNavEditMode, session?.navigation]);

  const canEditNavigation =
    Boolean(session) &&
    (can(RESOURCE_KEYS.resourceManageApi, PERMISSION_KEYS.update) ||
      (session?.org.code === 'PLATFORM' &&
        session.user.roles.some((role) => role.toUpperCase().includes('SUPER ADMIN'))));

  const activeParents = useMemo(() => {
    const active = new Set<string>();
    const visit = (item: NavigationItem): boolean => {
      const childActive = item.children?.some(visit) ?? false;
      const selfActive = location.pathname === item.path;
      if (childActive) {
        active.add(item.resourceKey);
      }
      return selfActive || childActive;
    };

    session?.navigation.forEach(visit);
    return active;
  }, [location.pathname, session?.navigation]);

  const handleLogout = async () => {
    await logout();
    navigate(APP_CONFIG.loginRoute, { replace: true });
  };

  const toggleExpanded = (resourceKey: string) => {
    setExpandedItems((current) => ({ ...current, [resourceKey]: !current[resourceKey] }));
  };

  const handleStartEditMode = () => {
    setDraftNavigation(cloneNavigation(session?.navigation ?? []));
    setIsNavEditMode(true);
  };

  const handleCancelEditMode = () => {
    setDraftNavigation(cloneNavigation(session?.navigation ?? []));
    setIsNavEditMode(false);
  };

  const handleSaveNavigation = async () => {
    setIsSavingNav(true);
    try {
      await navigationOrderService.persistNavigationOrder(draftNavigation);
      await refreshSession();
      setIsNavEditMode(false);
      showToast('Navigation order updated.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to update navigation order.', 'error');
    } finally {
      setIsSavingNav(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const activeParentKey = findParentResourceKey(draftNavigation, String(active.id));
    const overParentKey = findParentResourceKey(draftNavigation, String(over.id));

    if (activeParentKey !== overParentKey) {
      showToast('Move items within the same parent for now.', 'info');
      return;
    }

    setDraftNavigation((current) =>
      reorderSiblingsInTree(current, activeParentKey ?? undefined, String(active.id), String(over.id)),
    );
  };

  const renderNavigationItem = (item: NavigationItem, depth = 0) => {
    const hasChildren = Boolean(item.children?.length);
    const isExpanded = expandedItems[item.resourceKey] ?? activeParents.has(item.resourceKey);
    const isParentActive = activeParents.has(item.resourceKey);

    return (
      <Box key={item.id}>
        <ListItemButton
          component={NavLink}
          to={item.path}
          onClick={() => {
            if (!hasChildren) {
              setMobileOpen(false);
            }
          }}
          sx={{
            borderRadius: 1,
            mb: 0.5,
            pl: 1.5 + depth * 2,
            color: isParentActive ? 'primary.main' : undefined,
            bgcolor: isParentActive ? 'action.selected' : undefined,
            '&.active': {
              color: 'primary.main',
              bgcolor: 'action.selected',
              '& .MuiListItemIcon-root': { color: 'primary.main' },
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>
            <NavigationIcon name={item.icon} />
          </ListItemIcon>
          <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 700 }} />
          {hasChildren && (
            <IconButton
              size="small"
              edge="end"
              aria-label={isExpanded ? 'Collapse navigation item' : 'Expand navigation item'}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                toggleExpanded(item.resourceKey);
              }}
            >
              {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </IconButton>
          )}
        </ListItemButton>
        {hasChildren && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List disablePadding>
              {item.children?.map((child) => renderNavigationItem(child, depth + 1))}
            </List>
          </Collapse>
        )}
      </Box>
    );
  };

  const renderSortableNavigationItems = (items: NavigationItem[], depth = 0): ReactNode => (
    <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
      <List disablePadding>
        {items.map((item) => (
          <SortableNavItem
            key={item.id}
            item={item}
            depth={depth}
            expandedItems={expandedItems}
            activeParents={activeParents}
            onToggleExpanded={toggleExpanded}
            renderChildren={renderSortableNavigationItems}
          />
        ))}
      </List>
    </SortableContext>
  );

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2.5 }}>
        <Typography variant="h6">{APP_CONFIG.name}</Typography>
        <Typography variant="body2" color="text.secondary">
          {session?.org.name}
        </Typography>
      </Box>
      <Divider />
      <List id={drawerContentId} sx={{ px: 1.5, py: 2, flexGrow: 1 }}>
        {isNavEditMode ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            {renderSortableNavigationItems(draftNavigation)}
          </DndContext>
        ) : (
          session?.navigation.map((item) => renderNavigationItem(item))
        )}
      </List>
      <Divider />
      <Stack spacing={1.5} sx={{ p: 2 }}>
        {canEditNavigation && (
          isNavEditMode ? (
            <Stack direction="row" spacing={1}>
              <AppButton size="small" startIcon={<CheckIcon />} loading={isSavingNav} onClick={() => void handleSaveNavigation()}>
                Save
              </AppButton>
              <AppButton size="small" variant="outlined" color="inherit" startIcon={<CloseIcon />} onClick={handleCancelEditMode}>
                Cancel
              </AppButton>
            </Stack>
          ) : (
            <Tooltip title="Drag to reorder navigation">
              <span>
                <AppButton size="small" variant="outlined" startIcon={<EditIcon />} onClick={handleStartEditMode}>
                  Edit nav order
                </AppButton>
              </span>
            </Tooltip>
          )
        )}
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar>{session?.user.name.slice(0, 1)}</Avatar>
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Typography variant="body2" fontWeight={700} noWrap>
              {session?.user.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap display="block">
              {session?.user.title}
            </Typography>
          </Box>
        </Stack>
      </Stack>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          width: { lg: `calc(100% - ${APP_CONFIG.drawerWidth}px)` },
          ml: { lg: `${APP_CONFIG.drawerWidth}px` },
        }}
      >
        <Toolbar>
          {!isDesktop && (
            <IconButton
              edge="start"
              onClick={() => setMobileOpen(true)}
              aria-controls={drawerContentId}
              aria-label="Open navigation"
              sx={{ mr: 1 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {session?.org.code}
            </Typography>
            <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
              {session?.user.roles.join(', ')}
            </Typography>
          </Box>
          <Tooltip title={`Theme: ${mode}`}>
            <IconButton onClick={cycleMode} aria-label="Toggle theme">
              <Brightness4Icon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Sign out">
            <IconButton onClick={() => void handleLogout()} aria-label="Sign out">
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>
      <Box component="nav" sx={{ width: { lg: APP_CONFIG.drawerWidth }, flexShrink: { lg: 0 } }}>
        <Drawer
          variant={isDesktop ? 'permanent' : 'temporary'}
          open={isDesktop || mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              width: APP_CONFIG.drawerWidth,
              boxSizing: 'border-box',
              borderRight: 1,
              borderColor: 'divider',
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { lg: `calc(100% - ${APP_CONFIG.drawerWidth}px)` },
          minHeight: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <Toolbar />
        <Box sx={{ p: { xs: 2, md: 3 } }}>{children}</Box>
      </Box>
    </Box>
  );
};
