import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Skeleton,
  Tabs,
  Tab
} from '@mui/material';
import ReactECharts from 'echarts-for-react';
import { API_URL } from '../config';

const AdvancedAnalytics = () => {
  // State management
  const [summaryData, setSummaryData] = useState(null);
  const [chartData, setChartData] = useState({
    logLevelsOverTime: null,
    protocolDistribution: null,
    topSourceIPs: null,
    levelDistribution: null,
    networkConnections: null,
    ruleDescriptions: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('24h');
  const [protocolFilter, setProtocolFilter] = useState('all');
  const [logType, setLogType] = useState('all');
  const [activeTab, setActiveTab] = useState(0);

  // Handle changes
  const handleLogTypeChange = (event) => {
    setLogType(event.target.value);
  };

  const handleTimeRangeChange = (event) => {
    setTimeRange(event.target.value);
  };

  const handleProtocolFilterChange = (event) => {
    setProtocolFilter(event.target.value);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Fetch summary data (optimized to use server-side aggregation)
  const fetchSummaryData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(
        `${API_URL}/api/logs/summary?timeRange=${timeRange}&logType=${logType}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      setSummaryData(data);
      setError(null);
    } catch (error) {
      console.error('Error fetching summary data:', error);
      setError(error.message);
    }
  }, [timeRange, logType]);

  // Fetch chart data (each chart can be fetched separately)
  const fetchChartData = useCallback(async (chartType) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      // Using protocol filter only for relevant charts
      const protocolParam = ['protocolDistribution', 'networkConnections'].includes(chartType) 
        ? `&protocol=${protocolFilter}` 
        : '';

      const response = await fetch(
        `${API_URL}/api/logs/charts/${chartType}?timeRange=${timeRange}&logType=${logType}${protocolParam}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      
      setChartData(prevData => ({
        ...prevData,
        [chartType]: data
      }));
    } catch (error) {
      console.error(`Error fetching ${chartType} chart data:`, error);
      // We don't set the main error state here to avoid disrupting the whole view
      // Just leave the specific chart data as null
    }
  }, [timeRange, logType, protocolFilter]);

  // Fetch all charts data 
  const fetchAllChartData = useCallback(async () => {
    setLoading(true);
    
    // Fetch summary first for immediate display
    await fetchSummaryData();
    
    // Fetch each chart in parallel
    const chartTypes = [
      'logLevelsOverTime',
      'protocolDistribution',
      'topSourceIPs',
      'levelDistribution',
      'networkConnections',
      'ruleDescriptions'
    ];
    
    await Promise.all(chartTypes.map(chartType => fetchChartData(chartType)));
    
    setLoading(false);
  }, [fetchSummaryData, fetchChartData]);

  // Initial data loading
  useEffect(() => {
    fetchAllChartData();
    
    // Refresh data every 60 seconds (increased from 30 for better performance)
    const interval = setInterval(fetchAllChartData, 60000);
    return () => clearInterval(interval);
  }, [fetchAllChartData]);

  // Chart options generators - Using memoization for performance
  const levelTimeOptions = useMemo(() => {
    if (!chartData.logLevelsOverTime) return null;

    return {
      title: {
        text: 'Log Levels Over Time',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' }
      },
      legend: {
        data: ['Notice (1-7)', 'Warning (8-11)', 'Critical (12-16)'],
        bottom: 10
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: chartData.logLevelsOverTime.timeLabels || []
      },
      yAxis: {
        type: 'value'
      },
      series: [
        {
          name: 'Notice (1-7)',
          type: 'line',
          stack: 'Total',
          areaStyle: { opacity: 0.3 },
          emphasis: { focus: 'series' },
          color: '#4caf50',
          data: chartData.logLevelsOverTime.notice || []
        },
        {
          name: 'Warning (8-11)',
          type: 'line',
          stack: 'Total',
          areaStyle: { opacity: 0.3 },
          emphasis: { focus: 'series' },
          color: '#ffc107',
          data: chartData.logLevelsOverTime.warning || []
        },
        {
          name: 'Critical (12-16)',
          type: 'line',
          stack: 'Total',
          areaStyle: { opacity: 0.3 },
          emphasis: { focus: 'series' },
          color: '#f44336',
          data: chartData.logLevelsOverTime.critical || []
        }
      ]
    };
  }, [chartData.logLevelsOverTime]);

  const protocolPieOptions = useMemo(() => {
    if (!chartData.protocolDistribution) return null;

    return {
      title: {
        text: 'Protocol Distribution',
        left: 'center'
      },
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)'
      },
      legend: {
        type: 'scroll',
        orient: 'vertical',
        right: 10,
        top: 20,
        bottom: 20
      },
      series: [
        {
          name: 'Protocol',
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: false,
            position: 'center'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 16,
              fontWeight: 'bold'
            }
          },
          labelLine: {
            show: false
          },
          data: chartData.protocolDistribution || []
        }
      ]
    };
  }, [chartData.protocolDistribution]);

  const topSourceIPsOptions = useMemo(() => {
    if (!chartData.topSourceIPs) return null;
    
    // Get max value for coloring
    const maxValue = Math.max(...(chartData.topSourceIPs || []).map(item => item.value));

    return {
      title: {
        text: 'Top Source IPs',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'value',
        boundaryGap: [0, 0.01]
      },
      yAxis: {
        type: 'category',
        data: (chartData.topSourceIPs || []).map(item => item.name),
        axisLabel: {
          formatter: function (value) {
            return value.length > 15 ? value.substring(0, 12) + '...' : value;
          }
        }
      },
      series: [
        {
          name: 'Count',
          type: 'bar',
          data: (chartData.topSourceIPs || []).map(item => ({
            value: item.value,
            itemStyle: {
              color: function() {
                const ratio = item.value / maxValue;
                return {
                  type: 'linear',
                  x: 0, y: 0, x2: 1, y2: 0,
                  colorStops: [{
                    offset: 0, color: '#2196f3'
                  }, {
                    offset: 1, color: ratio > 0.7 ? '#f44336' : '#2196f3'
                  }]
                };
              }()
            }
          }))
        }
      ]
    };
  }, [chartData.topSourceIPs]);

  const levelDistributionOptions = useMemo(() => {
    if (!chartData.levelDistribution) return null;

    return {
      title: {
        text: 'Log Level Distribution',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: (chartData.levelDistribution || []).map(item => item.name)
      },
      yAxis: {
        type: 'value'
      },
      series: [
        {
          name: 'Count',
          type: 'bar',
          data: (chartData.levelDistribution || []).map(item => ({
            value: item.value,
            itemStyle: {
              color: function() {
                const level = parseInt(item.name) || 0;
                if (level >= 12) return '#f44336'; // Critical
                if (level >= 8) return '#ffc107';  // Warning
                return '#4caf50';                  // Notice
              }()
            }
          })),
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }
      ]
    };
  }, [chartData.levelDistribution]);

  // Replacing Sankey with Force-Directed Graph
  const networkConnectionsOptions = useMemo(() => {
    if (!chartData.networkConnections) return null;

    // Parse data into force graph format
    const { nodes, links } = chartData.networkConnections;

    return {
      title: {
        text: 'Network Connections',
        left: 'center'
      },
      tooltip: {
        formatter: function(params) {
          if (params.dataType === 'node') {
            return `IP: ${params.data.name}<br/>Type: ${params.data.category}<br/>Connections: ${params.data.value}`;
          } else {
            return `Source: ${params.data.source}<br/>Target: ${params.data.target}<br/>Count: ${params.data.value}`;
          }
        }
      },
      legend: {
        data: ['Source', 'Target'],
        bottom: 5
      },
      series: [{
        type: 'graph',
        layout: 'force',
        animation: false,
        draggable: true,
        data: nodes,
        links: links,
        roam: true,
        label: {
          show: true,
          position: 'right',
          formatter: '{b}'
        },
        force: {
          repulsion: 100,
          gravity: 0.1,
          edgeLength: 50,
          layoutAnimation: false
        },
        lineStyle: {
          color: 'source',
          curveness: 0.3,
          width: function(params) {
            // Scale line width by value
            return Math.max(1, Math.min(5, params.data.value / 10));
          }
        },
        categories: [
          { name: 'Source', itemStyle: { color: '#5470c6' } },
          { name: 'Target', itemStyle: { color: '#91cc75' } }
        ],
      }]
    };
  }, [chartData.networkConnections]);

  const ruleDescriptionOptions = useMemo(() => {
    if (!chartData.ruleDescriptions) return null;

    return {
      title: {
        text: 'Top Rule Descriptions',
        left: 'center'
      },
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c}'
      },
      series: [
        {
          type: 'treemap',
          data: (chartData.ruleDescriptions || []).map(item => ({
            name: item.name.length > 30 ? item.name.substring(0, 27) + '...' : item.name,
            value: item.value,
            tooltip: {
              formatter: function() {
                return item.name + ': ' + item.value;
              }
            }
          })),
          label: {
            show: true,
            formatter: '{b}'
          },
          breadcrumb: { show: false },
          itemStyle: {
            gapWidth: 1
          }
        }
      ]
    };
  }, [chartData.ruleDescriptions]);

  // Get distinct protocols for filter - simplified
  const distinctProtocols = useMemo(() => {
    if (!chartData.protocolDistribution) return [];
    return chartData.protocolDistribution.map(item => item.name);
  }, [chartData.protocolDistribution]);

  // Render loading state with skeleton UI for better UX
  if (loading && !summaryData) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" height="500px">
          <CircularProgress />
          <Typography variant="body2" sx={{ mt: 2, ml: 2 }}>
            Loading dashboard data...
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Advanced Analytics
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Log Type</InputLabel>
              <Select
                value={logType}
                label="Log Type"
                onChange={handleLogTypeChange}
              >
                <MenuItem value="all">All Logs</MenuItem>
                <MenuItem value="fortigate">Fortigate Logs</MenuItem>
                <MenuItem value="other">Suricata/Sysmon Logs</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Time Range</InputLabel>
              <Select
                value={timeRange}
                label="Time Range"
                onChange={handleTimeRangeChange}
              >
                <MenuItem value="1h">Last hour</MenuItem>
                <MenuItem value="3h">Last 3 hours</MenuItem>
                <MenuItem value="12h">Last 12 hours</MenuItem>
                <MenuItem value="24h">Last 24 hours</MenuItem>
                <MenuItem value="7d">Last 7 days</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Protocol</InputLabel>
              <Select
                value={protocolFilter}
                label="Protocol"
                onChange={handleProtocolFilterChange}
              >
                <MenuItem value="all">All Protocols</MenuItem>
                {distinctProtocols.map(protocol => (
                  <MenuItem key={protocol} value={protocol}>{protocol}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Grid>

        <Grid item xs={12} md={4} sx={{ textAlign: 'right' }}>
          <Typography variant="body2" color="textSecondary">
            {summaryData ? `Showing data from ${summaryData.total.toLocaleString()} logs` : 'No logs available'}
          </Typography>
        </Grid>
      </Grid>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              bgcolor: '#e8f5e9'
            }}
          >
            <Typography variant="h6" gutterBottom>
              Notice
            </Typography>
            {summaryData ? (
              <Typography variant="h4" color="success.main">
                {summaryData.notice.toLocaleString()}
              </Typography>
            ) : (
              <Skeleton variant="rectangular" width={80} height={40} animation="wave" />
            )}
            <Typography variant="caption" color="textSecondary">
              Levels 1-7
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              bgcolor: '#fff8e1'
            }}
          >
            <Typography variant="h6" gutterBottom>
              Warning
            </Typography>
            {summaryData ? (
              <Typography variant="h4" color="warning.main">
                {summaryData.warning.toLocaleString()}
              </Typography>
            ) : (
              <Skeleton variant="rectangular" width={80} height={40} animation="wave" />
            )}
            <Typography variant="caption" color="textSecondary">
              Levels 8-11
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              bgcolor: '#ffebee'
            }}
          >
            <Typography variant="h6" gutterBottom>
              Critical
            </Typography>
            {summaryData ? (
              <Typography variant="h4" color="error.main">
                {summaryData.critical.toLocaleString()}
              </Typography>
            ) : (
              <Skeleton variant="rectangular" width={80} height={40} animation="wave" />
            )}
            <Typography variant="caption" color="textSecondary">
              Levels 12-16
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              bgcolor: '#e3f2fd'
            }}
          >
            <Typography variant="h6" gutterBottom>
              Total Logs
            </Typography>
            {summaryData ? (
              <Typography variant="h4" color="primary.main">
                {summaryData.total.toLocaleString()}
              </Typography>
            ) : (
              <Skeleton variant="rectangular" width={80} height={40} animation="wave" />
            )}
            <Typography variant="caption" color="textSecondary">
              All Severity Levels
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Tab navigation for charts */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={activeTab} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
          <Tab label="Time Analysis" />
          <Tab label="Network Analysis" />
          <Tab label="Severity Analysis" />
        </Tabs>
      </Box>

      {/* Time Analysis Tab */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 2, height: '400px' }}>
              {levelTimeOptions ? (
                <ReactECharts
                  option={levelTimeOptions}
                  style={{ height: '100%', width: '100%' }}
                  opts={{ renderer: 'canvas' }}
                />
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                  <CircularProgress size={30} />
                </Box>
              )}
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '400px' }}>
              {ruleDescriptionOptions ? (
                <ReactECharts
                  option={ruleDescriptionOptions}
                  style={{ height: '100%', width: '100%' }}
                  opts={{ renderer: 'canvas' }}
                />
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                  <CircularProgress size={30} />
                </Box>
              )}
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '400px' }}>
              {levelDistributionOptions ? (
                <ReactECharts
                  option={levelDistributionOptions}
                  style={{ height: '100%', width: '100%' }}
                  opts={{ renderer: 'canvas' }}
                />
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                  <CircularProgress size={30} />
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Network Analysis Tab */}
      {activeTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 2, height: '500px' }}>
              {networkConnectionsOptions ? (
                <ReactECharts
                  option={networkConnectionsOptions}
                  style={{ height: '100%', width: '100%' }}
                  opts={{ renderer: 'canvas' }}
                />
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                  <CircularProgress size={30} />
                </Box>
              )}
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '400px' }}>
              {protocolPieOptions ? (
                <ReactECharts
                  option={protocolPieOptions}
                  style={{ height: '100%', width: '100%' }}
                  opts={{ renderer: 'canvas' }}
                />
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                  <CircularProgress size={30} />
                </Box>
              )}
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '400px' }}>
              {topSourceIPsOptions ? (
                <ReactECharts
                  option={topSourceIPsOptions}
                  style={{ height: '100%', width: '100%' }}
                  opts={{ renderer: 'canvas' }}
                />
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                  <CircularProgress size={30} />
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Severity Analysis Tab */}
      {activeTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '400px' }}>
              {levelDistributionOptions ? (
                <ReactECharts
                  option={levelDistributionOptions}
                  style={{ height: '100%', width: '100%' }}
                  opts={{ renderer: 'canvas' }}
                />
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                  <CircularProgress size={30} />
                </Box>
              )}
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '400px' }}>
              {topSourceIPsOptions ? (
                <ReactECharts
                  option={topSourceIPsOptions}
                  style={{ height: '100%', width: '100%' }}
                  opts={{ renderer: 'canvas' }}
                />
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                  <CircularProgress size={30} />
                </Box>
              )}
            </Paper>
          </Grid>
          <Grid item xs={12}>
            <Paper sx={{ p: 2, height: '400px' }}>
              {ruleDescriptionOptions ? (
                <ReactECharts
                  option={ruleDescriptionOptions}
                  style={{ height: '100%', width: '100%' }}
                  opts={{ renderer: 'canvas' }}
                />
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                  <CircularProgress size={30} />
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}
    </Container>
  );
};

export default AdvancedAnalytics;