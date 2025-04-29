import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, Paper, CircularProgress, Link, Dialog, DialogTitle, DialogContent, IconButton,
  Chip, Grid, Tab, Tabs, Skeleton, TextField, InputAdornment, FormControl, InputLabel, Select, MenuItem,
  Button, Alert, Card, CardContent
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import DateRangeIcon from '@mui/icons-material/DateRange';
import AssessmentIcon from '@mui/icons-material/Assessment';
import axios from 'axios';
import { parseLogMessage } from '../utils/normalizeLogs';
import { StructuredLogView } from '../utils/normalizeLogs';
import { API_URL } from '../config';
import { useTheme } from '@mui/material/styles';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import { DataGrid } from '@mui/x-data-grid';

// ECharts Imports
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts/core';
import {
  LineChart,
  PieChart,
  BarChart
} from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  TitleComponent,
  LegendComponent
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

// Register ECharts components
echarts.use([
  LineChart,
  PieChart,
  BarChart,
  GridComponent,
  TooltipComponent,
  TitleComponent,
  LegendComponent,
  CanvasRenderer
]);

// Custom color palette with more vibrant and distinct colors
const COLOR_PALETTE = [
  '#3366FF',   // Deep Blue
  '#FF6B6B',   // Vibrant Red
  '#4ECDC4',   // Teal
  '#FFA726',   // Bright Orange
  '#9C27B0',   // Purple
  '#2196F3',   // Bright Blue
  '#4CAF50',   // Green
  '#FF5722',   // Deep Orange
  '#607D8B',   // Blue Gray
  '#795548'    // Brown
];

