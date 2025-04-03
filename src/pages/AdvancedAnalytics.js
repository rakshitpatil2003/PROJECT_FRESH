import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Container, Grid, Paper, Typography, CircularProgress, Alert, FormControl, InputLabel, Select, MenuItem, Skeleton, Tabs, Tab
} from '@mui/material';
import ReactECharts from 'echarts-for-react';
import { API_URL } from '../config';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import { useTheme } from '@mui/material/styles';

const AdvancedAnalytics = () => {
  // State management
  const [summaryData, setSummaryData] = useState(null);
  const [chartData, setChartData] = useState({
    logLevelsOverTime: null,
    protocolDistribution: null,
    topSourceIPs: null,
    topDestIPs: null,
    levelDistribution: null,
    networkConnections: null,
    ruleDescriptions: null,
    topAgents: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('24h');
  const [protocolFilter, setProtocolFilter] = useState('all');
  const [logType, setLogType] = useState('all');
  const [activeTab, setActiveTab] = useState(0);
  const [ruleVisType, setRuleVisType] = useState('treemap');
  const [fullscreenChart, setFullscreenChart] = useState(null);
  const theme = useTheme();

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
  const handleRuleVizToggle = () => {
    setRuleVisType(prevType => prevType === 'treemap' ? 'sunburst' : 'treemap');
  };
  const handleFullscreen = (chartType) => {
    setFullscreenChart(chartType);
  };
  // Add fullscreen close handler
  const handleCloseFullscreen = () => {
    setFullscreenChart(null);
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

  const fetchProtocolDistribution = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(
        `${API_URL}/api/logs/charts/protocolDistribution?timeRange=${timeRange}&logType=${logType}`,
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

      let data = await response.json();

      // Enhanced logging to debug the issue
      console.log("Raw protocol data:", data);

      // Better handling of null/undefined/empty values
      data = data.map(item => ({
        name: (!item.name || item.name === 'N/A' || item.name === '')
          ? 'Unknown'
          : item.name.trim(),  // Trim to handle whitespace issues
        value: item.value || 0  // Ensure we have a numeric value
      }));

      // Filter out items with zero values if needed
      data = data.filter(item => item.value > 0);

      // Group small protocols into "Other" category if needed
      if (data.length > 8) {
        const sortedData = [...data].sort((a, b) => b.value - a.value);
        const topItems = sortedData.slice(0, 7);
        const otherItems = sortedData.slice(7);
        const otherValue = otherItems.reduce((sum, item) => sum + item.value, 0);

        data = [
          ...topItems,
          { name: 'Other', value: otherValue }
        ];
      }

      console.log("Processed protocol data:", data);

      setChartData(prevData => ({
        ...prevData,
        protocolDistribution: data
      }));
    } catch (error) {
      console.error('Error fetching protocol distribution data:', error);
    }
  }, [timeRange, logType]);

  const fetchTopAgents = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(
        `${API_URL}/api/logs/top-agents?timeRange=${timeRange}&logType=${logType}`,
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
        topAgents: data
      }));
    } catch (error) {
      console.error('Error fetching top agents data:', error);
    }
  }, [timeRange, logType]);

  // Fetch all charts data 
  const fetchAllChartData = useCallback(async () => {
    setLoading(true);

    // Fetch summary first for immediate display
    await fetchSummaryData();

    // Fetch protocol distribution separately with our custom logic
    await fetchProtocolDistribution();
    // Fetch top agents
    await fetchTopAgents();

    // Fetch other charts in parallel
    const chartTypes = [
      'logLevelsOverTime',
      'topSourceIPs',
      'levelDistribution',
      'networkConnections',
      'ruleDescriptions'
    ];

    await Promise.all(chartTypes.map(chartType => fetchChartData(chartType)));

    setLoading(false);
  }, [fetchSummaryData, fetchChartData, fetchProtocolDistribution, fetchTopAgents]);
  // Add this function to the component


  // Initial data loading
  useEffect(() => {
    fetchAllChartData();

    // Refresh data every 60 seconds (increased from 30 for better performance)
    const interval = setInterval(fetchAllChartData, 60000);
    return () => clearInterval(interval);
  }, [fetchAllChartData]);

  const isDarkMode = theme.palette.mode === 'dark';
  const textColor = isDarkMode ? '#ffffff' : '#333333';
  const backgroundColor = isDarkMode ? '#424242' : '#ffffff';
  const gridLineColor = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  // Chart options generators - Using memoization for performance
  const levelTimeOptions = useMemo(() => {
    if (!chartData.logLevelsOverTime) return null;

    return {
      backgroundColor: 'transparent',
      textStyle: { color: textColor },
      title: {
        text: 'Log Levels Over Time',
        left: 'center',
        textStyle: { color: textColor }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' }
      },
      legend: {
        data: ['Notice (1-7)', 'Warning (8-11)', 'Critical (12-16)'],
        bottom: 10,
        textStyle: { color: textColor }
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
        data: chartData.logLevelsOverTime.timeLabels || [],
        axisLine: { lineStyle: { color: gridLineColor } },
        axisLabel: { color: textColor },
        splitLine: { lineStyle: { color: gridLineColor } }
      },
      yAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: gridLineColor } },
        axisLabel: { color: textColor },
        splitLine: { lineStyle: { color: gridLineColor } }
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

  const topAgentsOptions = useMemo(() => {
    if (!chartData.topAgents) return null;

    return {
      title: {
        text: 'Top 7 Agents',
        left: 'center',
        textStyle: { color: textColor }
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
      backgroundColor: 'transparent',
      textStyle: { color: textColor },
      xAxis: {
        type: 'category',
        data: chartData.topAgents.map(item => item.name || 'Unknown'),
        axisLine: { lineStyle: { color: gridLineColor } },
        axisLabel: {
          color: textColor,
          rotate: 30,
          formatter: value => value.length > 15 ? value.substring(0, 12) + '...' : value
        },
        splitLine: { lineStyle: { color: gridLineColor } }
      },
      yAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: gridLineColor } },
        axisLabel: { color: textColor },
        splitLine: { lineStyle: { color: gridLineColor } }
      },
      series: [
        {
          name: 'Log Count',
          type: 'bar',
          data: chartData.topAgents.map(item => ({
            value: item.count,
            itemStyle: {
              color: '#7A99FF'  // A distinct color for agents
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
  }, [chartData.topAgents, textColor, gridLineColor]);

  const protocolPieOptions = useMemo(() => {
    if (!chartData.protocolDistribution) return null;

    return {
      backgroundColor: 'transparent',
      textStyle: { color: textColor },
      title: {
        text: 'Protocol Distribution',
        left: 'center',
        textStyle: { color: textColor }
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
        bottom: 20,
        textStyle: { color: textColor }
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
              fontWeight: 'bold',
              color: textColor
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

    const maxValue = Math.max(...chartData.topSourceIPs.map(item => item.value));

    return {
      title: {
        text: 'Top Source IPs',
        left: 'center',
        textStyle: { color: textColor }
      },
      backgroundColor: 'transparent',
      textStyle: { color: textColor },
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
        boundaryGap: [0, 0.01],
        axisLine: { lineStyle: { color: gridLineColor } },
        axisLabel: { color: textColor },
        splitLine: { lineStyle: { color: gridLineColor } }
      },
      yAxis: {
        type: 'category',
        data: chartData.topSourceIPs.map(item => item.name),
        axisLine: { lineStyle: { color: gridLineColor } },
        axisLabel: {
          color: textColor,
          formatter: value => value.length > 15 ? value.substring(0, 12) + '...' : value
        },
        splitLine: { lineStyle: { color: gridLineColor } }
      },
      series: [{
        name: 'Count',
        type: 'bar',
        data: chartData.topSourceIPs.map(item => ({
          value: item.value,
          itemStyle: {
            color: (() => {
              const ratio = item.value / maxValue;
              return {
                type: 'linear',
                x: 0, y: 0, x2: 1, y2: 0,
                colorStops: [
                  { offset: 0, color: '#2196f3' },
                  { offset: 1, color: ratio > 0.7 ? '#f44336' : '#2196f3' }
                ]
              };
            })()
          }
        }))
      }]
    };
  }, [chartData.topSourceIPs, theme.palette.mode]);


  const levelDistributionOptions = useMemo(() => {
    if (!chartData.levelDistribution) return null;

    return {
      title: {
        text: 'Log Level Distribution',
        left: 'center',
        textStyle: { color: textColor }
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
      backgroundColor: 'transparent',
      textStyle: { color: textColor },
      xAxis: {
        type: 'category',
        data: (chartData.levelDistribution || []).map(item => item.name),
        axisLine: { lineStyle: { color: gridLineColor } },
        axisLabel: { color: textColor },
        splitLine: { lineStyle: { color: gridLineColor } }
      },
      yAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: gridLineColor } },
        axisLabel: { color: textColor },
        splitLine: { lineStyle: { color: gridLineColor } }
      },
      series: [
        {
          name: 'Count',
          type: 'bar',
          data: (chartData.levelDistribution || []).map(item => ({
            value: item.value,
            itemStyle: {
              color: function () {
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
  // Replace the networkConnectionsOptions useMemo function with this:
  const networkConnectionsOptions = useMemo(() => {
    if (!chartData.networkConnections) return null;

    // Process data to avoid cycles
    const { nodes, links } = chartData.networkConnections;

    // Create combined links to avoid cycles (srcIP + destIP as key)
    const processedLinks = [];
    const linkMap = {};

    links.forEach(link => {
      const forwardKey = `${link.source}-${link.target}`;
      const reverseKey = `${link.target}-${link.source}`;

      // If we have both forward and reverse, combine them
      if (linkMap[reverseKey]) {
        // Update existing link instead of creating cycle
        const existingLink = linkMap[reverseKey];
        existingLink.value += link.value;
        existingLink.lineStyle = {
          color: '#ffa500', // Orange for bidirectional
          opacity: 0.8
        };
      } else {
        // Create new link
        const newLink = {
          ...link,
          lineStyle: {
            color: link.source.includes('src') ? '#2196f3' : '#91cc75',
            opacity: 0.8
          }
        };
        linkMap[forwardKey] = newLink;
        processedLinks.push(newLink);
      }
    });

    return {
      title: {
        text: 'Network Connections',
        left: 'center'
      },
      tooltip: {
        trigger: 'item',
        formatter: '{b} → {c}'
      },
      series: [{
        type: 'sankey',
        data: nodes,
        links: processedLinks,
        emphasis: {
          focus: 'adjacency'
        },
        levels: [
          {
            depth: 0,
            itemStyle: {
              color: '#2196f3' // Source IPs
            },
            lineStyle: {
              color: 'gradient',
              curveness: 0.5
            }
          },
          {
            depth: 1,
            itemStyle: {
              color: '#91cc75' // Destination IPs
            }
          }
        ],
        lineStyle: {
          color: 'source',
          curveness: 0.5
        },
        label: {
          formatter: '{b}'
        },
        animation: true
      }]
    };
  }, [chartData.networkConnections]);

  const ruleDescriptionOptions = useMemo(() => {
    if (!chartData.ruleDescriptions) return null;

    // Define a color palette for various rules
    const colorPalette = [
      '#4caf50', '#2196f3', '#ff9800', '#9c27b0', '#e91e63',
      '#3f51b5', '#009688', '#cddc39', '#ff5722', '#607d8b'
    ];

    return {
      title: {
        text: 'Top Rule Descriptions',
        left: 'center',
        textStyle: { color: textColor },
        subtext: `Click to switch view (${ruleVisType === 'treemap' ? 'Treemap' : 'Sunburst'})`,
        subtextStyle: { color: textColor }
      },
      tooltip: {
        formatter: function (info) {
          return [info.data.name, 'Count: ' + info.data.value].join('<br/>');
        }
      },
      backgroundColor: 'transparent',
      textStyle: { color: textColor },
      series: [
        {
          type: ruleVisType,
          data: (chartData.ruleDescriptions || []).map((item, index) => ({
            name: item.name.length > 30 ? item.name.substring(0, 27) + '...' : item.name,
            value: item.value,
            itemStyle: {
              // Assign colors from the palette based on the index
              color: colorPalette[index % colorPalette.length]
            }
          })),
          label: {
            show: true,
            formatter: '{b}',
            color: textColor
          },
          breadcrumb: { show: false },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          },
          animationDurationUpdate: 1000
        }
      ]
    };
  }, [chartData.ruleDescriptions, ruleVisType]);

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
            <Paper sx={{ p: 2, height: '400px', position: 'relative' }}>
              {levelTimeOptions ? (
                <>
                  <ReactECharts
                    option={levelTimeOptions}
                    style={{ height: '100%', width: '100%' }}
                    opts={{ renderer: 'canvas' }}
                  />
                  <IconButton
                    sx={{ position: 'absolute', top: 5, right: 5 }}
                    onClick={() => handleFullscreen('levelTime')}
                  >
                    <FullscreenIcon />
                  </IconButton>
                </>
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                  <CircularProgress size={30} />
                </Box>
              )}
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '400px', position: 'relative' }}>
              {topAgentsOptions ? (
                <>
                  <ReactECharts
                    option={topAgentsOptions}
                    style={{ height: '100%', width: '100%' }}
                    opts={{ renderer: 'canvas' }}
                  />
                  <IconButton
                    sx={{ position: 'absolute', top: 5, right: 5 }}
                    onClick={() => handleFullscreen('topAgents')}
                  >
                    <FullscreenIcon />
                  </IconButton>
                </>
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                  <CircularProgress size={30} />
                </Box>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '400px', position: 'relative' }}>
              {levelDistributionOptions ? (
                <>
                  <ReactECharts
                    option={levelDistributionOptions}
                    style={{ height: '100%', width: '100%' }}
                    opts={{ renderer: 'canvas' }}
                  />
                  <IconButton
                    sx={{ position: 'absolute', top: 5, right: 5 }}
                    onClick={() => handleFullscreen('levelDistribution')}
                  >
                    <FullscreenIcon />
                  </IconButton>
                </>
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
            <Paper sx={{ p: 2, height: '500px', position: 'relative' }}>
              {networkConnectionsOptions ? (
                <>
                  <ReactECharts
                    option={networkConnectionsOptions}
                    style={{ height: '100%', width: '100%' }}
                    opts={{ renderer: 'canvas' }}
                  />
                  <IconButton
                    sx={{ position: 'absolute', top: 5, right: 5 }}
                    onClick={() => handleFullscreen('networkConnections')}
                  >
                    <FullscreenIcon />
                  </IconButton>
                </>
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                  <CircularProgress size={30} />
                </Box>
              )}
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '400px', position: 'relative' }}>
              {topSourceIPsOptions ? (
                <>
                  <ReactECharts
                    option={topSourceIPsOptions}
                    style={{ height: '100%', width: '100%' }}
                    opts={{ renderer: 'canvas' }}
                  />
                  <IconButton
                    sx={{ position: 'absolute', top: 5, right: 5 }}
                    onClick={() => handleFullscreen('topSourceIPs')}
                  >
                    <FullscreenIcon />
                  </IconButton>
                </>
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                  <CircularProgress size={30} />
                </Box>
              )}
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '400px', position: 'relative' }}>
              {protocolPieOptions ? (
                <>
                  <ReactECharts
                    option={protocolPieOptions}
                    style={{ height: '100%', width: '100%' }}
                    opts={{ renderer: 'canvas' }}
                  />
                  <IconButton
                    sx={{ position: 'absolute', top: 5, right: 5 }}
                    onClick={() => handleFullscreen('protocolDistribution')}
                  >
                    <FullscreenIcon />
                  </IconButton>
                </>
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
            <Paper sx={{ p: 2, height: '400px', position: 'relative' }}>
              {levelDistributionOptions ? (
                <>
                  <ReactECharts
                    option={levelDistributionOptions}
                    style={{ height: '100%', width: '100%' }}
                    opts={{ renderer: 'canvas' }}
                  />
                  <IconButton
                    sx={{ position: 'absolute', top: 5, right: 5 }}
                    onClick={() => handleFullscreen('levelDistribution')}
                  >
                    <FullscreenIcon />
                  </IconButton>
                </>
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                  <CircularProgress size={30} />
                </Box>
              )}
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '400px', position: 'relative' }}>
              {topSourceIPsOptions ? (
                <>
                  <ReactECharts
                    option={topSourceIPsOptions}
                    style={{ height: '100%', width: '100%' }}
                    opts={{ renderer: 'canvas' }}
                  />
                  <IconButton
                    sx={{ position: 'absolute', top: 5, right: 5 }}
                    onClick={() => handleFullscreen('topSourceIPs')}
                  >
                    <FullscreenIcon />
                  </IconButton>
                </>
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                  <CircularProgress size={30} />
                </Box>
              )}
            </Paper>
          </Grid>
          <Grid item xs={12}>
            <Paper sx={{ p: 2, height: '400px', position: 'relative' }}>
              {ruleDescriptionOptions ? (
                <>
                  <ReactECharts
                    option={ruleDescriptionOptions}
                    style={{ height: '100%', width: '100%' }}
                    opts={{ renderer: 'canvas' }}
                    onEvents={{
                      'click': handleRuleVizToggle
                    }}
                  />
                  <IconButton
                    sx={{ position: 'absolute', top: 5, right: 5 }}
                    onClick={() => handleFullscreen('ruleDescriptions')}
                  >
                    <FullscreenIcon />
                  </IconButton>
                </>
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                  <CircularProgress size={30} />
                </Box>
              )}
            </Paper>
          </Grid>

        </Grid>
      )}
      {fullscreenChart && (
        <Dialog
          fullScreen
          open={Boolean(fullscreenChart)}
          onClose={handleCloseFullscreen}
          sx={{ '& .MuiDialog-paper': { bgcolor: theme.palette.background.default } }}
        >
          <IconButton
            sx={{ position: 'absolute', top: 10, right: 10, zIndex: 1 }}
            onClick={handleCloseFullscreen}
          >
            <FullscreenExitIcon />
          </IconButton>
          <DialogContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4 }}>
            {fullscreenChart === 'levelTime' && levelTimeOptions && (
              <ReactECharts
                option={levelTimeOptions}
                style={{ height: '90vh', width: '95vw' }}
                opts={{ renderer: 'canvas' }}
              />
            )}
            {fullscreenChart === 'protocolDistribution' && protocolPieOptions && (
              <ReactECharts
                option={protocolPieOptions}
                style={{ height: '90vh', width: '95vw' }}
                opts={{ renderer: 'canvas' }}
              />
            )}
            {fullscreenChart === 'topSourceIPs' && topSourceIPsOptions && (
              <ReactECharts
                option={topSourceIPsOptions}
                style={{ height: '90vh', width: '95vw' }}
                opts={{ renderer: 'canvas' }}
              />
            )}
            {fullscreenChart === 'levelDistribution' && levelDistributionOptions && (
              <ReactECharts
                option={levelDistributionOptions}
                style={{ height: '90vh', width: '95vw' }}
                opts={{ renderer: 'canvas' }}
              />
            )}
            {fullscreenChart === 'topAgents' && topAgentsOptions && (
              <ReactECharts
                option={topAgentsOptions}
                style={{ height: '90vh', width: '95vw' }}
                opts={{ renderer: 'canvas' }}
              />
            )}
            {fullscreenChart === 'networkConnections' && networkConnectionsOptions && (
              <ReactECharts
                option={networkConnectionsOptions}
                style={{ height: '90vh', width: '95vw' }}
                opts={{ renderer: 'canvas' }}
              />
            )}
            {fullscreenChart === 'ruleDescriptions' && ruleDescriptionOptions && (
              <ReactECharts
                option={ruleDescriptionOptions}
                style={{ height: '90vh', width: '95vw' }}
                opts={{ renderer: 'canvas' }}
                onEvents={{
                  'click': handleRuleVizToggle
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      )}
    </Container>
  );
};

export default AdvancedAnalytics;