import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Container, Card, CardHeader, CardContent, Grid, CircularProgress,
  Alert, Typography, Box, Chip
} from '@mui/material';
import { API_URL } from '../config';

const UserDetails = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const calculateRemainingDays = (expiryDate) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const timeDiff = expiry.getTime() - today.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  };

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

              {user.planExpiryDate && (
                <Typography>
                  <Box component="span" fontWeight="bold">Plan Expiry:</Box>{' '}
                  {new Date(user.planExpiryDate).toLocaleDateString()}
                  {` (${calculateRemainingDays(user.planExpiryDate)} days remaining)`}
                </Typography>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </Container>
  );
};

export default UserDetails;