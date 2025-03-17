import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Box, 
  Paper, 
  Grid, 
  CircularProgress, 
  Alert,
  Card,
  CardContent,
  useTheme,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button
} from '@mui/material';
import KeyMetrics from './Keymetrics';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import LockIcon from '@mui/icons-material/Lock';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import { API_URL } from '../config';
import { BarChart, LineChart, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, Bar, Line } from 'recharts';

const ThreatHunting = () => {
  const theme = useTheme();
  const [authMetrics, setAuthMetrics] = useState({
    success: 0,
    failure: 0
  });
  const [topAgents, setTopAgents] = useState([]);
  const [alertTrends, setAlertTrends] = useState([]);
  const [actionMetrics, setActionMetrics] = useState([]);
  const [actionTrends, setActionTrends] = useState([]);
  const [topAgentsByAction, setTopAgentsByAction] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    action: '',
    startTime: '',
    agentName: ''
  });

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Authentication token not found');
        }

        // Fetch authentication metrics (keeping your original code)
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

        // Fetch top agents (keeping your original code)
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

        // Fetch alert trends (keeping your original code)
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

        // Fetch action-based logs data (new)
        const { action, startTime, agentName } = filters;
        const queryParams = new URLSearchParams();
        if (action) queryParams.append('action', action);
        if (startTime) queryParams.append('startTime', startTime);
        if (agentName) queryParams.append('agentName', agentName);

        const actionLogsResponse = await fetch(`${API_URL}/api/logs/action-logs?${queryParams.toString()}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!actionLogsResponse.ok) {
          throw new Error(`HTTP error! Status: ${actionLogsResponse.status}`);
        }

        const actionLogsData = await actionLogsResponse.json();
        
        // Format action metrics for pie chart
        const formattedActionMetrics = actionLogsData.actionMetrics.map(item => ({
          name: item._id,
          value: item.count
        }));
        setActionMetrics(formattedActionMetrics);
        
        // Set action trends
        setActionTrends(actionLogsData.actionTrends);
        
        // Format top agents by action
        const formattedTopAgentsByAction = actionLogsData.topAgentsByAction.map(item => ({
          agent: item._id.agent || 'Unknown',
          action: item._id.action || 'Unknown',
          count: item.count
        }));
        setTopAgentsByAction(formattedTopAgentsByAction);

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
  }, [filters]);

  // Handle filter changes
  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Apply filters
  const applyFilters = () => {
    // The useEffect will handle the refetch based on filter state
  };

  // Authentication metrics card (keeping your original code)
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

  // Action Distribution Pie Chart (new)
  const renderActionDistribution = () => {
    if (!actionMetrics.length) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" height="200px">
          <Typography variant="body1" color="text.secondary">No action data available</Typography>
        </Box>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={actionMetrics}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
            nameKey="name"
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          >
            {actionMetrics.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => [value, 'Count']} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  // Action Trends Over Time (new)
  const renderActionTrends = () => {
    if (!actionTrends.length) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" height="200px">
          <Typography variant="body1" color="text.secondary">No action trend data available</Typography>
        </Box>
      );
    }

    // Get unique actions to determine which lines to display
    const uniqueActions = new Set();
    actionTrends.forEach(item => {
      Object.keys(item).forEach(key => {
        if (key !== 'date') uniqueActions.add(key);
      });
    });

    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={actionTrends}
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
          {Array.from(uniqueActions).map((action, index) => (
            <Line
              key={action}
              type="monotone"
              dataKey={action}
              name={action}
              stroke={COLORS[index % COLORS.length]}
              activeDot={{ r: 8 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  };

  // Top Agents by Action (new)
  const renderTopAgentsByAction = () => {
    if (!topAgentsByAction.length) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" height="200px">
          <Typography variant="body1" color="text.secondary">No agent action data available</Typography>
        </Box>
      );
    }

    // Group by agent and stack by action
    const agentMap = new Map();
    topAgentsByAction.forEach(item => {
      if (!agentMap.has(item.agent)) {
        agentMap.set(item.agent, { agent: item.agent });
      }
      agentMap.get(item.agent)[item.action] = item.count;
    });

    const chartData = Array.from(agentMap.values()).slice(0, 5);

    // Get all unique actions for the stacked bar chart
    const uniqueActions = new Set();
    topAgentsByAction.forEach(item => {
      uniqueActions.add(item.action);
    });

    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={chartData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="agent" />
          <YAxis />
          <Tooltip />
          <Legend />
          {Array.from(uniqueActions).map((action, index) => (
            <Bar 
              key={action}
              dataKey={action}
              stackId="a"
              fill={COLORS[index % COLORS.length]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  };

  // Filter section (new)
  const renderFilters = () => {
    return (
      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          <FilterAltIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Filter Action Logs
        </Typography>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              label="Action"
              name="action"
              value={filters.action}
              onChange={handleFilterChange}
              placeholder="e.g. pass, block"
              variant="outlined"
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              label="Agent Name"
              name="agentName"
              value={filters.agentName}
              onChange={handleFilterChange}
              placeholder="e.g. agent1"
              variant="outlined"
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Start Date"
              name="startTime"
              type="datetime-local"
              value={filters.startTime}
              onChange={handleFilterChange}
              InputLabelProps={{ shrink: true }}
              variant="outlined"
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <Button 
              fullWidth
              variant="contained" 
              color="primary"
              onClick={applyFilters}
              startIcon={<FilterAltIcon />}
            >
              Apply
            </Button>
          </Grid>
        </Grid>
      </Paper>
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

          {renderFilters()}

          <Box mb={4}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
              Authentication Status
            </Typography>
            {renderAuthCards()}
          </Box>

          <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
            Action Analysis
          </Typography>
          <Grid container spacing={4} mb={4}>
            <Grid item xs={12} md={6}>
              <Card raised={true}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Action Distribution
                  </Typography>
                  {renderActionDistribution()}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card raised={true}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Action Trends Over Time
                  </Typography>
                  {renderActionTrends()}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Card raised={true}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Top 5 Agents by Action
                  </Typography>
                  {renderTopAgentsByAction()}
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