// Time range options
const TimeRangeOptions = [
  { value: '12h', label: 'Last 12 Hours' },
  { value: '24h', label: 'Last 24 Hours' },
  { value: '3d', label: 'Last 3 Days' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' }
];

const SessionLogs = () => {
  const [logs, setLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [timeRange, setTimeRange] = useState('24h');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const theme = useTheme();
  const [fullscreenChart, setFullscreenChart] = useState(null);
  const [fullscreenTitle, setFullscreenTitle] = useState('');

  const fetchSessionLogs = useCallback(async (search, range) => {
    try {
      setLoading(true);
      setError(null);

      console.log(`Fetching session logs with search: "${search}" and time range: ${range}`);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      // Build query params
      let queryParams = [];
      if (search) queryParams.push(`search=${encodeURIComponent(search)}`);
      if (range) queryParams.push(`timeRange=${encodeURIComponent(range)}`);
      
      const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

      const response = await axios.get(
        `${API_URL}/api/logs/session${queryString}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          withCredentials: true
        }
      );

      if (!Array.isArray(response.data)) {
        throw new Error('Invalid response format from server');
      }

      // Sort by timestamp in DESCENDING order (latest first)
      const sortedLogs = response.data.sort((a, b) =>
        new Date(b.timestamp) - new Date(a.timestamp)
      );

      console.log(`Fetched ${sortedLogs.length} session logs for time range: ${range}`);
      setLogs(sortedLogs);

    } catch (error) {
      console.error('Error fetching session logs:', error);
      setError(error.response?.data?.message || error.message || 'Failed to fetch session logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const getRuleLevelSeverity = (level) => {
    const numLevel = parseInt(level);
    if (numLevel >= 12) return 'Critical';
    if (numLevel >= 8) return 'High';
    if (numLevel >= 4) return 'Medium';
    return 'Low';
  };

  const getRuleLevelColor = (level) => {
    const numLevel = parseInt(level);
    if (numLevel >= 12) return '#d32f2f'; // Red
    if (numLevel >= 8) return '#f57c00'; // Orange
    if (numLevel >= 4) return '#0288d1'; // Blue
    return '#2e7d32'; // Green
  };

  const openFullscreenChart = (option, title) => {
    setFullscreenChart(option);
    setFullscreenTitle(title);
  };

  // Handle refresh button click
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Handle time range change
  const handleTimeRangeChange = (event) => {
    setTimeRange(event.target.value);
  };

  const columns = [
    {
      field: 'timestamp',
      headerName: 'Timestamp',
      flex: 1.5,
      renderCell: (params) => formatTimestamp(params.value)
    },
    {
      field: 'agentName',
      headerName: 'Agent Name',
      flex: 1
    },
    {
      field: 'ruleLevel',
      headerName: 'Rule Level',
      flex: 0.7,
      renderCell: (params) => (
        <Typography sx={{ color: getRuleLevelColor(params.value), fontWeight: 'bold' }}>
          {params.value}
        </Typography>
      )
    },
    {
      field: 'severity',
      headerName: 'Severity',
      flex: 1,
      renderCell: (params) => (
        <Chip
          label={getRuleLevelSeverity(params.row.ruleLevel)}
          sx={{
            backgroundColor: getRuleLevelColor(params.row.ruleLevel),
            color: 'white',
            fontWeight: 'bold'
          }}
          size="small"
        />
      )
    },
    {
      field: 'description',
      headerName: 'Description',
      flex: 2
    },
    {
      field: 'compliance',
      headerName: 'Compliance',
      flex: 1.5,
      renderCell: (params) => (
        <Box display="flex" gap={0.5} flexWrap="wrap">
          {params.value.map((type) => (
            <Chip
              key={type}
              label={type}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ fontSize: '0.7rem' }}
            />
          ))}
        </Box>
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 0.8,
      sortable: false,
      renderCell: (params) => (
        <Link
          component="button"
          onClick={() => setSelectedLog(params.row.fullLog)}
        >
          View Details
        </Link>
      )
    }
  ];

  // Memoized data processing for visualizations
  const visualizationData = useMemo(() => {
    if (!logs.length) return {};

    // Timeline Data - sorted in ascending order (oldest first)
    const timelineData = logs.reduce((acc, log) => {
      const parsedLog = parseLogMessage(log);
      if (!parsedLog) return acc;
      
      const date = new Date(parsedLog.timestamp).toLocaleDateString();
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    // Sort timeline keys in ascending order (oldest to newest)
    const sortedTimelineKeys = Object.keys(timelineData).sort((a, b) => {
      return new Date(a) - new Date(b);
    });
    const orderedTimelineData = {};
    sortedTimelineKeys.forEach(key => {
      orderedTimelineData[key] = timelineData[key];
    });

    // Agent Distribution
    const agentDistribution = logs.reduce((acc, log) => {
      const parsedLog = parseLogMessage(log);
      if (!parsedLog) return acc;
      
      const agent = parsedLog.agent?.name || 'Unknown';
      acc[agent] = (acc[agent] || 0) + 1;
      return acc;
    }, {});

    // Rule Level Distribution
    const ruleLevelDistribution = logs.reduce((acc, log) => {
      const parsedLog = parseLogMessage(log);
      if (!parsedLog) return acc;
      
      const level = parsedLog.rule?.level?.toString() || 'Unknown';
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {});

    // Compliance Distribution
    const complianceDistribution = logs.reduce((acc, log) => {
      const parsedLog = parseLogMessage(log);
      if (!parsedLog) return acc;
      
      const rule = parsedLog.rule || {};
      
      if (rule.hipaa?.length) acc['HIPAA'] = (acc['HIPAA'] || 0) + 1;
      if (rule.gdpr?.length) acc['GDPR'] = (acc['GDPR'] || 0) + 1;
      if (rule.nist_800_53?.length) acc['NIST'] = (acc['NIST'] || 0) + 1;
      if (rule.pci_dss?.length) acc['PCI_DSS'] = (acc['PCI_DSS'] || 0) + 1;
      if (rule.tsc?.length) acc['TSC'] = (acc['TSC'] || 0) + 1;
      if (rule.gpg13?.length) acc['GPG13'] = (acc['GPG13'] || 0) + 1;
      
      return acc;
    }, {});

    // Severity Distribution
    const severityDistribution = logs.reduce((acc, log) => {
      const parsedLog = parseLogMessage(log);
      if (!parsedLog) return acc;
      
      const severity = getRuleLevelSeverity(parsedLog.rule?.level);
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    }, {});

    // Description distribution (top descriptions)
    const descriptionDistribution = logs.reduce((acc, log) => {
      const parsedLog = parseLogMessage(log);
      if (!parsedLog) return acc;
      
      const description = parsedLog.rule?.description || 'Unknown';
      acc[description] = (acc[description] || 0) + 1;
      return acc;
    }, {});

    // Format top descriptions for grid display
    const topDescriptions = Object.entries(descriptionDistribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 9)
      .map(([name, value], index) => ({
        name,
        value,
        color: COLOR_PALETTE[index % COLOR_PALETTE.length]
      }));

    return {
      timelineData: orderedTimelineData,
      agentDistribution,
      ruleLevelDistribution,
      complianceDistribution,
      severityDistribution,
      descriptionDistribution,
      topDescriptions,
      totalLogs: logs.length
    };
  }, [logs]);

  // Update the getTimelineChartOption to ensure proper ordering
  const getTimelineChartOption = (data) => {
    const dates = Object.keys(data);
    const values = Object.values(data);

    return {
      title: {
        text: 'Compliance Alerts Timeline',
        left: 'center',
        textStyle: {
          color: theme.palette.mode === 'dark' ? '#fff' : '#000'
        }
      },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: {
          color: theme.palette.mode === 'dark' ? '#fff' : '#000',
          rotate: 45
        },
        // This ensures the axis shows in the order we provided (oldest to newest)
        inverse: false
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: theme.palette.mode === 'dark' ? '#fff' : '#000'
        }
      },
      series: [{
        data: values,
        type: 'line',
        smooth: true,
        itemStyle: { color: COLOR_PALETTE[1] }
      }],
      backgroundColor: theme.palette.mode === 'dark' ? '#353536' : '#fff'
    };
  };

  const getPieChartOption = (data, title) => ({
    title: {
      text: title,
      left: 'center',
      textStyle: {
        color: theme.palette.mode === 'dark' ? '#fff' : '#000'
      }
    },
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie',
      radius: '60%',
      data: Object.entries(data)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)  // Top 10 entries
        .map(([name, value], index) => ({
          name,
          value,
          itemStyle: { color: COLOR_PALETTE[index % COLOR_PALETTE.length] }
        })),
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }],
    backgroundColor: theme.palette.mode === 'dark' ? '#353536' : '#fff'
  });

  const getBarChartOption = (data, title) => ({
    title: {
      text: title,
      left: 'center',
      textStyle: {
        color: theme.palette.mode === 'dark' ? '#fff' : '#000'
      }
    },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: Object.keys(data),
      axisLabel: {
        color: theme.palette.mode === 'dark' ? '#fff' : '#000',
        rotate: 45
      }
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: theme.palette.mode === 'dark' ? '#fff' : '#000'
      }
    },
    series: [{
      data: Object.values(data),
      type: 'bar',
      itemStyle: {
        color: (params) => COLOR_PALETTE[params.dataIndex % COLOR_PALETTE.length]
      }
    }],
    backgroundColor: theme.palette.mode === 'dark' ? '#353536' : '#fff'
  });

  // Add horizontal bar chart option
  const getHorizontalBarChartOption = (data, title) => {
    // Sort data by value (descending) and take top 10
    const sortedEntries = Object.entries(data)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const categories = sortedEntries.map(([name]) => name);
    const values = sortedEntries.map(([_, value]) => value);

    return {
      title: {
        text: title,
        left: 'center',
        textStyle: {
          color: theme.palette.mode === 'dark' ? '#fff' : '#000'
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'value',
        axisLabel: {
          color: theme.palette.mode === 'dark' ? '#fff' : '#000'
        }
      },
      yAxis: {
        type: 'category',
        data: categories,
        axisLabel: {
          color: theme.palette.mode === 'dark' ? '#fff' : '#000',
          interval: 0
        }
      },
      series: [{
        name: title,
        type: 'bar',
        data: values,
        itemStyle: {
          color: (params) => COLOR_PALETTE[params.dataIndex % COLOR_PALETTE.length]
        },
        label: {
          show: true,
          position: 'right',
          formatter: '{c}'
        }
      }],
      backgroundColor: theme.palette.mode === 'dark' ? '#353536' : '#fff'
    };
  };

  // Render the top descriptions grid
  const renderTopDescriptions = () => {
    if (!visualizationData.topDescriptions) return null;

    return (
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {visualizationData.topDescriptions.map((item, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card 
              variant="outlined"
              sx={{
                height: '100%',
                borderLeft: `4px solid ${item.color}`,
                transition: 'all 0.2s',
                '&:hover': {
                  boxShadow: 6,
                  transform: 'translateY(-4px)'
                }
              }}
            >
              <CardContent>
                <Box display="flex" flexDirection="column" height="100%">
                  <Typography 
                    variant="h6" 
                    component="div" 
                    sx={{ 
                      fontSize: '1rem',
                      fontWeight: 'medium',
                      mb: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      flexGrow: 1
                    }}
                  >
                    {item.name}
                  </Typography>
                  
                  {/* Show actual count number prominently */}
                  <Typography 
                    variant="h3" 
                    align="center"
                    sx={{ 
                      color: item.color,
                      fontWeight: 'bold',
                      mt: 2
                    }}
                  >
                    {item.value}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };

  const formatTimestamp = (timestamp) => {
    try {
      return new Date(timestamp).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'Invalid Date';
    }
  };

  useEffect(() => {
    const fetchLogs = async () => {
      await fetchSessionLogs(searchTerm, timeRange);
    };
    
    fetchLogs();
  }, [fetchSessionLogs, searchTerm, timeRange, refreshTrigger]);

  // Prepare data for DataGrid
  const rows = useMemo(() => {
    return logs.map((log, index) => {
      const parsedLog = parseLogMessage(log);
      if (!parsedLog) return null;
      
      const rule = parsedLog.rule || {};
      const agent = parsedLog.agent || {};
      
      const complianceTypes = [
        rule.hipaa?.length && 'HIPAA',
        rule.gdpr?.length && 'GDPR',
        rule.nist_800_53?.length && 'NIST',
        rule.pci_dss?.length && 'PCI_DSS',
        rule.tsc?.length && 'TSC',
        rule.gpg13?.length && 'GPG13'
      ].filter(Boolean);
      
      return {
        id: index,
        timestamp: parsedLog.timestamp,
        agentName: agent.name || 'Unknown',
        ruleLevel: rule.level || '0',
        description: rule.description || 'Unknown',
        compliance: complianceTypes,
        fullLog: parsedLog
      };
    }).filter(Boolean);
  }, [logs]);

  return (
    <Box p={4} sx={{ pt: { xs: 8, sm: 8, md: 6 } }}>
      <Typography variant="h4" gutterBottom sx={{ color: '#2196f3', mb: 3 }}>
        Compliance Monitoring
        <Typography variant="subtitle1" sx={{ color: 'text.secondary', mt: 1 }}>
          Tracking Security Standards Compliance
        </Typography>
      </Typography>

      {/* Controls Panel */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Time Range Selector */}
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth variant="outlined" size="small">
            <InputLabel id="time-range-label">Time Range</InputLabel>
            <Select
              labelId="time-range-label"
              value={timeRange}
              onChange={handleTimeRangeChange}
              label="Time Range"
              startAdornment={<DateRangeIcon sx={{ mr: 1, color: 'action.active' }} />}
            >
              {TimeRangeOptions.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Search Box */}
        <Grid item xs={12} sm={7} md={8}>
          <TextField
            fullWidth
            size="small"
            variant="outlined"
            placeholder="Search logs by agent, description, or compliance..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Grid>

        {/* Refresh Button */}
        <Grid item xs={12} sm={2} md={1}>
          <Button
            fullWidth
            variant="contained"
            color="primary"
            onClick={handleRefresh}
            sx={{ height: '40px' }}
            disabled={loading}
          >
            <RefreshIcon />
          </Button>
        </Grid>
      </Grid>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Tabs
        value={activeTab}
        onChange={(e, newValue) => setActiveTab(newValue)}
        sx={{ mb: 3 }}
      >
        <Tab label="Dashboard" />
        <Tab label="Events" />
      </Tabs>

      {activeTab === 0 && (
        <>
          {/* Top Descriptions Grid */}
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
            <AssessmentIcon sx={{ mr: 1 }} /> Common Compliance Events
          </Typography>
          
          {loading ? (
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {[...Array(9)].map((_, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 1 }} />
                </Grid>
              ))}
            </Grid>
          ) : (
            renderTopDescriptions()
          )}
          
          <Grid container spacing={3}>
            {/* Timeline Chart */}
            <Grid item xs={12} md={6}>
              {loading ? (
                <Skeleton variant="rectangular" height={300} />
              ) : (
                <Box position="relative">
                  <ReactECharts
                    option={getTimelineChartOption(visualizationData.timelineData || {})}
                    style={{ height: 300 }}
                  />
                  <IconButton
                    onClick={() => openFullscreenChart(getTimelineChartOption(visualizationData.timelineData || {}), 'Compliance Alerts Timeline')}
                    sx={{ position: 'absolute', top: 5, right: 5, bgcolor: 'rgba(255,255,255,0.7)' }}
                    size="small"
                  >
                    <FullscreenIcon />
                  </IconButton>
                </Box>
              )}
            </Grid>

            {/* Rule Level Distribution - Horizontal bar */}
            <Grid item xs={12} md={6}>
              {loading ? (
                <Skeleton variant="rectangular" height={300} />
              ) : (
                <Box position="relative">
                  <ReactECharts
                    option={getHorizontalBarChartOption(visualizationData.ruleLevelDistribution || {}, 'Rule Level Distribution')}
                    style={{ height: 300 }}
                  />
                  <IconButton
                    onClick={() => openFullscreenChart(getHorizontalBarChartOption(visualizationData.ruleLevelDistribution || {}, 'Rule Level Distribution'), 'Rule Level Distribution')}
                    sx={{ position: 'absolute', top: 5, right: 5, bgcolor: 'rgba(255,255,255,0.7)' }}
                    size="small"
                  >
                    <FullscreenIcon />
                  </IconButton>
                </Box>
              )}
            </Grid>

            {/* Agent Distribution */}
            <Grid item xs={12} md={6}>
              {loading ? (
                <Skeleton variant="rectangular" height={300} />
              ) : (
                <Box position="relative">
                  <ReactECharts
                    option={getBarChartOption(visualizationData.agentDistribution || {}, 'Agent Distribution')}
                    style={{ height: 300 }}
                  />
                  <IconButton
                    onClick={() => openFullscreenChart(getBarChartOption(visualizationData.agentDistribution || {}, 'Agent Distribution'), 'Agent Distribution')}
                    sx={{ position: 'absolute', top: 5, right: 5, bgcolor: 'rgba(255,255,255,0.7)' }}
                    size="small"
                  >
                    <FullscreenIcon />
                  </IconButton>
                </Box>
              )}
            </Grid>

            {/* Compliance Framework Distribution */}
            <Grid item xs={12} md={6}>
              {loading ? (
                <Skeleton variant="rectangular" height={300} />
              ) : (
                <Box position="relative">
                  <ReactECharts
                    option={getPieChartOption(visualizationData.complianceDistribution || {}, 'Compliance Framework Distribution')}
                    style={{ height: 300 }}
                  />
                  <IconButton
                    onClick={() => openFullscreenChart(getPieChartOption(visualizationData.complianceDistribution || {}, 'Compliance Framework Distribution'), 'Compliance Framework Distribution')}
                    sx={{ position: 'absolute', top: 5, right: 5, bgcolor: 'rgba(255,255,255,0.7)' }}
                    size="small"
                  >
                    <FullscreenIcon />
                  </IconButton>
                </Box>
              )}
            </Grid>

            {/* Severity Distribution */}
            <Grid item xs={12} md={6}>
              {loading ? (
                <Skeleton variant="rectangular" height={300} />
              ) : (
                <Box position="relative">
                  <ReactECharts
                    option={getPieChartOption(visualizationData.severityDistribution || {}, 'Severity Distribution')}
                    style={{ height: 300 }}
                  />
                  <IconButton
                    onClick={() => openFullscreenChart(getPieChartOption(visualizationData.severityDistribution || {}, 'Severity Distribution'), 'Severity Distribution')}
                    sx={{ position: 'absolute', top: 5, right: 5, bgcolor: 'rgba(255,255,255,0.7)' }}
                    size="small"
                  >
                    <FullscreenIcon />
                  </IconButton>
                </Box>
              )}
            </Grid>

            {/* Top Descriptions Chart */}
            <Grid item xs={12} md={6}>
              {loading ? (
                <Skeleton variant="rectangular" height={300} />
              ) : (
                <Box position="relative">
                  <ReactECharts
                    option={getHorizontalBarChartOption(visualizationData.descriptionDistribution || {}, 'Top Compliance Descriptions')}
                    style={{ height: 350 }}
                  />
                  <IconButton
                    onClick={() => openFullscreenChart(getHorizontalBarChartOption(visualizationData.descriptionDistribution || {}, 'Top Compliance Descriptions'), 'Top Compliance Descriptions')}
                    sx={{ position: 'absolute', top: 5, right: 5, bgcolor: 'rgba(255,255,255,0.7)' }}
                    size="small"
                  >
                    <FullscreenIcon />
                  </IconButton>
                </Box>
              )}
            </Grid>
          </Grid>
        </>
      )}

      {/* Events Tab */}
      {activeTab === 1 && (
        <Paper elevation={2} sx={{ mb: 3 }}>
          <Box sx={{
            height: 650,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <DataGrid
              rows={rows}
              columns={columns}
              pageSize={rowsPerPage}
              rowsPerPageOptions={[10, 25, 50, 100]}
              onPageSizeChange={(newPageSize) => setRowsPerPage(newPageSize)}
              pagination
              disableSelectionOnClick
              loading={loading}
              density="standard"
              initialState={{
                pagination: {
                  pageSize: 50,
                },
              }}
              sx={{
                '& .MuiDataGrid-cell:hover': {
                  color: 'primary.main',
                },
                '& .MuiDataGrid-main': {
                  // Ensures grid content scrolls but headers remain fixed
                  overflow: 'auto !important'
                },
                // Make sure footer with pagination stays at bottom
                '& .MuiDataGrid-footerContainer': {
                  borderTop: '1px solid rgba(224, 224, 224, 1)',
                },
                flex: 1, // Take up remaining space in container
                boxSizing: 'border-box',
              }}
            />
          </Box>
        </Paper>
      )}

      {/* Log Details Dialog */}
      <Dialog
        open={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{
          backgroundColor: theme.palette.mode === 'dark' ? '#353536' : '#f5f5f5',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Typography variant="h6">Compliance Log Details</Typography>
          <IconButton
            aria-label="close"
            onClick={() => setSelectedLog(null)}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <StructuredLogView data={selectedLog} />
        </DialogContent>
      </Dialog>

      {/* Fullscreen Chart Dialog */}
      <Dialog
        open={Boolean(fullscreenChart)}
        onClose={() => setFullscreenChart(null)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Typography variant="h6">{fullscreenTitle}</Typography>
          <IconButton
            aria-label="close"
            onClick={() => setFullscreenChart(null)}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ height: '80vh', pt: 2 }}>
          {fullscreenChart && (
            <ReactECharts
              option={fullscreenChart}
              style={{ height: '100%', width: '100%' }}
              theme={theme.palette.mode === 'dark' ? 'dark' : ''}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default SessionLogs;