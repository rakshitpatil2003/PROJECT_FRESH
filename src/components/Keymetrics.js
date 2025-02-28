import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Grid, Alert } from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { API_URL } from '../config';
import { useNavigate } from 'react-router-dom';

const KeyMetrics = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState({
    totalLogs: 0,
    majorLogs: 0,
    normalLogs: 0
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(`${API_URL}/api/logs/metrics`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Metrics data:', data);
      
      // Update metrics with the unique counts from backend
      setMetrics({
        totalLogs: data.totalLogs,
        majorLogs: data.majorLogs,
        normalLogs: data.normalLogs
      });
      
      setError(null);
    } catch (error) {
      console.error('Error fetching metrics:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10000);
    return () => clearInterval(interval);
  }, []);
   
  const metricsConfig = [
    {
      title: 'Total Logs',
      value: metrics.totalLogs,
      Icon: AssessmentIcon,
      color: '#2196f3',
      bgColor: '#e3f2fd',
      link: null
    },
    {
      title: 'Major Logs',
      value: metrics.majorLogs,
      Icon: WarningAmberIcon,
      color: '#f44336',
      bgColor: '#ffebee',
      link: '/major-logs'
    },
    {
      title: 'Normal Logs',
      value: metrics.normalLogs,
      Icon: CheckCircleIcon,
      color: '#4caf50',
      bgColor: '#e8f5e9',
      link: null
    }
  ];

  const handleCardClick = (link) => {
    if (link) {
      navigate(link);
    }
  };

  return (
    <Grid container spacing={3}>
      {error && (
        <Grid item xs={12}>
          <Alert severity="error">{error}</Alert>
        </Grid>
      )}
      {metricsConfig.map((metric, index) => (
        <Grid item xs={12} sm={4} key={index}>
          <Paper
            elevation={2}
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              backgroundColor: 'white',
              transition: 'transform 0.2s ease-in-out',
              '&:hover': {
                transform: 'translateY(-4px)',
                cursor: metric.link ? 'pointer' : 'default',
                boxShadow: metric.link ? 3 : 2
              }
            }}
            onClick={() => handleCardClick(metric.link)}
          >
            <Box display="flex" alignItems="center" mb={2}>
              <Box
                sx={{
                  p: 1,
                  borderRadius: 1,
                  backgroundColor: metric.bgColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <metric.Icon
                  sx={{
                    color: metric.color,
                    fontSize: 24
                  }}
                />
              </Box>
              <Typography
                variant="h6"
                sx={{
                  ml: 2,
                  color: 'text.primary',
                  fontWeight: 600
                }}
              >
                {metric.title}
              </Typography>
            </Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 'bold',
                color: metric.color
              }}
            >
              {metric.value.toLocaleString()}
            </Typography>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
};

export default KeyMetrics;