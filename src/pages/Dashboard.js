import React, { useState, useEffect, useCallback } from 'react';

import { API_URL } from '../config';
import { 
  Box, 
  Typography, 
  Alert, 
  CircularProgress, 
  Container, 
  Grid, 
  Paper,
} from '@mui/material';
import Header from '../components/Header';
import TimeRangeSelector from '../components/TimeRangeSelector';
import KeyMetrics from '../components/Keymetrics';
import Charts from '../components/Charts';
import RecentLogs from '../components/RecentLogs';
import WorldMap from '../components/WorldMap';

const Dashboard = () => {

  const [logs, setLogs] = useState({
    items: [],
    metrics: {
      totalLogs: 0,
      majorLogs: 0,
      normalLogs: 0
    },
    pagination: {
      total: 0,
      page: 1,
      pages: 1
    }
  });
  const [timeRange, setTimeRange] = useState(3600);
  const [updateInterval, setUpdateInterval] = useState(10000);
  const [isUpdating, setIsUpdating] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const token = localStorage.getItem('token');

  

  const fetchLogs = useCallback(async () => {
    try {
      setError(null);
      const [logsResponse, metricsResponse] = await Promise.all([
        fetch(`${API_URL}/api/logs/recent`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch(`${API_URL}/api/logs/metrics`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
      ]);

      if (!logsResponse.ok || !metricsResponse.ok) {
        throw new Error('Failed to fetch data');
      }

      const [logsData, metricsData] = await Promise.all([
        logsResponse.json(),
        metricsResponse.json()
      ]);

      setLogs({
        items: logsData || [],
        metrics: metricsData || {
          totalLogs: 0,
          majorLogs: 0,
          normalLogs: 0
        },
        pagination: {
          total: logsData.length,
          page: 1,
          pages: Math.ceil(logsData.length / 10)
        }
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    let intervalId;
    
    const initFetch = async () => {
      await fetchLogs();
      if (isUpdating) {
        intervalId = setInterval(fetchLogs, updateInterval);
      }
    };

    initFetch();

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [timeRange, updateInterval, isUpdating, fetchLogs]);

  if (loading && !logs.items.length) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>Loading logs...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Container maxWidth="xl">
        <Box p={4}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
            <Header />
            
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

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>Error: {error}</Alert>
          )}

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper elevation={2} sx={{ p: 2 }}>
                <Typography variant="h5" gutterBottom>
                  Key Metrics
                </Typography>
                <KeyMetrics metrics={logs.metrics} />
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <Paper elevation={2} sx={{ p: 2 }}>
                <Typography variant="h5" gutterBottom>
                  Recent Logs
                </Typography>
                <RecentLogs logs={logs.items} />
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <Paper elevation={2} sx={{ p: 2 }}>
                <Typography variant="h5" gutterBottom>
                  Log Analysis Charts
                </Typography>
                <Charts
                  logs={logs.items}
                />
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <Paper elevation={2} sx={{ p: 2 }}>
                <Typography variant="h5" gutterBottom>
                  Network Traffic Visualization
                </Typography>
                <Box sx={{ height: '400px', width: '100%' }}>
                  <WorldMap logs={logs.items} />
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </Container>
    </Box>
  );
};

export default Dashboard;