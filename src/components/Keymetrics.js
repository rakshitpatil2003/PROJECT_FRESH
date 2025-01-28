import React from 'react';
import { Box, Typography, Paper, Grid } from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const KeyMetrics = ({ logs }) => {
  // Process log levels based on the rule level property
  const processLogLevel = (log) => {
    const level = log?.rule?.level;
    if (typeof level === 'number') return level;
    if (typeof level === 'string') return parseInt(level, 10);
    return -1; // Default to -1 if level is invalid
  };

  // Calculate metrics
  const totalLogs = logs.length;
  const majorLogs = logs.filter(log => processLogLevel(log) >= 12).length;
  const normalLogs = totalLogs - majorLogs;

  const metrics = [
    {
      title: 'Total Logs',
      value: totalLogs,
      Icon: AssessmentIcon,
      color: '#2196f3',
      bgColor: '#e3f2fd'
    },
    {
      title: 'Major Logs',
      value: majorLogs,
      Icon: WarningAmberIcon,
      color: '#f44336',
      bgColor: '#ffebee'
    },
    {
      title: 'Normal Logs',
      value: normalLogs,
      Icon: CheckCircleIcon,
      color: '#4caf50',
      bgColor: '#e8f5e9'
    }
  ];

  return (
    <Grid container spacing={3}>
      {metrics.map((metric, index) => {
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