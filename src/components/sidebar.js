import React from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  //IconButton,
  useTheme,
  Switch,
  //Typography,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SecurityIcon from '@mui/icons-material/Security';
import SpeedIcon from '@mui/icons-material/Speed';
import ErrorIcon from '@mui/icons-material/Error';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import SettingsIcon from '@mui/icons-material/Settings';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import logoImage from '../assets/images/vg-logo.png';

const drawerWidth = 240;

const Sidebar = ({ toggleTheme, isDarkMode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Forensic Analysis', icon: <AssessmentIcon />, path: '/logs' },
    { text: 'Advanced Analytics', icon: <AnalyticsIcon />, path: '/analytics' },
    { text: 'Performance Dashboard', icon: <SpeedIcon />, path: '/performance-dashboard' },
    { text: 'Security Score', icon: <SecurityIcon />, path: '/security-score' },
    { text: 'Major Logs', icon: <ErrorIcon />, path: '/major-logs' },
  ];

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          backgroundColor: theme.palette.mode === 'dark' ? '#1e1e1e' : '#f5f5f5',
          borderRight: `1px solid ${theme.palette.divider}`,
        },
      }}
    >
      <Box 
        sx={{ 
          p: 2, 
          display: 'flex', 
          justifyContent: 'center',
          backgroundColor: theme.palette.mode === 'dark' ? '#272727' : 'white',
        }}
      >
        <img
          src={logoImage}
          alt="VGI Logo"
          style={{ 
            width: '200px', 
            height: 'auto',
            margin: '20px 0',
            filter: theme.palette.mode === 'dark' ? 'brightness(0.8)' : 'none'
          }}
        />
      </Box>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem
            button
            key={item.text}
            onClick={() => navigate(item.path)}
            selected={location.pathname === item.path}
            sx={{
              my: 0.5,
              '&.Mui-selected': {
                backgroundColor: 'primary.main',
                color: 'white',
                '&:hover': {
                  backgroundColor: 'primary.dark',
                },
                '& .MuiListItemIcon-root': {
                  color: 'white',
                },
              },
              '&:hover': {
                backgroundColor: theme.palette.mode === 'dark' 
                  ? 'rgba(255, 255, 255, 0.08)'
                  : 'rgba(25, 118, 210, 0.08)',
              },
            }}
          >
            <ListItemIcon
              sx={{
                color: location.pathname === item.path ? 'white' : 'inherit',
                minWidth: 40,
              }}
            >
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
      <Divider />
      <Box
        sx={{
          p: 2,
          position: 'fixed',
          bottom: 0,
          width: drawerWidth,
          borderTop: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.mode === 'dark' ? '#1e1e1e' : '#f5f5f5',
        }}
      >
        <ListItem>
          <ListItemIcon>
            <SettingsIcon />
          </ListItemIcon>
          <ListItemText primary="Theme" />
          <Switch
            checked={isDarkMode}
            onChange={toggleTheme}
            color="primary"
            icon={<Brightness7Icon />}
            checkedIcon={<Brightness4Icon />}
          />
        </ListItem>
      </Box>
    </Drawer>
  );
};

export default Sidebar;