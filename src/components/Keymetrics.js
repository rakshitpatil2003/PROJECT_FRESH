import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Grid } from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { API_URL } from '../config';

const KeyMetrics = () => {
  const [metrics, setMetrics] = useState({
    totalLogs: 0,
    majorLogs: 0,
    normalLogs: 0
  });

  const fetchMetrics = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/logs/metrics`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch metrics');
      }

      const data = await response.json();
      setMetrics({
        totalLogs: data.totalLogs,
        majorLogs: data.majorLogs,
        normalLogs: data.totalLogs - data.majorLogs
      });
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const metricsConfig = [
    {
      title: 'Total Logs',
      value: metrics.totalLogs,
      Icon: AssessmentIcon,
      color: '#2196f3',
      bgColor: '#e3f2fd'
    },
    {
      title: 'Major Logs',
      value: metrics.majorLogs,
      Icon: WarningAmberIcon,
      color: '#f44336',
      bgColor: '#ffebee'
    },
    {
      title: 'Normal Logs',
      value: metrics.normalLogs,
      Icon: CheckCircleIcon,
      color: '#4caf50',
      bgColor: '#e8f5e9'
    }
  ];

  return (
    <Grid container spacing={3}>
      {metricsConfig.map((metric, index) => {
        const { Icon } = metric;
        return (
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
                  transform: 'translateY(-4px)'
                }
              }}
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
                  <Icon
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
        );
      })}
    </Grid>
  );
};

export default KeyMetrics;
