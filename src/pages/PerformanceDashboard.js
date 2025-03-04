import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Grid, Paper } from '@mui/material';
import ReactECharts from 'echarts-for-react';
import { API_URL } from '../config';

const PerformanceDashboard = () => {
  const [metricsData, setMetricsData] = useState({
    totalLogs: 0,
    majorLogs: 0, // Rule level > 12
    normalLogs: 0, // Rule level 1-11
  });
  const [securityScore, setSecurityScore] = useState(0);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch metrics data
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
      setMetricsData({
        totalLogs: data.totalLogs || 0,
        majorLogs: data.majorLogs || 0,
        normalLogs: data.normalLogs || 0
      });
      
      // Calculate security score (percentage of normal logs from total logs)
      const calculatedScore = data.totalLogs > 0 
        ? Math.round((data.normalLogs / data.totalLogs) * 100) 
        : 0;
      
      setSecurityScore(calculatedScore);
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
    // Set interval to fetch data every 10 seconds
    const interval = setInterval(fetchMetrics, 10000);
    return () => clearInterval(interval);
  }, []);

  // ECharts options for the funnel chart
  const getFunnelChartOptions = () => {
    return {
      title: {
        text: 'Event Analysis',
        left: 'center'
      },
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b} : {c}'
      },
      legend: {
        bottom: '5%',
        left: 'center',
        data: ['Total Activities', 'Detected (Rule Level 1-11)', 'Alerts (Rule Level >12)']
      },
      series: [
        {
          name: 'Event Analysis',
          type: 'funnel',
          left: '10%',
          top: 60,
          bottom: 60,
          width: '80%',
          minSize: '0%',
          maxSize: '100%',
          sort: 'descending',
          gap: 2,
          label: {
            show: true,
            position: 'inside'
          },
          emphasis: {
            label: {
              fontSize: 20
            }
          },
          itemStyle: {
            borderColor: '#fff',
            borderWidth: 1
          },
          data: [
            { value: metricsData.totalLogs, name: 'Total Activities', itemStyle: { color: '#4CAF50' } },
            { value: metricsData.normalLogs, name: 'Detected (Rule Level 1-11)', itemStyle: { color: '#2196F3' } },
            { value: metricsData.majorLogs, name: 'Alerts (Rule Level >12)', itemStyle: { color: '#F44336' } }
          ]
        }
      ]
    };
  };

  // ECharts options for the security score gauge chart
  const getSecurityScoreOptions = () => {
    return {
      tooltip: {
        formatter: '{a} <br/>{b} : {c}%',
      },
      series: [
        {
          name: 'Security Score',
          type: 'gauge',
          min: 0,
          max: 100,
          splitNumber: 4,
          axisLine: {
            lineStyle: {
              width: 10,
              color: [
                [0.25, '#FF6B6B'], // Poor (0–25)
                [0.5, '#FFD166'],  // Fair (26–50)
                [0.75, '#06D6A0'], // Good (51–75)
                [1, '#118AB2'],    // Excellent (76–100)
              ],
            },
          },
          axisTick: {
            length: 12,
            lineStyle: {
              color: 'auto',
            },
          },
          splitLine: {
            length: 20,
            lineStyle: {
              color: 'auto',
            },
          },
          detail: {
            formatter: '{value}%',
            fontSize: 20,
            offsetCenter: [0, '70%'],
          },
          data: [{ value: securityScore, name: 'Security Score' }],
        },
      ],
    };
  };

  // Security score interpretation
  const getScoreCategory = (score) => {
    if (score >= 80) return { category: 'Protected', color: '#118AB2' };
    if (score >= 60) return { category: 'Moderate', color: '#06D6A0' };
    if (score >= 40) return { category: 'At Risk', color: '#FFD166' };
    return { category: 'Vulnerable', color: '#FF6B6B' };
  };

  const scoreInfo = getScoreCategory(securityScore);

  return (
    <Box p={4}>
      <Typography variant="h4" gutterBottom>Performance Dashboard</Typography>
      
      <Grid container spacing={3}>
        {/* Funnel Chart */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Event Analysis</Typography>
              <ReactECharts
                option={getFunnelChartOptions()}
                style={{ height: '400px', width: '100%' }}
                notMerge={true}
                lazyUpdate={true}
              />
            </CardContent>
          </Card>
        </Grid>
        
        {/* Security Score */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Security Score</Typography>
              <ReactECharts
                option={getSecurityScoreOptions()}
                style={{ height: '400px', width: '100%' }}
                notMerge={true}
                lazyUpdate={true}
              />
              
              {/* Score interpretation */}
              <Box mt={2}>
                <Typography variant="h6" align="center" 
                  sx={{ color: scoreInfo.color, fontWeight: 'bold' }}>
                  {scoreInfo.category} ({securityScore}%)
                </Typography>
                
                <Paper sx={{ p: 2, mt: 2, backgroundColor: '#f5f5f5' }}>
                  <Typography variant="subtitle2" gutterBottom>Score Interpretation:</Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Box display="flex" alignItems="center">
                        <Box sx={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: '#118AB2', mr: 1 }} />
                        <Typography variant="body2">80-100: Protected</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box display="flex" alignItems="center">
                        <Box sx={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: '#06D6A0', mr: 1 }} />
                        <Typography variant="body2">60-79: Moderate</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box display="flex" alignItems="center">
                        <Box sx={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: '#FFD166', mr: 1 }} />
                        <Typography variant="body2">40-59: At Risk</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box display="flex" alignItems="center">
                        <Box sx={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: '#FF6B6B', mr: 1 }} />
                        <Typography variant="body2">0-39: Vulnerable</Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PerformanceDashboard;