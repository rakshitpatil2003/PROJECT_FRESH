import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Box, 
  Paper, 
  Grid, 
  CircularProgress, 
  Alert,
  Divider,
  Card,
  CardContent,
  useTheme
} from '@mui/material';
import KeyMetrics from './Keymetrics';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import LockIcon from '@mui/icons-material/Lock';
import { API_URL } from '../config';
import { Bar, Line } from 'recharts';
import { BarChart, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const ThreatHunting = () => {
  const theme = useTheme();
  const [authMetrics, setAuthMetrics] = useState({
    success: 0,
    failure: 0
  });
  const [topAgents, setTopAgents] = useState([]);
  const [alertTrends, setAlertTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Authentication token not found');
        }

        // Fetch authentication metrics
        const authResponse = await fetch(`${API_URL}/api/logs/auth-metrics`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!authResponse.ok) {
          throw new Error(`HTTP error! Status: ${authResponse.status}`);
        }

        const authData = await authResponse.json();
        setAuthMetrics({
          success: authData.success || 0,
          failure: authData.failure || 0
        });

        // Fetch top agents
        const agentsResponse = await fetch(`${API_URL}/api/logs/top-agents`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!agentsResponse.ok) {
          throw new Error(`HTTP error! Status: ${agentsResponse.status}`);
        }

        const agentsData = await agentsResponse.json();
        setTopAgents(agentsData);

        // Fetch alert trends
        const trendsResponse = await fetch(`${API_URL}/api/logs/alert-trends`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!trendsResponse.ok) {
          throw new Error(`HTTP error! Status: ${trendsResponse.status}`);
        }

        const trendsData = await trendsResponse.json();
        setAlertTrends(trendsData);

        setError(null);
      } catch (err) {
        console.error('Error fetching threat hunting data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  // Create custom colors for the charts
  const chartColors = {
    success: '#4caf50',
    failure: '#f44336',
    agents: [
      '#2196f3',
      '#9c27b0',
      '#ff9800',
      '#03a9f4',
      '#e91e63'
    ],
    alertLevels: {
      critical: '#d32f2f',
      high: '#f44336',
      medium: '#ff9800',
      low: '#4caf50'
    }
  };

  // Authentication metrics card
  const renderAuthCards = () => {
    const totalAuth = authMetrics.success + authMetrics.failure;
    const successPercentage = totalAuth > 0 ? Math.round((authMetrics.success / totalAuth) * 100) : 0;
    const failurePercentage = totalAuth > 0 ? Math.round((authMetrics.failure / totalAuth) * 100) : 0;

    return (
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{
            p: 3,
            backgroundColor: theme.palette.mode === 'dark' ? '#353536' : 'white',
            height: '100%'
          }}>
            <Box display="flex" alignItems="center" mb={2}>
              <Box
                sx={{
                  p: 1,
                  borderRadius: 1,
                  backgroundColor: '#e8f5e9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <LockOpenIcon sx={{ color: '#4caf50', fontSize: 24 }} />
              </Box>
              <Typography
                variant="h6"
                sx={{
                  ml: 2,
                  color: '#4caf50',
                  fontWeight: 600
                }}
              >
                Auth Success
              </Typography>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#4caf50' }}>
              {authMetrics.success.toLocaleString()}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {successPercentage}% of total authentication attempts
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{
            p: 3,
            backgroundColor: theme.palette.mode === 'dark' ? '#353536' : 'white',
            height: '100%'
          }}>
            <Box display="flex" alignItems="center" mb={2}>
              <Box
                sx={{
                  p: 1,
                  borderRadius: 1,
                  backgroundColor: '#ffebee',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <LockIcon sx={{ color: '#f44336', fontSize: 24 }} />
              </Box>
              <Typography
                variant="h6"
                sx={{
                  ml: 2,
                  color: '#f44336',
                  fontWeight: 600
                }}
              >
                Auth Failure
              </Typography>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#f44336' }}>
              {authMetrics.failure.toLocaleString()}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {failurePercentage}% of total authentication attempts
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    );
  };

  // Top agents chart
  const renderTopAgentsChart = () => {
    if (!topAgents.length) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" height="200px">
          <Typography variant="body1" color="text.secondary">No agent data available</Typography>
        </Box>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={topAgents}
          margin={{
            top: 5,
            right: 20,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip 
            formatter={(value) => [`${value} logs`, 'Count']}
            labelFormatter={(value) => `Agent: ${value}`}
          />
          <Legend />
          <Bar dataKey="count" name="Log Count" fill="#2196f3" />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  // Alert level trends chart
  const renderAlertTrendsChart = () => {
    if (!alertTrends.length) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" height="200px">
          <Typography variant="body1" color="text.secondary">No alert trend data available</Typography>
        </Box>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={alertTrends}
          margin={{
            top: 5,
            right: 20,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="critical" 
            name="Critical (15+)" 
            stroke={chartColors.alertLevels.critical} 
            activeDot={{ r: 8 }} 
          />
          <Line 
            type="monotone" 
            dataKey="high" 
            name="High (12-14)" 
            stroke={chartColors.alertLevels.high} 
          />
          <Line 
            type="monotone" 
            dataKey="medium" 
            name="Medium (8-11)" 
            stroke={chartColors.alertLevels.medium} 
          />
          <Line 
            type="monotone" 
            dataKey="low" 
            name="Low (1-7)" 
            stroke={chartColors.alertLevels.low} 
          />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
        Threat Hunting Dashboard
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Box mb={4}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
              Key Metrics
            </Typography>
            <KeyMetrics />
          </Box>

          <Box mb={4}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
              Authentication Status
            </Typography>
            {renderAuthCards()}
          </Box>

          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Card raised={true}>
                <CardContent>
                  <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
                    Top 5 Agents by Log Count
                  </Typography>
                  {renderTopAgentsChart()}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card raised={true}>
                <CardContent>
                  <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
                    Alert Level Trends
                  </Typography>
                  {renderAlertTrendsChart()}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
};

export default ThreatHunting;