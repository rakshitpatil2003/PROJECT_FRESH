import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Container, Card, CardHeader, CardContent, Grid, CircularProgress, 
  Alert, Typography, Box, Chip, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Paper, Tabs, Tab
} from '@mui/material';
import { API_URL } from '../config';

const UserDetails = () => {
  const [user, setUser] = useState(null);
  const [requestHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        if (!token) {
          setError('No authentication token found. Please login again.');
          setLoading(false);
          return;
        }
        
        // Fetch user profile
        const profileResponse = await axios.get(`${API_URL}/api/auth/profile`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        setUser(profileResponse.data);

        // Fetch request/token history
        // const historyResponse = await axios.get(`${API_URL}/api/requests/history`, {
        //   headers: {
        //     Authorization: `Bearer ${token}`
        //   }
        // });
        
        // setRequestHistory(historyResponse.data || []);
        setError(null);
      } catch (err) {
        setError('Failed to fetch user data. Please try again later.');
        console.error('Error fetching user data:', err);
      } finally {
        setLoading(false);
      }
    };
  
    fetchUserDetails();
  }, []);

  if (loading) {
    return (
      <Container sx={{ textAlign: 'center', mt: 5 }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

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

  const status = getUserStatus();

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h4" sx={{ mb: 4 }}>User Profile</Typography>
      
      {user && (
        <>
          <Card sx={{ mb: 4 }}>
            <CardHeader 
              title={<Typography variant="h5">{user.name || 'User'}</Typography>}
            />
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography><Box component="span" fontWeight="bold">Email:</Box> {user.email}</Typography>
                  <Typography><Box component="span" fontWeight="bold">Username:</Box> {user.username}</Typography>
                  <Typography><Box component="span" fontWeight="bold">Role:</Box> {user.role}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography>
                    <Box component="span" fontWeight="bold">Last Login:</Box> {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'N/A'}
                  </Typography>
                  <Typography>
                    <Box component="span" fontWeight="bold">Status:</Box>{' '}
                    <Chip 
                      label={status.label} 
                      color={status.color} 
                      size="small"
                    />
                  </Typography>
                </Grid>
              </Grid>

              {user.additionalInfo && (
                <Box sx={{ mt: 4 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>Additional Information</Typography>
                  <Grid container spacing={2}>
                    {Object.entries(user.additionalInfo).map(([key, value]) => (
                      <Grid item xs={12} md={6} key={key}>
                        <Typography><Box component="span" fontWeight="bold">{key}:</Box> {value}</Typography>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}
            </CardContent>
          </Card>

          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="user data tabs">
              <Tab label="Request History" />
              <Tab label="API Tokens" />
            </Tabs>
          </Box>

          {tabValue === 0 && (
            <TableContainer component={Paper}>
              <Table sx={{ minWidth: 650 }} aria-label="request history table">
                <TableHead>
                  <TableRow>
                    <TableCell>Timestamp</TableCell>
                    <TableCell>Request ID</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {requestHistory.length > 0 ? (
                    requestHistory.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell>{new Date(req.timestamp).toLocaleString()}</TableCell>
                        <TableCell>{req.id}</TableCell>
                        <TableCell>{req.type}</TableCell>
                        <TableCell>{req.description}</TableCell>
                        <TableCell>
                          <Chip 
                            label={req.status} 
                            color={req.status === 'Completed' ? 'success' : req.status === 'Failed' ? 'error' : 'warning'} 
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} align="center">No request history found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {tabValue === 1 && (
            <TableContainer component={Paper}>
              <Table sx={{ minWidth: 650 }} aria-label="token history table">
                <TableHead>
                  <TableRow>
                    <TableCell>Generated On</TableCell>
                    <TableCell>Token ID</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Expiry</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {user.tokens && user.tokens.length > 0 ? (
                    user.tokens.map((token) => (
                      <TableRow key={token.id}>
                        <TableCell>{new Date(token.createdAt).toLocaleString()}</TableCell>
                        <TableCell>{token.id}</TableCell>
                        <TableCell>{token.name}</TableCell>
                        <TableCell>{token.expiry ? new Date(token.expiry).toLocaleDateString() : 'Never'}</TableCell>
                        <TableCell>
                          <Chip 
                            label={token.active ? 'Active' : 'Expired'} 
                            color={token.active ? 'success' : 'error'} 
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} align="center">No tokens generated</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}
    </Container>
  );
};

export default UserDetails;