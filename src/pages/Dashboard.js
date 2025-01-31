import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';  // Add this import
import { 
  Box, 
  Typography, 
  Alert, 
  CircularProgress, 
  Container, 
  Grid, 
  Paper,
  Button,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import Header from '../components/Header';
import TimeRangeSelector from '../components/TimeRangeSelector';
import KeyMetrics from '../components/Keymetrics';
import Charts from '../components/Charts';
import RecentLogs from '../components/RecentLogs';
import WorldMap from '../components/WorldMap';
import { normalizeLogs } from '../utils/normalizeLogs';

const Dashboard = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState({
    logsWithGeolocation: [],
    levelDistribution: [],
    timeDistribution: [],
    recentLogs: [],
  });
  const [timeRange, setTimeRange] = useState(3600);
  const [updateInterval, setUpdateInterval] = useState(10000);
  const [isUpdating, setIsUpdating] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  useEffect(() => {
  const fetchLogs = async () => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/logs?range=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${token}`, // Make sure the format matches exactly
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }

      const data = await response.json();
      const normalizedLogs = normalizeLogs(data.logsWithGeolocation);

      setLogs({
        logsWithGeolocation: normalizedLogs,
        levelDistribution: data.levelDistribution || [],
        timeDistribution: data.timeDistribution || [],
        recentLogs: data.recentLogs || [],
      });
    } catch (error) {
      console.error('Error fetching logs:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  //useEffect(() => {
    fetchLogs();
    let intervalId;

    if (isUpdating) {
      intervalId = setInterval(fetchLogs, updateInterval);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [timeRange, updateInterval, isUpdating, navigate]);

  if (loading && !logs.logsWithGeolocation.length) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>Loading logs...</Typography>
      </Box>
    );
  }

  if (error && !logs.logsWithGeolocation.length) {
    return (
      <Box p={4}>
        <Alert severity="error">
          Error loading logs: {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Container maxWidth="xl">
        <Box p={4}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
            <Header />
            <Button
              variant="outlined"
              color="primary"
              startIcon={<LogoutIcon />}
              onClick={handleLogout}
              sx={{ ml: 2 }}
            >
              Logout
            </Button>
          </Box>

          <Paper elevation={2} sx={{ p: 2, mb: 4 }}>
            <TimeRangeSelector
              timeRange={timeRange}
              setTimeRange={setTimeRange}
              updateInterval={updateInterval}
              setUpdateInterval={setUpdateInterval}
              isUpdating={isUpdating}
              setIsUpdating={setIsUpdating}
            />
          </Paper>

          {loading && logs.logsWithGeolocation.length > 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>Updating data...</Alert>
          )}
          {error && logs.logsWithGeolocation.length > 0 && (
            <Alert severity="error" sx={{ mb: 2 }}>Error updating data: {error}</Alert>
          )}

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper elevation={2} sx={{ p: 2 }}>
                <Typography variant="h5" gutterBottom>
                  Key Metrics
                </Typography>
                <KeyMetrics logs={logs.logsWithGeolocation} />
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <Paper elevation={2} sx={{ p: 2 }}>
                <Typography variant="h5" gutterBottom>
                  Log Analysis Charts
                </Typography>
                <Charts
                  logs={logs.logsWithGeolocation}
                  levelDistribution={logs.levelDistribution}
                  timeDistribution={logs.timeDistribution}
                />
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <Paper elevation={2} sx={{ p: 2 }}>
                <Typography variant="h5" gutterBottom>
                  Network Traffic Visualization
                </Typography>
                <Box sx={{ height: '400px', width: '100%' }}>
                  <WorldMap logs={logs.logsWithGeolocation} />
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <Paper elevation={2} sx={{ p: 2 }}>
                <Typography variant="h5" gutterBottom>
                  Recent Logs
                </Typography>
                <RecentLogs logs={logs.recentLogs} />
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </Container>
    </Box>
  );
};

export default Dashboard;