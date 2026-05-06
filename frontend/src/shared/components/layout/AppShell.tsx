import Brightness4Icon from '@mui/icons-material/Brightness4';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import EditIcon from '@mui/icons-material/Edit';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import SearchIcon from '@mui/icons-material/Search';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Collapse,
  Divider,
  Drawer,
  IconButton,
  InputBase,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
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
import { ROUTES } from '@/shared/constants/route.constants';
import { STORAGE_KEYS } from '@/shared/constants/storage.constants';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { AppButton } from '@/shared/components/AppButton';
import { useToast } from '@/shared/components/useToast';
import { usePermission } from '@/shared/hooks/usePermission';
import { filterNavigationByEffectivePermissions } from '@/shared/services/navigationAccess.service';
import { navigationOrderService } from '@/shared/services/navigationOrder.service';
import { getThemePreset } from '@/shared/theme/theme.constants';
import { useThemeStore } from '@/shared/theme/theme.store';
import type { NavigationItem } from '@/shared/types/navigation.types';
import { NavigationIcon } from './NavigationIcon';

const drawerContentId = 'tenant-navigation';
const sidebarBg = 'var(--ci-sidebar-bg, #182433)';
const sidebarText = 'var(--ci-sidebar-text, #cbd5e1)';
const sidebarMuted = '#94a3b8';
const sidebarActive = 'var(--ci-sidebar-active, #0054a6)';
const appInitials = APP_CONFIG.name
  .split(' ')
  .map((word) => word[0])
  .join('')
  .slice(0, 2)
  .toUpperCase();

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
          minHeight: 38,
          pl: 1.25 + depth * 2,
          border: isDragging ? 1 : 0,
          borderColor: 'rgba(255,255,255,0.22)',
          color: sidebarText,
          bgcolor: isDragging ? 'rgba(255,255,255,0.08)' : undefined,
          cursor: 'grab',
          '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
        }}
      >
        <Tooltip title="Drag to reorder navigation">
          <IconButton {...attributes} {...listeners} size="small" aria-label="Drag to reorder navigation" sx={{ mr: 1 }}>
            <DragIndicatorIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <ListItemIcon sx={{ minWidth: 34, color: 'inherit' }}>
          <NavigationIcon name={item.icon} />
        </ListItemIcon>
        <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 700, fontSize: '0.875rem' }} />
        {hasChildren && (
          <IconButton
            size="small"
            edge="end"
            sx={{ color: 'inherit' }}
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
  const [notificationAnchorEl, setNotificationAnchorEl] = useState<HTMLElement | null>(null);
  const [profileAnchorEl, setProfileAnchorEl] = useState<HTMLElement | null>(null);
  const session = useAuthStore((state) => state.session);
  const logout = useAuthStore((state) => state.logout);
  const refreshSession = useAuthStore((state) => state.refreshSession);
  const cycleMode = useThemeStore((state) => state.cycleMode);
  const mode = useThemeStore((state) => state.mode);
  const selectedPreset = getThemePreset(mode);
  const { can } = usePermission();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const userInitials = (session?.user.name ?? 'U')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const userRoleText = session?.user.roles[0] ?? session?.org.code ?? '';
  const notifications = [
    { id: 'role-update', title: 'Role permissions refreshed', time: 'Just now' },
    { id: 'session', title: 'New admin session detected', time: '12 min ago' },
    { id: 'nav-order', title: 'Navigation order saved', time: 'Today' },
  ];
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>(() => {
    const stored = window.localStorage.getItem(STORAGE_KEYS.navExpanded);
    return stored ? (JSON.parse(stored) as Record<string, boolean>) : {};
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.navExpanded, JSON.stringify(expandedItems));
  }, [expandedItems]);

  const visibleNavigation = useMemo(
    () => filterNavigationByEffectivePermissions(session?.navigation ?? [], session?.permissions ?? {}),
    [session?.navigation, session?.permissions],
  );

  useEffect(() => {
    if (!isNavEditMode) {
      setDraftNavigation(cloneNavigation(visibleNavigation));
    }
  }, [isNavEditMode, visibleNavigation]);

  const canEditNavigation =
    Boolean(session) &&
    (can(RESOURCE_KEYS.resourceManageApi, PERMISSION_KEYS.update) ||
      can(RESOURCE_KEYS.navOrderMenu, PERMISSION_KEYS.view));

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

    visibleNavigation.forEach(visit);
    return active;
  }, [location.pathname, visibleNavigation]);

  const handleLogout = async () => {
    setProfileAnchorEl(null);
    await logout();
    navigate(APP_CONFIG.loginRoute, { replace: true });
  };

  const handleOpenSettings = () => {
    setProfileAnchorEl(null);
    navigate(ROUTES.settings);
  };

  const toggleExpanded = (resourceKey: string) => {
    setExpandedItems((current) => ({ ...current, [resourceKey]: !current[resourceKey] }));
  };

  const handleStartEditMode = () => {
    navigate(ROUTES.navigationOrder);
  };

  const handleCancelEditMode = () => {
    setDraftNavigation(cloneNavigation(visibleNavigation));
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
            mx: 1,
            mb: 0.35,
            minHeight: 38,
            pl: 1.25 + depth * 2,
            color: isParentActive ? '#ffffff' : sidebarText,
            bgcolor: isParentActive ? sidebarActive : 'transparent',
            transition: 'background-color 140ms ease, color 140ms ease',
            '&:hover': {
              bgcolor: isParentActive ? sidebarActive : 'rgba(255,255,255,0.08)',
              color: '#ffffff',
              '& .MuiListItemIcon-root': { color: '#ffffff' },
            },
            '&.active': {
              color: '#ffffff',
              bgcolor: sidebarActive,
              '& .MuiListItemIcon-root': { color: '#ffffff' },
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 34, color: 'inherit' }}>
            <NavigationIcon name={item.icon} />
          </ListItemIcon>
          <ListItemText
            primary={item.label}
            primaryTypographyProps={{
              fontWeight: 700,
              fontSize: '0.875rem',
              noWrap: true,
            }}
          />
          {hasChildren && (
            <IconButton
              size="small"
              edge="end"
              sx={{ color: 'inherit' }}
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
    <Box
      sx={{
        '--ci-sidebar-bg': selectedPreset.sidebar,
        '--ci-sidebar-active': selectedPreset.primary,
        '--ci-sidebar-text': selectedPreset.id === 'dark' ? '#cbd5e1' : '#cbd5e1',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 0,
        bgcolor: sidebarBg,
        color: sidebarText,
      }}
    >
      <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <Stack direction="row" spacing={1.25} alignItems="center">
          <Avatar
            variant="rounded"
            sx={{
              width: 38,
              height: 38,
              bgcolor: sidebarActive,
              color: '#ffffff',
              fontSize: '0.875rem',
              fontWeight: 900,
            }}
          >
            {appInitials}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" noWrap sx={{ color: '#ffffff', fontWeight: 800 }}>
              {APP_CONFIG.name}
            </Typography>
            <Typography variant="caption" noWrap display="block" sx={{ color: sidebarMuted }}>
              {session?.org.name}
            </Typography>
          </Box>
        </Stack>
      </Box>
      <List id={drawerContentId} sx={{ py: 1.25, flexGrow: 1, overflowY: 'auto' }}>
        {isNavEditMode ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            {renderSortableNavigationItems(draftNavigation)}
          </DndContext>
        ) : (
          visibleNavigation.map((item) => renderNavigationItem(item))
        )}
      </List>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />
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
        <Stack
          direction="row"
          spacing={1.25}
          alignItems="center"
          sx={{
            p: 1,
            borderRadius: 1,
            bgcolor: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <Avatar sx={{ width: 34, height: 34, bgcolor: '#334155', color: '#ffffff', fontWeight: 800 }}>
            {session?.user.name.slice(0, 1)}
          </Avatar>
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Typography variant="body2" fontWeight={700} noWrap sx={{ color: '#ffffff' }}>
              {session?.user.name}
            </Typography>
            <Typography variant="caption" noWrap display="block" sx={{ color: sidebarMuted }}>
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
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
          width: { lg: `calc(100% - ${APP_CONFIG.drawerWidth}px)` },
          ml: { lg: `${APP_CONFIG.drawerWidth}px` },
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 58, sm: 62 }, gap: 2 }}>
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
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Box
              sx={{
                display: { xs: 'none', md: 'flex' },
                alignItems: 'center',
                maxWidth: 420,
                mx: 'auto',
                height: 38,
                px: 1.5,
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                bgcolor: 'background.default',
                color: 'text.secondary',
              }}
            >
              <SearchIcon fontSize="small" sx={{ mr: 1 }} />
              <InputBase
                placeholder="Search"
                inputProps={{ 'aria-label': 'Search' }}
                sx={{ flex: 1, fontSize: '0.875rem' }}
              />
            </Box>
            <Box sx={{ display: { xs: 'block', md: 'none' } }}>
              <Typography variant="body2" color="text.secondary">
                {session?.org.code}
              </Typography>
              <Typography variant="subtitle1" sx={{ lineHeight: 1.2 }} noWrap>
                {session?.user.roles.join(', ')}
              </Typography>
            </Box>
          </Box>
          <Tooltip title={`Theme: ${mode}`}>
            <IconButton onClick={cycleMode} aria-label="Toggle theme">
              <Brightness4Icon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Notifications">
            <IconButton
              aria-label="Notifications"
              onClick={(event) => setNotificationAnchorEl(event.currentTarget)}
              sx={{ width: 36, height: 36 }}
            >
              <Badge
                color="error"
                variant="dot"
                overlap="circular"
                sx={{
                  '& .MuiBadge-badge': {
                    width: 8,
                    minWidth: 8,
                    height: 8,
                    borderRadius: '50%',
                    border: '2px solid',
                    borderColor: 'background.paper',
                  },
                }}
              >
                <NotificationsNoneIcon fontSize="small" />
              </Badge>
            </IconButton>
          </Tooltip>
          <Box
            component="button"
            type="button"
            onClick={(event) => setProfileAnchorEl(event.currentTarget)}
            aria-label="Open profile menu"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              minHeight: 38,
              px: { xs: 0.25, sm: 0.75 },
              py: 0.25,
              border: 0,
              borderRadius: 1,
              bgcolor: 'transparent',
              color: 'text.primary',
              cursor: 'pointer',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: '0.8125rem', fontWeight: 800 }}>
              {userInitials}
            </Avatar>
            <Box sx={{ display: { xs: 'none', sm: 'block' }, minWidth: 0, textAlign: 'left' }}>
              <Typography variant="body2" fontWeight={800} noWrap sx={{ lineHeight: 1.15 }}>
                {session?.user.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap display="block" sx={{ lineHeight: 1.15 }}>
                {userRoleText}
              </Typography>
            </Box>
          </Box>
        </Toolbar>
      </AppBar>
      <Menu
        anchorEl={notificationAnchorEl}
        open={Boolean(notificationAnchorEl)}
        onClose={() => setNotificationAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              width: 320,
              mt: 1,
              border: 1,
              borderColor: 'divider',
              boxShadow: selectedPreset.id === 'dark'
                ? '0 12px 32px rgba(0,0,0,0.4)'
                : '0 12px 32px rgba(24, 36, 51, 0.14)',
            },
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.25 }}>
          <Typography variant="subtitle1" fontWeight={800}>
            Notifications
          </Typography>
        </Box>
        <Divider />
        {notifications.map((notification) => (
          <MenuItem key={notification.id} sx={{ py: 1.25, alignItems: 'flex-start' }}>
            <Stack direction="row" spacing={1.25} alignItems="flex-start" sx={{ width: '100%' }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  mt: 0.75,
                  borderRadius: '50%',
                  bgcolor: 'error.main',
                  flexShrink: 0,
                }}
              />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" fontWeight={700} noWrap>
                  {notification.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {notification.time}
                </Typography>
              </Box>
            </Stack>
          </MenuItem>
        ))}
        <Divider />
        <MenuItem onClick={() => setNotificationAnchorEl(null)} sx={{ justifyContent: 'center', color: 'primary.main', fontWeight: 800 }}>
          View all
        </MenuItem>
      </Menu>
      <Menu
        anchorEl={profileAnchorEl}
        open={Boolean(profileAnchorEl)}
        onClose={() => setProfileAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              width: 220,
              mt: 1,
              border: 1,
              borderColor: 'divider',
              boxShadow: selectedPreset.id === 'dark'
                ? '0 12px 32px rgba(0,0,0,0.4)'
                : '0 12px 32px rgba(24, 36, 51, 0.14)',
            },
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="body2" fontWeight={800} noWrap>
            {session?.user.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap display="block">
            {session?.org.name}
          </Typography>
        </Box>
        <Divider />
        <MenuItem disabled>
          <ListItemIcon>
            <PersonOutlineIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Profile" />
        </MenuItem>
        <MenuItem onClick={handleOpenSettings}>
          <ListItemIcon>
            <SettingsOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Settings" />
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => void handleLogout()}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Sign out" />
        </MenuItem>
      </Menu>
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
              borderRight: 0,
              borderRadius: 0,
              bgcolor: selectedPreset.sidebar,
            },
          }}
          PaperProps={{
            sx: {
              borderRadius: 0,
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
        <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1440, mx: 'auto' }}>{children}</Box>
      </Box>
    </Box>
  );
};
