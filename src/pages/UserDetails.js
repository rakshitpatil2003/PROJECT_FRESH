import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Container, Card, CardHeader, CardContent, Grid, CircularProgress,
  Alert, Typography, Box, Chip, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Divider, Tabs, Tab, Snackbar, MenuItem, Select,
  FormControl, InputLabel, FormHelperText, IconButton, DialogContentText,
  Paper, Avatar, Tooltip, useTheme
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { API_URL } from '../config';
import { StructuredLogView } from '../utils/normalizeLogs';
import RefreshIcon from '@mui/icons-material/Refresh';
import SecurityIcon from '@mui/icons-material/Security';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LockIcon from '@mui/icons-material/Lock';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import PersonIcon from '@mui/icons-material/Person';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PeopleIcon from '@mui/icons-material/People';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import BadgeIcon from '@mui/icons-material/Badge';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import BusinessIcon from '@mui/icons-material/Business';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

// TabPanel component for the tabs
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const UserDetails = () => {
  const theme = useTheme();
  
  // State variables
  const [user, setUser] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');

  // Dialog states
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [statusUpdateDialogOpen, setStatusUpdateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  
  // Password confirmation dialog state
  const [passwordConfirmDialog, setPasswordConfirmDialog] = useState(false);
  const [actionType, setActionType] = useState(null); // 'create' or 'delete'
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [targetUser, setTargetUser] = useState(null);

  // Form states
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    department: ''
  });
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [createUserForm, setCreateUserForm] = useState({
    username: '',
    password: '',
    fullName: '',
    email: '',
    phone: '',
    department: '',
    role: 'L1 Analyst',
    authority: 'read-only',
    plan: 'Privileged',
    planExpiryDate: ''
  });
  
  const [assignForm, setAssignForm] = useState({
    assignedToId: ''
  });
  
  const [statusUpdateForm, setStatusUpdateForm] = useState({
    status: '',
    description: ''
  });

  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Validation states
  const [passwordErrors, setPasswordErrors] = useState({});
  const [createUserErrors, setCreateUserErrors] = useState({});
  
  // Helper function to calculate remaining days
  const calculateRemainingDays = (expiryDate) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const timeDiff = expiry.getTime() - today.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  };

  // FETCH DATA FUNCTIONS
  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No authentication token found. Please login again.');
        setLoading(false);
        return;
      }
      
      const response = await axios.get(`${API_URL}/api/auth/profile`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      setUser(response.data);
      
      // Initialize profile form with user data
      setProfileForm({
        fullName: response.data.fullName || '',
        email: response.data.email || '',
        phone: response.data.phone || '',
        department: response.data.department || ''
      });
      
      setError(null);
    } catch (err) {
      setError('Failed to fetch user data. Please try again later.');
      console.error('Error fetching user data:', err);
    }
  };

  const fetchTickets = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await axios.get(`${API_URL}/api/auth/tickets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setTickets(response.data);
      setFilteredTickets(response.data);
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await axios.get(`${API_URL}/api/auth/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setUsers(response.data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  // Load all data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await fetchUserProfile();
        await fetchTickets();
        await fetchUsers();
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Filter tickets based on status
  useEffect(() => {
    if (tickets.length > 0) {
      if (statusFilter === 'all') {
        setFilteredTickets(tickets);
      } else {
        setFilteredTickets(tickets.filter(ticket => ticket.status === statusFilter));
      }
    }
  }, [statusFilter, tickets]);

  // FORM SUBMISSION HANDLERS
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      
      const response = await axios.patch(
        `${API_URL}/api/auth/profile`,
        profileForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update user data
      setUser(prev => ({
        ...prev,
        ...response.data.user
      }));
      
      // Close dialog and show success message
      setProfileDialogOpen(false);
      setSnackbar({
        open: true,
        message: 'Profile updated successfully',
        severity: 'success'
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || 'Failed to update profile',
        severity: 'error'
      });
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    // Validate passwords
    const errors = {};
    if (passwordForm.newPassword.length < 6) {
      errors.newPassword = 'Password must be at least 6 characters';
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      
      await axios.post(
        `${API_URL}/api/auth/change-password`,
        {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Reset form and close dialog
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setPasswordDialogOpen(false);
      
      // Show success message
      setSnackbar({
        open: true,
        message: 'Password changed successfully',
        severity: 'success'
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || 'Failed to change password',
        severity: 'error'
      });
    }
  };

  // Verify admin password before operations
  const verifyAdminPassword = async (password) => {
    try {
      setConfirming(true);
      
      const token = localStorage.getItem('token');
      
      const response = await axios.post(
        `${API_URL}/api/auth/verify-password`,
        { password },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      return { success: true };
    } catch (error) {
      console.error('Password verification failed:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Password verification failed'
      };
    } finally {
      setConfirming(false);
    }
  };

  // Admin password confirmation submit handler
  const handleConfirmPassword = async () => {
    if (!adminPassword) {
      setConfirmError('Password is required');
      return;
    }
    
    const result = await verifyAdminPassword(adminPassword);
    
    if (result.success) {
      // Close dialog and clear password
      setPasswordConfirmDialog(false);
      setAdminPassword('');
      setConfirmError('');
      
      // Perform the actual action
      if (actionType === 'create') {
        handleCreateUserSubmit();
      } else if (actionType === 'delete' && targetUser) {
        handleDeleteUser(targetUser._id);
      }
    } else {
      setConfirmError(result.message || 'Invalid password');
    }
  };

  // Trigger password confirmation before creating user
  const handleCreateUserClick = () => {
    setActionType('create');
    setTargetUser(null);
    setAdminPassword('');
    setConfirmError('');
    setPasswordConfirmDialog(true);
  };

  // Trigger password confirmation before deleting user
  const handleDeleteUserClick = (user) => {
    setActionType('delete');
    setTargetUser(user);
    setAdminPassword('');
    setConfirmError('');
    setPasswordConfirmDialog(true);
  };

  const handleCreateUserSubmit = async () => {
    // Validate form
    const errors = {};
    if (!createUserForm.username) errors.username = 'Username is required';
    if (!createUserForm.password) errors.password = 'Password is required';
    if (createUserForm.password && createUserForm.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    if (!createUserForm.role) errors.role = 'Role is required';
    if (!createUserForm.authority) errors.authority = 'Authority is required';
    if (!createUserForm.plan) errors.plan = 'Plan is required';
    if (!createUserForm.planExpiryDate) errors.planExpiryDate = 'Expiry date is required';
    
    if (Object.keys(errors).length > 0) {
      setCreateUserErrors(errors);
      setCreateUserDialogOpen(true);
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      
      await axios.post(
        `${API_URL}/api/auth/users`,
        createUserForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Reset form and close dialog
      setCreateUserForm({
        username: '',
        password: '',
        fullName: '',
        email: '',
        phone: '',
        department: '',
        role: 'L1 Analyst',
        authority: 'read-only',
        plan: 'Privileged',
        planExpiryDate: ''
      });
      setCreateUserDialogOpen(false);
      
      // Refresh users list
      fetchUsers();
      
      // Show success message
      setSnackbar({
        open: true,
        message: 'User created successfully',
        severity: 'success'
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || 'Failed to create user',
        severity: 'error'
      });
      setCreateUserDialogOpen(true);
    }
  };

  // Delete user function
  const handleDeleteUser = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      
      await axios.delete(
        `${API_URL}/api/auth/users/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Refresh users list
      fetchUsers();
      
      // Show success message
      setSnackbar({
        open: true,
        message: 'User deleted successfully',
        severity: 'success'
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || 'Failed to delete user',
        severity: 'error'
      });
    }
  };

  // TICKET ACTION HANDLERS
  const handleAssignTicket = async () => {
    if (!selectedTicket || !assignForm.assignedToId) return;
    
    try {
      const token = localStorage.getItem('token');
      
      await axios.patch(
        `${API_URL}/api/auth/tickets/${selectedTicket.ticketId}/assign`,
        { assignedToId: assignForm.assignedToId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Refresh tickets
      fetchTickets();
      
      // Close dialog
      setAssignDialogOpen(false);
      setSelectedTicket(null);
      
      // Show success message
      setSnackbar({
        open: true,
        message: 'Ticket assigned successfully',
        severity: 'success'
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || 'Failed to assign ticket',
        severity: 'error'
      });
    }
  };

  const handleUpdateTicketStatus = async () => {
    if (!selectedTicket || !statusUpdateForm.status) return;
    
    try {
      const token = localStorage.getItem('token');
      
      await axios.patch(
        `${API_URL}/api/auth/tickets/${selectedTicket.ticketId}/status`,
        statusUpdateForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Refresh tickets
      fetchTickets();
      
      // Close dialog
      setStatusUpdateDialogOpen(false);
      setSelectedTicket(null);
      
      // Show success message
      setSnackbar({
        open: true,
        message: `Ticket status updated to ${statusUpdateForm.status}`,
        severity: 'success'
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || 'Failed to update ticket status',
        severity: 'error'
      });
    }
  };

  // UI HANDLERS
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleStatusFilterChange = (event) => {
    setStatusFilter(event.target.value);
  };

  const handleRefreshData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchUserProfile(),
        fetchTickets(),
        fetchUsers()
      ]);
      
      setSnackbar({
        open: true,
        message: 'Data refreshed successfully',
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to refresh data',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTicketDetails = (ticket) => {
    setSelectedTicket(ticket);
    setStatusUpdateForm({
      status: '',
      description: ''
    });
  };

  const handleOpenAssignDialog = (ticket) => {
    setSelectedTicket(ticket);
    setAssignForm({ assignedToId: ticket.assignedTo?._id || '' });
    setAssignDialogOpen(true);
  };

  const handleOpenStatusDialog = (ticket) => {
    setSelectedTicket(ticket);
    setStatusUpdateForm({
      status: '',
      description: ''
    });
    setStatusUpdateDialogOpen(true);
  };

  // Determine user status dynamically based on active flag and last activity
  const getUserStatus = () => {
    if (!user) return { label: 'Unknown', color: 'default' };

    if (!user.active) return { label: 'Inactive', color: 'error' };
    
    // Check if last login was within the last 30 days
    const lastLoginDate = user.lastLogin ? new Date(user.lastLogin) : null;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    if (lastLoginDate && lastLoginDate > thirtyDaysAgo) {
      return { label: 'Active', color: 'success' };
    } else {
      return { label: 'Idle', color: 'warning' };
    }
  };

  // DATA GRID COLUMNS
  const ticketColumns = [
    {
      field: 'ticketId',
      headerName: 'Ticket ID',
      width: 150,
      renderCell: (params) => params.row?.ticketId || 'N/A'
    },
    {
      field: 'creatorName',
      headerName: 'Created By',
      width: 150,
      renderCell: (params) => {
        const creator = params.row?.creator;
        return creator ? (creator.fullName || creator.username || 'Unknown') : 'Unknown';
      }
    },
    {
      field: 'assignedToName',
      headerName: 'Assigned To',
      width: 150,
      renderCell: (params) => {
        const assignedTo = params.row?.assignedTo;
        return assignedTo ? (assignedTo.fullName || assignedTo.username || 'Unassigned') : 'Unassigned';
      }
    },
    {
      field: 'createdAt',
      headerName: 'Created',
      width: 180,
      renderCell: (params) => {
        if (!params.row?.createdAt) return 'N/A';
        try {
          return new Date(params.row.createdAt).toLocaleString();
        } catch (error) {
          return 'Invalid Date';
        }
      }
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.row?.status || 'Open'}
          color={
            params.row?.status === 'Closed' ? 'success' :
              params.row?.status === 'In Review' ? 'warning' :
                params.row?.status === 'Reopened' ? 'error' : 
                  'default'
          }
          size="small"
        />
      )
    },
    {
      field: 'logSummary',
      headerName: 'Alert Level',
      width: 120,
      renderCell: (params) => {
        let level = '0';
        try {
          const logSummary = params.row?.logSummary;
          level = logSummary ? (logSummary.ruleLevel || '0') : '0';
        } catch (error) {
          level = '0';
        }
        
        let color = 'success';
        if (parseInt(level) >= 10) color = 'error';
        else if (parseInt(level) >= 7) color = 'warning';
        else if (parseInt(level) >= 4) color = 'info';
        
        return (
          <Chip
            label={`Level ${level}`}
            color={color}
            size="small"
          />
        );
      }
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 250,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => handleOpenTicketDetails(params.row)}
          >
            View
          </Button>
          {(user?.role === 'Administrator' || user?.authority === 'read-write') && (
            <>
              <Button
                variant="outlined"
                size="small"
                onClick={() => handleOpenAssignDialog(params.row)}
              >
                Assign
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => handleOpenStatusDialog(params.row)}
              >
                Status
              </Button>
            </>
          )}
        </Box>
      )
    }
  ];

  // User columns with actions
  const userColumns = [
    {
      field: 'avatar',
      headerName: '',
      width: 60,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
          {params.row?.username?.charAt(0).toUpperCase() || 'U'}
        </Avatar>
      )
    },
    {
      field: 'username',
      headerName: 'Username',
      width: 150,
      renderCell: (params) => params.row?.username || 'N/A'
    },
    {
      field: 'fullName',
      headerName: 'Name',
      width: 180,
      renderCell: (params) => params.row?.fullName || 'Not provided'
    },
    {
      field: 'role',
      headerName: 'Role',
      width: 150,
      renderCell: (params) => (
        <Chip 
          label={params.row?.role || 'N/A'} 
          size="small"
          color={params.row?.role === 'Administrator' ? 'secondary' : 'primary'}
          variant={params.row?.role === 'Administrator' ? 'filled' : 'outlined'}
        />
      )
    },
    {
      field: 'plan',
      headerName: 'Plan',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.row?.plan || 'N/A'}
          color={params.row?.plan === 'Platinum' ? 'success' : 'info'}
          size="small"
          variant="outlined"
        />
      )
    },
    {
      field: 'active',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.row?.active ? 'Active' : 'Inactive'}
          color={params.row?.active ? 'success' : 'error'}
          size="small"
        />
      )
    },
    {
      field: 'planExpiryDate',
      headerName: 'Expires',
      width: 150,
      renderCell: (params) => {
        if (!params.row?.planExpiryDate) return 'N/A';
        try {
          const date = new Date(params.row.planExpiryDate).toLocaleDateString();
          const days = calculateRemainingDays(params.row.planExpiryDate);
          return (
            <Tooltip title={`${days} days remaining`}>
              <span>{date}</span>
            </Tooltip>
          );
        } catch (error) {
          return 'Invalid Date';
        }
      }
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Delete User">
            <IconButton
              size="small"
              color="error"
              onClick={() => handleDeleteUserClick(params.row)}
              disabled={params.row.username === 'admin'} // Prevent deleting admin user
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )
    }
  ];

  // If loading, show loading spinner
  if (loading) {
    return (
      <Container sx={{ textAlign: 'center', mt: 5 }}>
        <CircularProgress />
      </Container>
    );
  }

  // If error, show error message
  if (error) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  // Get user status
  const status = getUserStatus();

  return (
    <Container maxWidth="xl" sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4">User Profile</Typography>
        <IconButton 
          onClick={handleRefreshData} 
          color="primary" 
          disabled={loading}
          sx={{ 
            backgroundColor: theme.palette.background.paper,
            boxShadow: 1,
            '&:hover': {
              backgroundColor: theme.palette.background.paper,
              opacity: 0.9
            }
          }}
        >
          <RefreshIcon />
        </IconButton>
      </Box>

      {user && (
        <>
          <Card 
            elevation={3} 
            sx={{ 
              mb: 4, 
              borderRadius: 2,
              overflow: 'hidden'
            }}
          >
            <Box 
              sx={{ 
                bgcolor: theme.palette.primary.main, 
                color: 'white', 
                p: 2 
              }}
            >
              <Typography variant="h5">{user.fullName || user.username}</Typography>
              <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>
                {user.role} · {user.plan} Plan
              </Typography>
            </Box>
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar 
                        sx={{ 
                          bgcolor: theme.palette.primary.main,
                          width: 80,
                          height: 80,
                          fontSize: 36,
                          fontWeight: 'bold',
                          mr: 2
                        }}
                      >
                        {user.fullName ? user.fullName.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography variant="h6">{user.fullName || user.username}</Typography>
                        <Chip
                          label={status.label}
                          color={status.color}
                          size="small"
                          sx={{ mt: 1 }}
                        />
                      </Box>
                    </Box>
                    
                    <Paper 
                      variant="outlined" 
                      sx={{ 
                        p: 2, 
                        borderRadius: 2,
                        backgroundColor: theme.palette.background.paper 
                      }}
                    >
                      <Typography variant="subtitle1" gutterBottom>
                        Account Information
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <BadgeIcon color="primary" sx={{ mr: 1 }} />
                            <Typography><Box component="span" fontWeight="bold">Username:</Box> {user.username}</Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <EmailIcon color="primary" sx={{ mr: 1 }} />
                            <Typography><Box component="span" fontWeight="bold">Email:</Box> {user.email || 'Not provided'}</Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <PhoneIcon color="primary" sx={{ mr: 1 }} />
                            <Typography><Box component="span" fontWeight="bold">Phone:</Box> {user.phone || 'Not provided'}</Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <BusinessIcon color="primary" sx={{ mr: 1 }} />
                            <Typography><Box component="span" fontWeight="bold">Department:</Box> {user.department || 'Not provided'}</Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </Paper>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper 
                    variant="outlined" 
                    sx={{ 
                      p: 2, 
                      height: '100%', 
                      borderRadius: 2,
                      backgroundColor: theme.palette.background.paper,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle1" gutterBottom>
                        Account Status
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <SecurityIcon color="primary" sx={{ mr: 1 }} />
                            <Typography><Box component="span" fontWeight="bold">Role:</Box> {user.role}</Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <VerifiedUserIcon color="primary" sx={{ mr: 1 }} />
                            <Typography><Box component="span" fontWeight="bold">Authority:</Box> {user.authority}</Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <AccessTimeIcon color="primary" sx={{ mr: 1 }} />
                            <Typography>
                              <Box component="span" fontWeight="bold">Last Login:</Box> {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'N/A'}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <CalendarTodayIcon color="primary" sx={{ mr: 1 }} />
                            <Typography>
                              <Box component="span" fontWeight="bold">Plan Expiry:</Box>{' '}
                              {user.planExpiryDate ? (
                                <>
                                  {new Date(user.planExpiryDate).toLocaleDateString()}
                                  {` (${calculateRemainingDays(user.planExpiryDate)} days remaining)`}
                                </>
                              ) : 'N/A'}
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </Box>
                    
                    <Box sx={{ display: 'flex', gap: 2, mt: 3, justifyContent: 'flex-end' }}>
                      <Button
                        variant="outlined"
                        startIcon={<PersonIcon />}
                        onClick={() => setProfileDialogOpen(true)}
                      >
                        Edit Profile
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<LockIcon />}
                        onClick={() => setPasswordDialogOpen(true)}
                      >
                        Change Password
                      </Button>
                      {user.role === 'Administrator' && (
                        <Button
                          variant="contained"
                          color="primary"
                          startIcon={<GroupAddIcon />}
                          onClick={handleCreateUserClick}
                        >
                          Create User
                        </Button>
                      )}
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Tabs for Tickets and Users (Admin only) */}
          <Box sx={{ width: '100%', mb: 2, bgcolor: theme.palette.background.paper, borderRadius: 1 }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              aria-label="profile tabs"
              sx={{ 
                '& .MuiTab-root': {
                  minHeight: '64px'
                }
              }}
            >
              <Tab 
                icon={<AssignmentIcon />} 
                iconPosition="start" 
                label="Tickets" 
                sx={{ fontWeight: 'bold' }}
              />
              {user.role === 'Administrator' && (
                <Tab 
                  icon={<PeopleIcon />} 
                  iconPosition="start" 
                  label="Users" 
                  sx={{ fontWeight: 'bold' }}
                />
              )}
            </Tabs>
          </Box>

          {/* Tickets Tab */}
          <TabPanel value={tabValue} index={0}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">Tickets</Typography>
              <FormControl variant="outlined" size="small" sx={{ minWidth: 150 }}>
                <InputLabel id="status-filter-label">Status</InputLabel>
                <Select
                  labelId="status-filter-label"
                  value={statusFilter}
                  onChange={handleStatusFilterChange}
                  label="Status"
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="Open">Open</MenuItem>
                  <MenuItem value="In Review">In Review</MenuItem>
                  <MenuItem value="Closed">Closed</MenuItem>
                  <MenuItem value="Reopened">Reopened</MenuItem>
                </Select>
              </FormControl>
            </Box>
            
            <Card elevation={2} sx={{ borderRadius: 2 }}>
              <CardContent sx={{ p: 0 }}>
                <DataGrid
                  rows={filteredTickets}
                  columns={ticketColumns}
                  pageSize={10}
                  rowsPerPageOptions={[5, 10, 25]}
                  autoHeight
                  disableSelectionOnClick
                  getRowId={(row) => row._id || row.ticketId}
                  loading={loading}
                  components={{
                    NoRowsOverlay: () => (
                      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', p: 2 }}>
                        <Typography color="text.secondary">No tickets found</Typography>
                      </Box>
                    )
                  }}
                  sx={{
                    '& .MuiDataGrid-columnHeaders': {
                      backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                    },
                    '& .MuiDataGrid-cell:hover': {
                      color: 'primary.main',
                    },
                    border: 'none',
                    '& .MuiDataGrid-cell': {
                      borderBottom: `1px solid ${theme.palette.divider}`
                    },
                    '& .MuiDataGrid-columnHeaders': {
                      borderBottom: `2px solid ${theme.palette.divider}`
                    }
                  }}
                />
              </CardContent>
            </Card>
          </TabPanel>

          {/* Users Tab (Admin only) */}
          {user.role === 'Administrator' && (
            <TabPanel value={tabValue} index={1}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">System Users</Typography>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<GroupAddIcon />}
                  onClick={handleCreateUserClick}
                  size="small"
                >
                  Create New User
                </Button>
              </Box>
              
              <Card elevation={2} sx={{ borderRadius: 2 }}>
                <CardContent sx={{ p: 0 }}>
                  <DataGrid
                    rows={users}
                    columns={userColumns}
                    pageSize={10}
                    rowsPerPageOptions={[5, 10, 25]}
                    autoHeight
                    disableSelectionOnClick
                    getRowId={(row) => row._id}
                    loading={loading}
                    sx={{
                      '& .MuiDataGrid-columnHeaders': {
                        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                      },
                      '& .MuiDataGrid-cell:hover': {
                        color: 'primary.main',
                      },
                      border: 'none',
                      '& .MuiDataGrid-cell': {
                        borderBottom: `1px solid ${theme.palette.divider}`
                      },
                      '& .MuiDataGrid-columnHeaders': {
                        borderBottom: `2px solid ${theme.palette.divider}`
                      }
                    }}
                  />
                </CardContent>
              </Card>
            </TabPanel>
          )}
        </>
      )}

      {/* Profile Edit Dialog */}
      <Dialog 
        open={profileDialogOpen} 
        onClose={() => setProfileDialogOpen(false)}
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          elevation: 3,
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
          Edit Profile
        </DialogTitle>
        <form onSubmit={handleProfileSubmit}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Full Name"
                  value={profileForm.fullName}
                  onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                  margin="normal"
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  margin="normal"
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Phone"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  margin="normal"
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Department"
                  value={profileForm.department}
                  onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
                  margin="normal"
                  variant="outlined"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setProfileDialogOpen(false)} color="inherit">Cancel</Button>
            <Button type="submit" variant="contained" color="primary">Save Changes</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog 
        open={passwordDialogOpen} 
        onClose={() => setPasswordDialogOpen(false)}
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          elevation: 3,
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
          Change Password
        </DialogTitle>
        <form onSubmit={handlePasswordSubmit}>
          <DialogContent>
            <TextField
              fullWidth
              label="Current Password"
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              margin="normal"
              required
              variant="outlined"
            />
            <TextField
              fullWidth
              label="New Password"
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              margin="normal"
              required
              error={!!passwordErrors.newPassword}
              helperText={passwordErrors.newPassword}
              variant="outlined"
            />
            <TextField
              fullWidth
              label="Confirm New Password"
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              margin="normal"
              required
              error={!!passwordErrors.confirmPassword}
              helperText={passwordErrors.confirmPassword}
              variant="outlined"
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setPasswordDialogOpen(false)} color="inherit">Cancel</Button>
            <Button type="submit" variant="contained" color="primary">Change Password</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Create User Dialog (Admin only) */}
      <Dialog 
        open={createUserDialogOpen} 
        onClose={() => setCreateUserDialogOpen(false)}
        maxWidth="md" 
        fullWidth
        PaperProps={{
          elevation: 3,
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
          Create New User
        </DialogTitle>
        <form onSubmit={handleCreateUserSubmit}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Username"
                  value={createUserForm.username}
                  onChange={(e) => setCreateUserForm({ ...createUserForm, username: e.target.value })}
                  margin="normal"
                  required
                  error={!!createUserErrors.username}
                  helperText={createUserErrors.username}
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  value={createUserForm.password}
                  onChange={(e) => setCreateUserForm({ ...createUserForm, password: e.target.value })}
                  margin="normal"
                  required
                  error={!!createUserErrors.password}
                  helperText={createUserErrors.password}
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Full Name"
                  value={createUserForm.fullName}
                  onChange={(e) => setCreateUserForm({ ...createUserForm, fullName: e.target.value })}
                  margin="normal"
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={createUserForm.email}
                  onChange={(e) => setCreateUserForm({ ...createUserForm, email: e.target.value })}
                  margin="normal"
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Phone"
                  value={createUserForm.phone}
                  onChange={(e) => setCreateUserForm({ ...createUserForm, phone: e.target.value })}
                  margin="normal"
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Department"
                  value={createUserForm.department}
                  onChange={(e) => setCreateUserForm({ ...createUserForm, department: e.target.value })}
                  margin="normal"
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth margin="normal" required error={!!createUserErrors.role} variant="outlined">
                  <InputLabel>Role</InputLabel>
                  <Select
                    value={createUserForm.role}
                    onChange={(e) => setCreateUserForm({ ...createUserForm, role: e.target.value })}
                    label="Role"
                  >
                    <MenuItem value="L1 Analyst">L1 Analyst</MenuItem>
                    <MenuItem value="L2 Analyst">L2 Analyst</MenuItem>
                    <MenuItem value="L3 Analyst">L3 Analyst</MenuItem>
                    <MenuItem value="Administrator">Administrator</MenuItem>
                  </Select>
                  {createUserErrors.role && (
                    <FormHelperText>{createUserErrors.role}</FormHelperText>
                  )}
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth margin="normal" required error={!!createUserErrors.authority} variant="outlined">
                  <InputLabel>Authority</InputLabel>
                  <Select
                    value={createUserForm.authority}
                    onChange={(e) => setCreateUserForm({ ...createUserForm, authority: e.target.value })}
                    label="Authority"
                  >
                    <MenuItem value="read-only">Read Only</MenuItem>
                    <MenuItem value="read-write">Read-Write</MenuItem>
                  </Select>
                  {createUserErrors.authority && (
                    <FormHelperText>{createUserErrors.authority}</FormHelperText>
                  )}
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth margin="normal" required error={!!createUserErrors.plan} variant="outlined">
                  <InputLabel>Plan</InputLabel>
                  <Select
                    value={createUserForm.plan}
                    onChange={(e) => setCreateUserForm({ ...createUserForm, plan: e.target.value })}
                    label="Plan"
                  >
                    <MenuItem value="Privileged">Privileged</MenuItem>
                    <MenuItem value="Platinum">Platinum</MenuItem>
                  </Select>
                  {createUserErrors.plan && (
                    <FormHelperText>{createUserErrors.plan}</FormHelperText>
                  )}
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Plan Expiry Date"
                  type="date"
                  value={createUserForm.planExpiryDate}
                  onChange={(e) => setCreateUserForm({ ...createUserForm, planExpiryDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  margin="normal"
                  required
                  error={!!createUserErrors.planExpiryDate}
                  helperText={createUserErrors.planExpiryDate}
                  variant="outlined"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setCreateUserDialogOpen(false)} color="inherit">Cancel</Button>
            <Button type="submit" variant="contained" color="primary">Create User</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Assign Ticket Dialog */}
      <Dialog 
        open={assignDialogOpen} 
        onClose={() => setAssignDialogOpen(false)}
        PaperProps={{
          elevation: 3,
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
          Assign Ticket
        </DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2, minWidth: 240 }}>
            <InputLabel>Assign To</InputLabel>
            <Select
              value={assignForm.assignedToId}
              onChange={(e) => setAssignForm({ assignedToId: e.target.value })}
              label="Assign To"
            >
              <MenuItem value="">Unassigned</MenuItem>
              {Array.isArray(users) && users.map(user => (
                <MenuItem key={user._id} value={user._id}>
                  {user.fullName || user.username}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAssignDialogOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={handleAssignTicket} variant="contained" color="primary">
            Assign
          </Button>
        </DialogActions>
      </Dialog>

      {/* Update Ticket Status Dialog */}
      <Dialog 
        open={statusUpdateDialogOpen} 
        onClose={() => setStatusUpdateDialogOpen(false)}
        PaperProps={{
          elevation: 3,
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
          Update Ticket Status
        </DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusUpdateForm.status}
              onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, status: e.target.value })}
              label="Status"
            >
              <MenuItem value="Open">Open</MenuItem>
              <MenuItem value="In Review">In Review</MenuItem>
              <MenuItem value="Closed">Closed</MenuItem>
              <MenuItem value="Reopened">Reopened</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Description"
            multiline
            rows={3}
            value={statusUpdateForm.description}
            onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, description: e.target.value })}
            margin="normal"
            placeholder="Add details about this status change"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setStatusUpdateDialogOpen(false)} color="inherit">Cancel</Button>
          <Button 
            onClick={handleUpdateTicketStatus} 
            variant="contained" 
            color="primary" 
            disabled={!statusUpdateForm.status}
          >
            Update Status
          </Button>
        </DialogActions>
      </Dialog>

      {/* Password Confirmation Dialog */}
      <Dialog 
        open={passwordConfirmDialog} 
        onClose={() => setPasswordConfirmDialog(false)}
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          elevation: 3,
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{ bgcolor: actionType === 'delete' ? 'error.main' : 'primary.main', color: 'white' }}>
          {actionType === 'create' ? 'Confirm User Creation' : 'Confirm User Deletion'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph sx={{ mt: 2 }}>
            {actionType === 'create' 
              ? 'Please enter your admin password to create a new user.' 
              : `Please enter your admin password to delete user "${targetUser?.username}".`
            }
          </Typography>
          <TextField
            fullWidth
            label="Admin Password"
            type="password"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            margin="normal"
            error={!!confirmError}
            helperText={confirmError}
            autoFocus
            variant="outlined"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPasswordConfirmDialog(false)} color="inherit">Cancel</Button>
          <Button 
            variant="contained" 
            color={actionType === 'delete' ? 'error' : 'primary'} 
            onClick={handleConfirmPassword}
            disabled={confirming}
          >
            {confirming ? 'Verifying...' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Ticket Details Dialog */}
      <Dialog
        open={!!selectedTicket && !assignDialogOpen && !statusUpdateDialogOpen}
        onClose={() => setSelectedTicket(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          elevation: 3,
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography>Ticket {selectedTicket?.ticketId}</Typography>
          <Box>
            {(user?.role === 'Administrator' || user?.authority === 'read-write') && (
              <>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setSelectedTicket(null);
                    handleOpenAssignDialog(selectedTicket);
                  }}
                  sx={{ mr: 1, color: 'white', borderColor: 'rgba(255, 255, 255, 0.5)' }}
                >
                  Assign
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => {
                    setSelectedTicket(null);
                    handleOpenStatusDialog(selectedTicket);
                  }}
                  sx={{ bgcolor: 'white', color: 'primary.main' }}
                >
                  Update Status
                </Button>
              </>
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedTicket && (
            <>
              <Box sx={{ mb: 3, mt: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">Status</Typography>
                    <Typography variant="body1">
                      <Chip
                        label={selectedTicket.status}
                        color={
                          selectedTicket.status === 'Closed' ? 'success' :
                            selectedTicket.status === 'In Review' ? 'warning' :
                              selectedTicket.status === 'Reopened' ? 'error' : 
                                'default'
                        }
                        size="small"
                      />
                    </Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">Created</Typography>
                    <Typography variant="body2">{new Date(selectedTicket.createdAt).toLocaleString()}</Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">Created By</Typography>
                    <Typography variant="body2">{selectedTicket.creator?.fullName || selectedTicket.creator?.username}</Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">Assigned To</Typography>
                    <Typography variant="body2">{selectedTicket.assignedTo?.fullName || selectedTicket.assignedTo?.username || 'Unassigned'}</Typography>
                  </Grid>
                </Grid>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="h6" gutterBottom>Status History</Typography>
              <Box sx={{ mb: 3, maxHeight: '200px', overflow: 'auto' }}>
                {selectedTicket.statusHistory && selectedTicket.statusHistory.length > 0 ? (
                  selectedTicket.statusHistory.map((history, index) => (
                    <Box key={index} sx={{ mb: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, boxShadow: 1 }}>
                      <Typography variant="subtitle2">
                        {history.status} - {new Date(history.timestamp).toLocaleString()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        By: {history.changedBy?.fullName || history.changedBy?.username || 'Unknown'}
                      </Typography>
                      {history.description && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          {history.description}
                        </Typography>
                      )}
                    </Box>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">No status history available</Typography>
                )}
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="h6" gutterBottom>Log Details</Typography>
              <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, boxShadow: 1 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" color="text.secondary">Agent</Typography>
                    <Typography variant="body2">{selectedTicket.logSummary?.agentName || 'Unknown'}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" color="text.secondary">Rule Level</Typography>
                    <Typography variant="body2">{selectedTicket.logSummary?.ruleLevel || 'Unknown'}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">Description</Typography>
                    <Typography variant="body2">{selectedTicket.logSummary?.ruleDescription || 'No description'}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">Time</Typography>
                    <Typography variant="body2">
                      {selectedTicket.logSummary?.timestamp ? new Date(selectedTicket.logSummary.timestamp).toLocaleString() : 'Unknown'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setSelectedTicket(null)} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          elevation={6}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default UserDetails;