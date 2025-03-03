import React, { useState } from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme,
  Switch,
  Collapse,
  IconButton,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SpeedIcon from '@mui/icons-material/Speed';
import ErrorIcon from '@mui/icons-material/Error';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import SettingsIcon from '@mui/icons-material/Settings';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import PolicyIcon from '@mui/icons-material/Policy';
import BugReportIcon from '@mui/icons-material/BugReport';
import SearchIcon from '@mui/icons-material/Search';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import RadarIcon from '@mui/icons-material/Radar';
import GppBadIcon from '@mui/icons-material/GppBad';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import logoImage from '../assets/images/vg-logo.png';

const drawerWidth = 240;

const Sidebar = ({ toggleTheme, isDarkMode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const [securityPolicyOpen, setSecurityPolicyOpen] = useState(false);
  const [threatIntelOpen, setThreatIntelOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleSecurityPolicyClick = () => {
    setSecurityPolicyOpen(!securityPolicyOpen);
  };

  const handleThreatIntelClick = () => {
    setThreatIntelOpen(!threatIntelOpen);
  };
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const menuItems = [
    { text: 'Security Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Forensic Analysis', icon: <AssessmentIcon />, path: '/logs' },
    { text: 'Advanced Analytics', icon: <AnalyticsIcon />, path: '/analytics' },
    { text: 'Performance Dashboard', icon: <SpeedIcon />, path: '/performance-dashboard' },
    { text: 'Major Logs', icon: <ErrorIcon />, path: '/major-logs' },
    { text: 'Session Logs', icon: <SupervisorAccountIcon />, path: '/session-logs' },
  ];

  const securityPolicyItems = [
    { text: 'HIPAA', path: '/hipaa-dashboard' },
    { text: 'GDPR', path: '/gdpr-dashboard' },
    { text: 'NIST', path: '/nist-dashboard' },
    { text: 'PCI DSS', path: '/pcidss-dashboard' },
    { text: 'TSC', path: '/tsc-dashboard' },
  ];

  const threatIntelItems = [
    { text: 'MITRE ATT&CK', icon: <RadarIcon />, path: '/mitre-attack' },
    { text: 'Threat Hunting', icon: <SearchIcon />, path: '/threat-hunting' },
    { text: 'Vulnerability Detection', icon: <BugReportIcon />, path: '/vulnerability-detection' },
  ];

  return (
    <>
      {/* Toggle button when sidebar is closed */}
      {!sidebarOpen && (
        <IconButton 
          onClick={toggleSidebar}
          sx={{
            position: 'fixed',
            left: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            backgroundColor: theme.palette.primary.main,
            color: 'white',
            borderRadius: '0 4px 4px 0',
            '&:hover': {
              backgroundColor: theme.palette.primary.dark,
            },
            zIndex: 1200,
          }}
        >
          <ChevronRightIcon />
        </IconButton>
      )}
      
      <Drawer
        variant="persistent"
        open={sidebarOpen}
        sx={{
          width: sidebarOpen ? drawerWidth : 0,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            backgroundColor: theme.palette.mode === 'dark' ? '#1e1e1e' : '#f5f5f5',
            borderRight: `1px solid ${theme.palette.divider}`,
            overflowX: 'hidden',
            transition: 'width 0.3s ease',
          },
        }}
      >
        <Box
          sx={{
            p: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: theme.palette.mode === 'dark' ? '#272727' : 'white',
          }}
        >
          <img
            src={logoImage}
            alt="VGI Logo"
            style={{
              width: '180px',
              height: 'auto',
              margin: '20px 0',
              filter: theme.palette.mode === 'dark' ? 'brightness(0.8)' : 'none'
            }}
          />
          <IconButton onClick={toggleSidebar}>
            <ChevronLeftIcon />
          </IconButton>
        </Box>
        
        <Divider />
        
        {/* Make the main content area scrollable */}
        <Box sx={{ 
          overflowY: 'auto',
          height: 'calc(100% - 180px)', // Reserve space for bottom content
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: theme.palette.mode === 'dark' ? '#1e1e1e' : '#f1f1f1',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: theme.palette.mode === 'dark' ? '#555' : '#888',
            borderRadius: '3px',
          }
        }}>
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

            {/* Security Policy Dropdown */}
            <ListItem 
              button 
              onClick={handleSecurityPolicyClick}
              sx={{
                my: 0.5,
                backgroundColor: securityPolicyOpen ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
                '&:hover': {
                  backgroundColor: theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'rgba(25, 118, 210, 0.08)',
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <PolicyIcon />
              </ListItemIcon>
              <ListItemText primary="Security Policy" />
              {securityPolicyOpen ? <ExpandLess /> : <ExpandMore />}
            </ListItem>
            
            <Collapse in={securityPolicyOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {securityPolicyItems.map((item) => (
                  <ListItem
                    button
                    key={item.text}
                    onClick={() => navigate(item.path)}
                    selected={location.pathname === item.path}
                    sx={{
                      pl: 4,
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
                      <VerifiedUserIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={item.text} />
                  </ListItem>
                ))}
              </List>
            </Collapse>

            {/* Threat Intelligence Dropdown */}
            <ListItem 
              button 
              onClick={handleThreatIntelClick}
              sx={{
                my: 0.5,
                backgroundColor: threatIntelOpen ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
                '&:hover': {
                  backgroundColor: theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'rgba(25, 118, 210, 0.08)',
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <GppBadIcon />
              </ListItemIcon>
              <ListItemText primary="Threat Intelligence" />
              {threatIntelOpen ? <ExpandLess /> : <ExpandMore />}
            </ListItem>
            
            <Collapse in={threatIntelOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {threatIntelItems.map((item) => (
                  <ListItem
                    button
                    key={item.text}
                    onClick={() => navigate(item.path)}
                    selected={location.pathname === item.path}
                    sx={{
                      pl: 4,
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
            </Collapse>
          </List>
        </Box>
        
        <Divider />
        
        {/* Bottom content - now not fixed but at the bottom of drawer */}
        <Box
          sx={{
            p: 2,
            width: '100%',
            borderTop: `1px solid ${theme.palette.divider}`,
            backgroundColor: theme.palette.mode === 'dark' ? '#1e1e1e' : '#f5f5f5',
          }}
        >
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
            <img
              src={require('../assets/VG_logo.PNG')}
              alt="VG Logo"
              style={{
                width: '180px',
                height: 'auto',
                filter: theme.palette.mode === 'dark' ? 'brightness(0.8)' : 'none'
              }}
            />
          </Box>
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
    </>
  );
};

export default Sidebar;