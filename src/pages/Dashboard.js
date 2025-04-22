import React, { useState, useEffect, useCallback } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import jwtDecode from 'jwt-decode';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Skeleton,
  useTheme
} from '@mui/material';
import Charts from '../components/Charts';
import RecentLogs from '../components/RecentLogs';
import { API_URL } from '../config';

// Import Enhanced Components
import { 
  EventAnalysisFunnel, 
  SecurityScoreGauge, 
  EventsPerSecondGauge,
  TopAgentsVisualization,
  AlertTrendsChart
} from '../components/PerformanceVisualizations';
import WorldConnectionMap from '../components/WorldConnectionMap';

const Dashboard = () => {
  const theme = useTheme();
  
  // State for data
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
  
  // State for charts data
  const [chartData, setChartData] = useState({
    timestamps: [],
    newLogCounts: [],
    totalLogsHistory: []
  });
  
  // State for security score
  const [securityScore, setSecurityScore] = useState(0);
  
  // State for top agents
  const [topAgents, setTopAgents] = useState([]);
  
  // State for alert trends
  const [alertTrends, setAlertTrends] = useState([]);
  
  // State for tickets count
  const [ticketCount, setTicketCount] = useState(7); // Default to 7 tickets
  
  // State for UI management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updateInterval, setUpdateInterval] = useState(10000);
  const [isUpdating, setIsUpdating] = useState(true);
  
  // Get token and user info
  const token = localStorage.getItem('token');
  const userInfo = token ? jwtDecode(token).userInfo : null;

  // Calculate security score based on metrics
  useEffect(() => {
    if (logs.metrics.totalLogs > 0) {
      const calculatedScore = Math.round((logs.metrics.normalLogs / logs.metrics.totalLogs) * 100);
      setSecurityScore(calculatedScore);
    } else {
      setSecurityScore(100); // Default to 100% if no logs
    }
  }, [logs.metrics]);

  // Fetch all data needed for the dashboard
  const fetchDashboardData = useCallback(async () => {
    try {
      setError(null);
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      // Fetch all required data in parallel
      const [logsResponse, metricsResponse, topAgentsResponse, alertTrendsResponse] = await Promise.all([
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
        }),
        fetch(`${API_URL}/api/logs/top-agents`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch(`${API_URL}/api/logs/alert-trends`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
      ]);

      // Check if any of the requests failed
      if (!logsResponse.ok || !metricsResponse.ok || !topAgentsResponse.ok || !alertTrendsResponse.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      // Parse JSON responses
      const [logsData, metricsData, topAgentsData, alertTrendsData] = await Promise.all([
        logsResponse.json(),
        metricsResponse.json(),
        topAgentsResponse.json(),
        alertTrendsResponse.json()
      ]);

      // Update logs and metrics data
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
      
      // Update top agents data
      setTopAgents(topAgentsData || []);
      
      // Update alert trends data
      setAlertTrends(alertTrendsData || []);
      
      // Update chart data
      setChartData(prevData => {
        // For the first data point, just show 10 new logs rather than the entire history
        const isFirstDataPoint = prevData.totalLogsHistory.length === 0;
        // Get previous total logs from history or set a reasonable default
        const previousTotal = isFirstDataPoint
          ? metricsData.totalLogs - 10  // This will make the first bar show exactly 10
          : (prevData.totalLogsHistory.length > 0 
            ? prevData.totalLogsHistory[prevData.totalLogsHistory.length - 1] 
            : 0);
        
        // Calculate new logs in this interval
        const newLogs = Math.max(0, metricsData.totalLogs - previousTotal);
        
        // Current time for the timestamp
        const currentTime = new Date().toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit' 
        });
        
        // Update timestamps - add new timestamp
        const newTimestamps = [...prevData.timestamps, currentTime];
        if (newTimestamps.length > 10) {
          newTimestamps.shift(); // Remove oldest timestamp if we have more than 10
        }
        
        // Update new logs counts - add new count
        const newLogCounts = [...prevData.newLogCounts, newLogs];
        if (newLogCounts.length > 10) {
          newLogCounts.shift(); // Remove oldest count if we have more than 10
        }
        
        // Update total logs history
        const newTotalLogsHistory = [...prevData.totalLogsHistory, metricsData.totalLogs];
        if (newTotalLogsHistory.length > 11) { // Keep 11 to calculate 10 differences
          newTotalLogsHistory.shift();
        }
        
        return {
          timestamps: newTimestamps,
          newLogCounts: newLogCounts,
          totalLogsHistory: newTotalLogsHistory
        };
      });
      
      // Try to fetch ticket count, but use default if fails
      try {
        const ticketsResponse = await fetch(`${API_URL}/api/tickets/count`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (ticketsResponse.ok) {
          const ticketsData = await ticketsResponse.json();
          setTicketCount(ticketsData.count || 7);
        }
      } catch (error) {
        console.log('Using default ticket count');
        // Keep using default ticket count
      }
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Show welcome toast message for user
  useEffect(() => {
    if (userInfo) {
      const toastShown = sessionStorage.getItem('toastShown');
      if (!toastShown) {
        toast.success(`Welcome to SOC Dashboard, ${userInfo.plan} Plan User!`, {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
        });
        sessionStorage.setItem('toastShown', 'true');
      }
    }
  }, [userInfo]);

  // Set up polling interval for data updates
  useEffect(() => {
    let intervalId;

    const initFetch = async () => {
      await fetchDashboardData();
      if (isUpdating) {
        intervalId = setInterval(fetchDashboardData, updateInterval);
      }
    };

    initFetch();

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [updateInterval, isUpdating, fetchDashboardData]);

  // Loading state when no data is present
  if (loading && !logs.items.length) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh'
        }}
      >
        <CircularProgress size={60} thickness={4} sx={{ mb: 2 }} />
        <Typography variant="h6" sx={{ mb: 1 }}>Loading Dashboard</Typography>
        <Typography variant="body2" color="text.secondary">
          Initializing security analytics...
        </Typography>
      </Box>
    );
  }

  // Render content with skeleton placeholders when loading
  const renderContent = (isLoading, content) => {
    return isLoading ? (
      <Skeleton variant="rectangular" height="100%" animation="wave" />
    ) : content;
  };

  return (
    <Box sx={{ flexGrow: 1 , pt: '50px'}}>
      <ToastContainer />
      <Container maxWidth="xl">
        <Box p={3}>
          {/* Dashboard Header */}
          <Paper
            elevation={1}
            sx={{
              p: 2,
              mb: 3,
              display: 'flex',
              alignItems: 'center',
              borderRadius: 2,
              background: theme => theme.palette.mode === 'dark' 
                ? 'linear-gradient(90deg, rgb(0, 9, 10) 0%, rgb(11, 12, 12) 100%)' 
                : 'linear-gradient(90deg, rgb(245, 249, 250) 0%, rgb(82, 208, 247) 100%)'
            }}
          >
            <Typography variant="h4" component="h1" fontWeight="bold" color="#316fad">
              Security Dashboard
            </Typography>
          </Paper>
          
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>Error: {error}</Alert>
          )}

          {/* Main Dashboard Content */}
          <Grid container spacing={3}>
            {/* Row 1: Event Analysis & Security Score */}
            <Grid item xs={12} md={6}>
              {renderContent(loading, 
                <EventAnalysisFunnel metricsData={logs.metrics} />
              )}
            </Grid>
            <Grid item xs={12} md={6}>
              {renderContent(loading, 
                <SecurityScoreGauge securityScore={securityScore} />
              )}
            </Grid>

            {/* Row 2: EPS Gauge & Top Agents */}
            <Grid item xs={12} md={6}>
              {renderContent(loading, 
                <EventsPerSecondGauge chartData={chartData} />
              )}
            </Grid>
            <Grid item xs={12} md={6}>
              {renderContent(loading, 
                <TopAgentsVisualization topAgents={topAgents} />
              )}
            </Grid>

            {/* Row 3: Charts - Bar & Line */}
            <Grid item xs={12}>
              {renderContent(loading, 
                <Paper 
                  elevation={1}
                  sx={{ 
                    p: 2,
                    borderRadius: 2,
                    boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)'
                  }}
                >
                  <Typography variant="h5" gutterBottom>
                    Real-time Log Analysis
                  </Typography>
                  <Charts />
                </Paper>
              )}
            </Grid>

            {/* Row 4: World Map */}
            <Grid item xs={12}>
              {renderContent(loading, 
                <WorldConnectionMap />
              )}
            </Grid>
            
            {/* Row 5: Alert Trends */}
            <Grid item xs={12}>
              {renderContent(loading, 
                <AlertTrendsChart alertTrends={alertTrends} />
              )}
            </Grid>

            {/* Row 6: Recent Logs */}
            <Grid item xs={12}>
              {renderContent(loading, 
                <Paper 
                  elevation={1}
                  sx={{ 
                    p: 2,
                    borderRadius: 2,
                    boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)'
                  }}
                >
                  <Typography variant="h5" gutterBottom>
                    Recent Security Logs
                  </Typography>
                  <RecentLogs logs={logs.items} />
                </Paper>
              )}
            </Grid>
          </Grid>
        </Box>
      </Container>
    </Box>
  );
};

export default Dashboard;