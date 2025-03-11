import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Divider,
  useTheme,
  Collapse,
  IconButton,
} from '@mui/material';
import { useState, useEffect } from 'react';
import LogoutIcon from '@mui/icons-material/Logout';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import PersonIcon from '@mui/icons-material/Person';
import MenuIcon from '@mui/icons-material/Menu';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { useNavigate, useLocation } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SpeedIcon from '@mui/icons-material/Speed';
import ErrorIcon from '@mui/icons-material/Error';
import AnalyticsIcon from '@mui/icons-material/Analytics';
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
import logoImage from '../assets/images/vg-logo.png';
import axios from 'axios';
import CircularProgress from '@mui/material/CircularProgress';

const drawerWidth = 240;

const Sidebar = ({ toggleTheme, isDarkMode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const [securityPolicyOpen, setSecurityPolicyOpen] = useState(false);
  const [threatIntelOpen, setThreatIntelOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleProfileClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    // Clear token and user info from localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('userInfo');
    // Redirect to login page
    navigate('/login');
    handleClose();
  };

  const handleProfile = () => {
    navigate('/profile');
    handleClose();
  };

  const getCurrentPageTitle = () => {
    const currentItem = [...menuItems, ...securityPolicyItems, ...threatIntelItems]
      .find(item => item.path === location.pathname);
    return currentItem ? currentItem.text : "Dashboard";
  };

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
    { text: 'Vulnerability Detection', icon: <BugReportIcon />, path: '/vulnerability' },
  ];

  // Fetch user profile on component mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          // Redirect to login if no token
          navigate('/login');
          return;
        }
  
        // Check if user info is already in localStorage
        const storedUserInfo = localStorage.getItem('userInfo');
        if (storedUserInfo) {
          setUserProfile(JSON.parse(storedUserInfo));
          setLoading(false);
          return;
        }
  
        // If not in localStorage, fetch from API
        const response = await axios.get('/api/auth/profile', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
  
        setUserProfile(response.data);
        // Store for future use
        localStorage.setItem('userInfo', JSON.stringify(response.data));
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
        // Handle token expiration
        if (error.response && error.response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('userInfo');
          navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };
  
    fetchUserProfile();
  }, [navigate]);

  return (
    <>
      {/* Header AppBar */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          backgroundColor: theme.palette.mode === 'dark' ? '#2A4364' : 'white',
          color: theme.palette.mode === 'dark' ? 'white' : 'primary.main',
          boxShadow: 1,
          height: '52px', // Reduced height
          minHeight: '52px' // Ensure minimum height
        }}
      >
        <Toolbar sx={{minHeight: '10px'}}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={toggleSidebar}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {getCurrentPageTitle()}
          </Typography>
          <IconButton onClick={toggleTheme} color="inherit">
            {isDarkMode ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Sidebar Drawer */}
      <Drawer
        variant="persistent"
        open={sidebarOpen}
        sx={{
          width: sidebarOpen ? drawerWidth : 0,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            backgroundColor: theme.palette.mode === 'dark' ? '#2A4364' : '#f5f5f5',
            borderRight: `1px solid ${theme.palette.divider}`,
            overflowX: 'hidden',
            transition: 'width 0.3s ease',
            paddingTop: '64px', // Add space for the AppBar
          },
        }}
      >
        <Box
          sx={{
            p: 2,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: theme.palette.mode === 'dark' ? '#2A4364' : 'white',
          }}
        >
          <img
            src={logoImage}
            alt="VGI Logo"
            style={{
              width: '180px',
              height: 'auto',
              margin: '0px 0',
              filter: theme.palette.mode === 'dark' ? 'brightness(0.8)' : 'none'
            }}
          />
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

        <Box
          sx={{
            p: 2,
            width: '100%',
            borderTop: `1px solid ${theme.palette.divider}`,
            backgroundColor: theme.palette.mode === 'dark' ? '#2A4364' : '#f5f5f5',
          }}
        >
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : userProfile ? (
            <ListItem
              button
              onClick={handleProfileClick}
              sx={{
                px: 1,
                borderRadius: 1,
                '&:hover': {
                  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(25, 118, 210, 0.08)',
                }
              }}
            >
              <ListItemIcon>
                <AccountCircleIcon fontSize="large" color="primary" />
              </ListItemIcon>
              <Box sx={{ ml: 1, overflow: 'hidden' }}>
                <Typography variant="subtitle2" noWrap sx={{ fontWeight: 'bold' }}>
                  {userProfile.fullName}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap display="block">
                  {userProfile.email}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: theme.palette.primary.main,
                    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(25, 118, 210, 0.2)' : 'rgba(25, 118, 210, 0.1)',
                    borderRadius: '4px',
                    padding: '2px 6px',
                    display: 'inline-block',
                    mt: 0.5
                  }}
                >
                  {userProfile.role}
                </Typography>
              </Box>
            </ListItem>
          ) : (
            <ListItem button onClick={() => navigate('/login')}>
              <ListItemIcon>
                <AccountCircleIcon />
              </ListItemIcon>
              <ListItemText primary="Login" />
            </ListItem>
          )}

          {/* Profile Menu */}
          <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={handleClose}
            onClick={handleClose}
            PaperProps={{
              elevation: 0,
              sx: {
                overflow: 'visible',
                filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                mt: 1.5,
                '& .MuiAvatar-root': {
                  width: 32,
                  height: 32,
                  ml: -0.5,
                  mr: 1,
                },
                '&:before': {
                  content: '""',
                  display: 'block',
                  position: 'absolute',
                  bottom: 0,
                  right: 14,
                  width: 10,
                  height: 10,
                  bgcolor: 'background.paper',
                  transform: 'translateY(50%) rotate(45deg)',
                  zIndex: 0,
                },
              },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem onClick={handleProfile}>
              <ListItemIcon>
                <PersonIcon fontSize="small" />
              </ListItemIcon>
              My Profile
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Box>
      </Drawer>
    </>
  );
};

export default Sidebar;