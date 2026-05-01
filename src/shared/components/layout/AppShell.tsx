import Brightness4Icon from '@mui/icons-material/Brightness4';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import {
  AppBar,
  Avatar,
  Box,
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
import { useState, type PropsWithChildren } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { APP_CONFIG } from '@/shared/constants/app.constants';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { useThemeStore } from '@/shared/theme/theme.store';
import { NavigationIcon } from './NavigationIcon';

const drawerContentId = 'tenant-navigation';

export const AppShell = ({ children }: PropsWithChildren) => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const session = useAuthStore((state) => state.session);
  const logout = useAuthStore((state) => state.logout);
  const cycleMode = useThemeStore((state) => state.cycleMode);
  const mode = useThemeStore((state) => state.mode);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate(APP_CONFIG.loginRoute, { replace: true });
  };

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
        {session?.navigation.map((item) => (
          <ListItemButton
            key={item.id}
            component={NavLink}
            to={item.path}
            onClick={() => setMobileOpen(false)}
            sx={{
              borderRadius: 1,
              mb: 0.5,
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
          </ListItemButton>
        ))}
      </List>
      <Divider />
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ p: 2 }}>
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
            <IconButton onClick={handleLogout} aria-label="Sign out">
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
