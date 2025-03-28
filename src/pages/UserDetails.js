import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Container, Card, CardHeader, CardContent, Grid, CircularProgress,
  Alert, Typography, Box, Chip, Button, Dialog, DialogTitle, DialogContent
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { API_URL } from '../config';
import { StructuredLogView } from '../utils/normalizeLogs';

const UserDetails = () => {
  const [user, setUser] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const calculateRemainingDays = (expiryDate) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const timeDiff = expiry.getTime() - today.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  };

  const fetchUserTickets = async (token) => {
    try {
      const response = await axios.get(`${API_URL}/api/auth/user-tickets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTickets(response.data);
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
    }
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
        // Fetch user tickets
        await fetchUserTickets(token);

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

  // Update ticket status (for admin)
  const handleUpdateTicketStatus = async (ticketId, status) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.patch(
        `${API_URL}/api/auth/update-ticket/${ticketId}`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update tickets in state
      setTickets(prevTickets =>
        prevTickets.map(ticket =>
          ticket.id === ticketId ? response.data : ticket
        )
      );
    } catch (err) {
      console.error('Failed to update ticket:', err);
    }
  };

  // Columns for ticket table
  const columns = [
    {
      field: 'id',
      headerName: 'Ticket ID',
      width: 150
    },
    {
      field: 'createdAt',
      headerName: 'Created Date',
      width: 200,
      valueFormatter: (params) => new Date(params.value).toLocaleString()
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 150,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={
            params.value === 'Resolved' ? 'success' :
              params.value === 'In Review' ? 'warning' :
                'default'
          }
          size="small"
        />
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 200,
      renderCell: (params) => (
        <Button
          variant="outlined"
          size="small"
          onClick={() => setSelectedTicket(params.row)}
        >
          View Details
        </Button>
      )
    }
  ];

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

      {/* Tickets Section */}
      <Card sx={{ mt: 4 }}>
        <CardHeader title="Tickets" />
        <CardContent>
          <DataGrid
            rows={tickets}
            columns={columns}
            pageSize={5}
            rowsPerPageOptions={[5]}
            autoHeight
            disableSelectionOnClick
          />
        </CardContent>
      </Card>

      {/* Ticket Details Dialog */}
      <Dialog
        open={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Ticket Details: {selectedTicket?.id}</DialogTitle>
        <DialogContent>
          {selectedTicket && (
            <StructuredLogView data={selectedTicket.logData} />
          )}
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default UserDetails;