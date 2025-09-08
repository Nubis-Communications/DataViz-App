import React, { useState } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  CloudUpload as UploadIcon,
  Explore as ExploreIcon,
  BarChart as ChartIcon,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

const drawerWidth = 280;

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/', description: 'Overview & insights' },
    { text: 'Data Upload', icon: <UploadIcon />, path: '/upload', description: 'Import your data' },
    { text: 'Data Explorer', icon: <ExploreIcon />, path: '/explorer', description: 'Explore & filter' },
    { text: 'Data Visualizer', icon: <ChartIcon />, path: '/visualization', description: 'Create charts' },
    { text: 'Advanced Analytics', icon: <AnalyticsIcon />, path: '/analytics', description: 'Deep analysis' },
  ];

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 3, pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #1f4e79 0%, #00a86b 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '1.2rem',
            }}
          >
            DV
          </Box>
          <Box>
            <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 700, lineHeight: 1.2 }}>
              DataViz
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
              Professional Platform
            </Typography>
          </Box>
        </Box>
      </Box>
      
      <Divider sx={{ mx: 2 }} />
      
      {/* Navigation */}
      <Box sx={{ flex: 1, px: 2, py: 2 }}>
        <List sx={{ '& .MuiListItem-root': { px: 0 } }}>
          {menuItems.map((item) => (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => handleNavigation(item.path)}
                sx={{
                  borderRadius: 2,
                  py: 1.5,
                  px: 2,
                  transition: 'all 0.2s ease-in-out',
                  '&.Mui-selected': {
                    backgroundColor: 'primary.main',
                    color: 'white',
                    boxShadow: '0 4px 12px rgba(31, 78, 121, 0.3)',
                    '&:hover': {
                      backgroundColor: 'primary.dark',
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'white',
                    },
                  },
                  '&:hover': {
                    backgroundColor: 'grey.50',
                    transform: 'translateX(4px)',
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: location.pathname === item.path ? 'white' : 'text.secondary',
                    minWidth: 40,
                    transition: 'color 0.2s ease-in-out',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text}
                  secondary={item.description}
                  primaryTypographyProps={{
                    fontWeight: location.pathname === item.path ? 600 : 500,
                    fontSize: '0.9rem',
                  }}
                  secondaryTypographyProps={{
                    fontSize: '0.75rem',
                    color: location.pathname === item.path ? 'rgba(255,255,255,0.8)' : 'text.disabled',
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
      
      <Divider sx={{ mx: 2 }} />
      
      {/* Settings */}
      <Box sx={{ p: 2 }}>
        <ListItemButton
          sx={{
            borderRadius: 2,
            py: 1.5,
            px: 2,
            '&:hover': {
              backgroundColor: 'grey.50',
            },
          }}
        >
          <ListItemIcon sx={{ color: 'text.secondary', minWidth: 40 }}>
            <SettingsIcon />
          </ListItemIcon>
          <ListItemText 
            primary="Settings"
            secondary="Preferences"
            primaryTypographyProps={{ fontWeight: 500, fontSize: '0.9rem' }}
            secondaryTypographyProps={{ fontSize: '0.75rem', color: 'text.disabled' }}
          />
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          color: 'text.primary',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
        }}
      >
        <Toolbar sx={{ py: 1 }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ 
              mr: 2, 
              display: { md: 'none' },
              color: 'text.primary',
              '&:hover': {
                backgroundColor: 'rgba(31, 78, 121, 0.08)',
              },
            }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" sx={{ 
              color: 'text.primary', 
              fontWeight: 600,
              fontSize: '1.1rem',
            }}>
              {menuItems.find(item => item.path === location.pathname)?.text || 'Dashboard'}
            </Typography>
            <Typography variant="caption" sx={{ 
              color: 'text.secondary',
              fontSize: '0.75rem',
            }}>
              {menuItems.find(item => item.path === location.pathname)?.description || 'Professional Data Visualization Platform'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#00a86b',
                animation: 'pulse 2s infinite',
                '@keyframes pulse': {
                  '0%': { opacity: 1 },
                  '50%': { opacity: 0.5 },
                  '100%': { opacity: 1 },
                },
              }}
            />
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
              System Online
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 4 },
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: '80px', // AppBar height
          minHeight: 'calc(100vh - 80px)',
          backgroundColor: 'background.default',
        }}
      >
        <Box
          sx={{
            maxWidth: '100%',
            mx: 'auto',
            '& > *': {
              animation: 'fadeIn 0.3s ease-in-out',
            },
            '@keyframes fadeIn': {
              '0%': { opacity: 0, transform: 'translateY(10px)' },
              '100%': { opacity: 1, transform: 'translateY(0)' },
            },
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default Layout; 