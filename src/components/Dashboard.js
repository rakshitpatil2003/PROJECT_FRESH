import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar
} from 'recharts';
import {
  Box, Card, CardContent, Typography, Grid, Alert, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, CircularProgress, Button
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom'; // Import useNavigate

const Dashboard = () => {
  const [logData, setLogData] = useState({
    levelDistribution: [],
    timeDistribution: [],
    recentLogs: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate(); // Use useNavigate for navigation

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching logs...');
      const response = await fetch('http://localhost:5000/api/logs', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch logs');
      }

      console.log('Received log data:', data);
      setLogData({
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

  useEffect(() => {
    fetchLogs(); // Fetch logs immediately when the component mounts
    const interval = setInterval(fetchLogs, 10000); // Fetch logs every 10 seconds
    return () => clearInterval(interval); // Cleanup interval on unmount
  }, []);

  const handleViewLogDetails = () => {
    // Pass logs to the LogDetails component via state
    navigate('/logs', { state: { logs: logData.recentLogs } });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>Loading logs...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={4}>
        <Alert severity="error">
          Error loading logs: {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={4}>
      <Typography variant="h4" gutterBottom>
        Log Analysis Dashboard
      </Typography>

      {/* Navigation Buttons */}
      <Box display="flex" gap={2} mb={4}>
        <Button
          variant="contained"
          onClick={handleViewLogDetails} // Use onClick to navigate with state
          sx={{ backgroundColor: '#1976d2', color: '#fff' }}
        >
          Log Details
        </Button>
        <Button
          variant="contained"
          component={Link}
          to="/analytics"
          sx={{ backgroundColor: '#1976d2', color: '#fff' }}
        >
          Advanced Analytics
        </Button>
      </Box>

      {/* Rest of the Dashboard content */}
      <Grid container spacing={4}>
        {/* Log Level Distribution (Pie Chart) */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Log Level Distribution
              </Typography>
              {logData.levelDistribution.length === 0 ? (
                <Alert severity="info">No log level data available</Alert>
              ) : (
                <PieChart width={400} height={300}>
                  <Pie
                    data={logData.levelDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {logData.levelDistribution.map((entry, index) => (
                      <Cell key={index} fill={`#${Math.floor(Math.random() * 16777215).toString(16)}`} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Log Volume Over Time */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Log Volume Over Time
              </Typography>
              {logData.timeDistribution.length === 0 ? (
                <Alert severity="info">No time distribution data available</Alert>
              ) : (
                <LineChart width={400} height={300} data={logData.timeDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="count" stroke="#8884d8" />
                </LineChart>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Logs List */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Log Sources
              </Typography>
              {logData.recentLogs.length === 0 ? (
                <Alert severity="info">No recent logs available</Alert>
              ) : (
                <BarChart width={800} height={300} data={logData.recentLogs}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="source" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#82ca9d" />
                </BarChart>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Logs Table */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Logs
              </Typography>
              {logData.recentLogs.length === 0 ? (
                <Alert severity="info">No recent logs available</Alert>
              ) : (
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Timestamp</TableCell>
                        <TableCell>Level</TableCell>
                        <TableCell>Source</TableCell>
                        <TableCell>Message</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {logData.recentLogs.map((log, index) => (
                        <TableRow key={index}>
                          <TableCell>{log.timestamp}</TableCell>
                          <TableCell>{log.level}</TableCell>
                          <TableCell>{log.source}</TableCell>
                          <TableCell>{log.message}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;