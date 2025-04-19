import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Alert, TextField, InputAdornment, CircularProgress, Link, Dialog, DialogTitle, DialogContent,
  IconButton, Chip, Pagination, FormControl, InputLabel, Select, MenuItem, Grid, Card, CardContent,
  Badge, Divider, useMediaQuery, Skeleton, Tooltip, ButtonGroup, Button
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import CloseIcon from '@mui/icons-material/Close';
import FilterListIcon from '@mui/icons-material/FilterList';
import TimelineIcon from '@mui/icons-material/Timeline';
import ComplianceIcon from '@mui/icons-material/VerifiedUser';
import AssessmentIcon from '@mui/icons-material/Assessment';
import DateRangeIcon from '@mui/icons-material/DateRange';
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityIcon from '@mui/icons-material/Visibility';
import axios from 'axios';
import { parseLogMessage, StructuredLogView } from '../utils/normalizeLogs';
import { API_URL } from '../config';
import { useTheme } from '@mui/material/styles';

// ECharts Imports
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts/core';
import {
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
  PieChart,
  BarChart,
  GridComponent,
  TooltipComponent,
  TitleComponent,
  LegendComponent,
  CanvasRenderer
]);

// Custom color palette
const COLOR_PALETTE = [
  '#3366FF', '#FF6B6B', '#4ECDC4', '#FFA726', '#9C27B0', 
  '#2196F3', '#4CAF50', '#FF5722', '#607D8B', '#795548',
  '#9575CD', '#F06292', '#4DD0E1', '#FFB74D', '#AED581',
  '#E57373', '#64B5F6', '#81C784', '#FFD54F', '#A1887F'
];

const TimeRangeOptions = [
  { value: '12h', label: 'Last 12 Hours' },
  { value: '24h', label: 'Last 24 Hours' },
  { value: '3d', label: 'Last 3 Days' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' }
];

const SessionLogs = () => {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [timeRange, setTimeRange] = useState('7d');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalPages, setTotalPages] = useState(0);
  const [displayedLogs, setDisplayedLogs] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedComplianceFilter, setSelectedComplianceFilter] = useState('all');
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  // Function to get rule level color
  const getRuleLevelColor = (level) => {
    const numLevel = parseInt(level);
    if (numLevel >= 12) return "error";
    if (numLevel >= 8) return "warning";
    if (numLevel >= 4) return "info";
    return "success";
  };

  // Function to get rule level severity text
  const getRuleLevelSeverity = (level) => {
    const numLevel = parseInt(level);
    if (numLevel >= 12) return "Critical";
    if (numLevel >= 8) return "High";
    if (numLevel >= 4) return "Medium";
    return "Low";
  };

  // Fetch session logs with time range parameter
  const fetchSessionLogs = useCallback(async (search, range) => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      // Build query params including time range
      let queryParams = [];
      if (search) queryParams.push(`search=${encodeURIComponent(search)}`);
      if (range) queryParams.push(`timeRange=${encodeURIComponent(range)}`);
      
      const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

      const response = await axios.get(
        `${API_URL}/api/logs/session${queryString}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`Fetched ${response.data.length} session logs with time range: ${range}`);

      // Parse each log with parseLogMessage
      const parsedLogs = response.data
        .map(log => ({
          ...log,
          parsed: parseLogMessage(log)
        }))
        .filter(log => log.parsed !== null);

      setLogs(parsedLogs);
      setFilteredLogs(parsedLogs);
      setTotalPages(Math.ceil(parsedLogs.length / rowsPerPage));
      setPage(1); // Reset to first page when new data is loaded
    } catch (error) {
      console.error('Error fetching session logs:', error);
      setError(error.response?.data?.message || error.message || 'Failed to fetch session logs');
      setLogs([]);
      setFilteredLogs([]);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [rowsPerPage]);

  // Generate visualization data from logs
  const visualizationData = useMemo(() => {
    if (!logs.length) return {};

    // Count logs by description
    const descriptionCounts = {};
    // Count logs by compliance type
    const complianceCounts = {
      HIPAA: 0,
      GDPR: 0,
      NIST: 0,
      PCI_DSS: 0,
      TSC: 0,
      GPG13: 0
    };
    // Count logs by rule level
    const ruleLevelCounts = {};

    logs.forEach(log => {
      const parsedLog = log.parsed;
      if (!parsedLog) return;

      // Count by description
      const description = parsedLog.rule?.description || 'Unknown';
      descriptionCounts[description] = (descriptionCounts[description] || 0) + 1;

      // Count by compliance type
      const rule = parsedLog.rule || {};
      if (rule.hipaa?.length) complianceCounts.HIPAA += 1;
      if (rule.gdpr?.length) complianceCounts.GDPR += 1;
      if (rule.nist_800_53?.length) complianceCounts.NIST += 1;
      if (rule.pci_dss?.length) complianceCounts.PCI_DSS += 1;
      if (rule.tsc?.length) complianceCounts.TSC += 1;
      if (rule.gpg13?.length) complianceCounts.GPG13 += 1;

      // Count by rule level
      const level = rule.level || 'Unknown';
      ruleLevelCounts[level] = (ruleLevelCounts[level] || 0) + 1;
    });

    // Sort description counts and get top occurrences
    const topDescriptions = Object.entries(descriptionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([name, value], index) => ({
        name: name.length > 40 ? name.substring(0, 40) + '...' : name,
        value,
        fullName: name,
        itemStyle: { color: COLOR_PALETTE[index % COLOR_PALETTE.length] }
      }));

    return {
      descriptionCounts,
      topDescriptions,
      complianceCounts,
      ruleLevelCounts,
      totalLogs: logs.length
    };
  }, [logs]);

  // Client-side filtering with compliance type filter
  useEffect(() => {
    let filtered = logs;

    // Apply compliance filter if not 'all'
    if (selectedComplianceFilter !== 'all') {
      filtered = logs.filter(log => {
        const rule = log.parsed?.rule || {};
        switch (selectedComplianceFilter) {
          case 'HIPAA': return rule.hipaa?.length > 0;
          case 'GDPR': return rule.gdpr?.length > 0;
          case 'NIST': return rule.nist_800_53?.length > 0;
          case 'PCI_DSS': return rule.pci_dss?.length > 0;
          case 'TSC': return rule.tsc?.length > 0;
          case 'GPG13': return rule.gpg13?.length > 0;
          default: return true;
        }
      });
    }

    // Apply search term filter
    if (searchTerm.trim() !== '') {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(log => {
        const parsedLog = log.parsed;
        if (!parsedLog) return false;
        
        // Search in raw log message if available
        if (parsedLog.rawData?.message?.toLowerCase().includes(lowerSearchTerm)) return true;
        
        // Search in agent name
        if (parsedLog.agent?.name?.toLowerCase().includes(lowerSearchTerm)) return true;
        
        // Search in rule description
        if (parsedLog.rule?.description?.toLowerCase().includes(lowerSearchTerm)) return true;
        
        // Search in compliance standards
        const complianceTypes = [
          parsedLog.rule?.hipaa?.join(' ') || '',
          parsedLog.rule?.gdpr?.join(' ') || '',
          parsedLog.rule?.nist_800_53?.join(' ') || '',
          parsedLog.rule?.pci_dss?.join(' ') || '',
          parsedLog.rule?.tsc?.join(' ') || '',
          parsedLog.rule?.gpg13?.join(' ') || ''
        ].join(' ').toLowerCase();
        
        if (complianceTypes.includes(lowerSearchTerm)) return true;
        
        return false;
      });
    }
    
    setFilteredLogs(filtered);
    setTotalPages(Math.ceil(filtered.length / rowsPerPage));
    setPage(1); // Reset to first page when filter changes
  }, [searchTerm, logs, rowsPerPage, selectedComplianceFilter]);

  // Update displayed logs when page, rowsPerPage or filteredLogs change
  useEffect(() => {
    const startIndex = (page - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    setDisplayedLogs(filteredLogs.slice(startIndex, endIndex));
  }, [page, rowsPerPage, filteredLogs]);

  // Fetch initial data
  useEffect(() => {
    fetchSessionLogs(searchTerm, timeRange);
  }, [fetchSessionLogs, timeRange, refreshTrigger]);

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    try {
      if (typeof timestamp === 'number') {
        return new Date(timestamp * 1000).toLocaleString();
      }
      return new Date(timestamp).toLocaleString();
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'Invalid Date';
    }
  };

  // View log details handler
  const handleViewDetails = (log) => {
    const parsedLog = parseLogMessage(log);
    setSelectedLog(parsedLog);
  };

  // Pagination handlers
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(1);
  };

  // Time range change handler
  const handleTimeRangeChange = (event) => {
    setTimeRange(event.target.value);
  };

  // Refresh data handler
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Chart options for description distribution
  const getDescriptionChartOption = () => ({
    title: {
      text: 'Top Log Descriptions',
      left: 'center',
      textStyle: {
        color: theme.palette.mode === 'dark' ? '#fff' : '#000'
      }
    },
    tooltip: {
      trigger: 'item',
      formatter: function(params) {
        return `<strong>${params.data.fullName}</strong><br/>Count: ${params.data.value} (${(params.percent).toFixed(1)}%)`;
      }
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
      type: 'scroll',
      textStyle: {
        color: theme.palette.mode === 'dark' ? '#fff' : '#000'
      }
    },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: true,
      label: {
        show: false
      },
      emphasis: {
        label: {
          show: true,
          formatter: '{b}',
          fontSize: 14
        }
      },
      data: visualizationData.topDescriptions || []
    }],
    backgroundColor: theme.palette.mode === 'dark' ? '#353536' : '#fff'
  });

  // Chart options for compliance distribution
  const getComplianceChartOption = () => {
    const complianceData = Object.entries(visualizationData.complianceCounts || {})
      .map(([name, value], index) => ({
        name,
        value,
        itemStyle: { color: COLOR_PALETTE[(index + 5) % COLOR_PALETTE.length] }
      }))
      .filter(item => item.value > 0);

    return {
      title: {
        text: 'Compliance Framework Distribution',
        left: 'center',
        textStyle: {
          color: theme.palette.mode === 'dark' ? '#fff' : '#000'
        }
      },
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} logs'
      },
      series: [{
        type: 'pie',
        radius: '70%',
        center: ['50%', '55%'],
        data: complianceData,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }],
      backgroundColor: theme.palette.mode === 'dark' ? '#353536' : '#fff'
    };
  };

  // Chart options for rule level distribution
  const getRuleLevelChartOption = () => {
    const levels = Object.keys(visualizationData.ruleLevelCounts || {}).sort((a, b) => parseInt(a) - parseInt(b));
    const values = levels.map(level => visualizationData.ruleLevelCounts[level]);

    const colorMapping = levels.map(level => {
      const numLevel = parseInt(level);
      if (numLevel >= 12) return '#d32f2f'; // error
      if (numLevel >= 8) return '#ed6c02'; // warning
      if (numLevel >= 4) return '#0288d1'; // info
      return '#2e7d32'; // success
    });

    return {
      title: {
        text: 'Rule Level Distribution',
        left: 'center',
        textStyle: {
          color: theme.palette.mode === 'dark' ? '#fff' : '#000'
        }
      },
      tooltip: {
        trigger: 'axis',
        formatter: function(params) {
          const level = params[0].name;
          const count = params[0].value;
          const severity = getRuleLevelSeverity(level);
          return `<div>Level ${level} (${severity})</div><div>Count: ${count}</div>`;
        }
      },
      xAxis: {
        type: 'category',
        data: levels,
        axisLabel: {
          color: theme.palette.mode === 'dark' ? '#fff' : '#000',
          rotate: 0
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: theme.palette.mode === 'dark' ? '#fff' : '#000'
        }
      },
      series: [{
        data: values.map((value, index) => ({
          value,
          itemStyle: { color: colorMapping[index] }
        })),
        type: 'bar'
      }],
      backgroundColor: theme.palette.mode === 'dark' ? '#353536' : '#fff'
    };
  };

  // Create description boxes (cards) for visualizing top descriptions
  const renderDescriptionBoxes = () => {
    if (!visualizationData.topDescriptions) return null;

    return (
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {visualizationData.topDescriptions.slice(0, 9).map((item, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card 
              variant="outlined"
              sx={{
                height: '100%',
                borderLeft: `4px solid ${item.itemStyle.color}`,
                transition: 'all 0.2s',
                '&:hover': {
                  boxShadow: 3,
                  transform: 'translateY(-2px)'
                }
              }}
            >
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
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
                      WebkitBoxOrient: 'vertical'
                    }}
                  >
                    {item.fullName}
                  </Typography>
                  <Badge 
                    badgeContent={item.value} 
                    color="primary"
                    sx={{ 
                      '& .MuiBadge-badge': {
                        backgroundColor: item.itemStyle.color,
                        color: '#fff',
                        fontWeight: 'bold',
                        fontSize: '0.85rem'
                      }
                    }}
                  />
                </Box>
                <Tooltip title="Filter by this description">
                  <Button 
                    size="small" 
                    variant="text" 
                    onClick={() => setSearchTerm(item.fullName)}
                    sx={{ mt: 1, color: item.itemStyle.color }}
                  >
                    Filter
                  </Button>
                </Tooltip>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };

  return (
    <Box p={4}>
      {/* Header */}
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

        {/* Compliance Filter */}
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth variant="outlined" size="small">
            <InputLabel id="compliance-filter-label">Compliance</InputLabel>
            <Select
              labelId="compliance-filter-label"
              value={selectedComplianceFilter}
              onChange={(e) => setSelectedComplianceFilter(e.target.value)}
              label="Compliance"
              startAdornment={<ComplianceIcon sx={{ mr: 1, color: 'action.active' }} />}
            >
              <MenuItem value="all">All Frameworks</MenuItem>
              <MenuItem value="HIPAA">HIPAA</MenuItem>
              <MenuItem value="GDPR">GDPR</MenuItem>
              <MenuItem value="NIST">NIST 800-53</MenuItem>
              <MenuItem value="PCI_DSS">PCI DSS</MenuItem>
              <MenuItem value="TSC">TSC</MenuItem>
              <MenuItem value="GPG13">GPG13</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {/* Search Box */}
        <Grid item xs={12} sm={10} md={5}>
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

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Status Summary */}
      <Alert
        icon={<ComplianceIcon />}
        severity="info"
        sx={{ mb: 3 }}
      >
        {loading ? (
          <Box display="flex" alignItems="center">
            <CircularProgress size={20} sx={{ mr: 1 }} /> Loading compliance logs...
          </Box>
        ) : (
          `${filteredLogs.length} compliance-related logs found for selected time range`
        )}
      </Alert>

      {/* Description Boxes - Visualization of top descriptions */}
      <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
        <AssessmentIcon sx={{ mr: 1 }} /> Common Compliance Events
      </Typography>
      {loading ? (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[...Array(6)].map((_, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Skeleton variant="rectangular" height={100} />
            </Grid>
          ))}
        </Grid>
      ) : (
        renderDescriptionBoxes()
      )}

      {/* Charts Section */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Description Distribution Chart */}
        <Grid item xs={12} md={6}>
          {loading ? (
            <Skeleton variant="rectangular" height={300} />
          ) : (
            <Paper elevation={0} variant="outlined" sx={{ p: 2 }}>
              <ReactECharts
                option={getDescriptionChartOption()}
                style={{ height: '300px', width: '100%' }}
                opts={{ renderer: 'canvas' }}
              />
            </Paper>
          )}
        </Grid>

        {/* Rule Level Chart */}
        <Grid item xs={12} md={6}>
          {loading ? (
            <Skeleton variant="rectangular" height={300} />
          ) : (
            <Paper elevation={0} variant="outlined" sx={{ p: 2 }}>
              <ReactECharts
                option={getRuleLevelChartOption()}
                style={{ height: '300px', width: '100%' }}
                opts={{ renderer: 'canvas' }}
              />
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* Logs Table Section */}
      <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
        <TimelineIcon sx={{ mr: 1 }} /> Compliance Log Events
      </Typography>

      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 'calc(100vh - 600px)', minHeight: '300px' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell style={{ fontWeight: 'bold', backgroundColor: theme.palette.mode === 'dark' ? '#353536' : '#f5f5f5' }}>Timestamp</TableCell>
              <TableCell style={{ fontWeight: 'bold', backgroundColor: theme.palette.mode === 'dark' ? '#353536' : '#f5f5f5' }}>Agent Name</TableCell>
              <TableCell style={{ fontWeight: 'bold', backgroundColor: theme.palette.mode === 'dark' ? '#353536' : '#f5f5f5' }}>Rule Level</TableCell>
              <TableCell style={{ fontWeight: 'bold', backgroundColor: theme.palette.mode === 'dark' ? '#353536' : '#f5f5f5' }}>Description</TableCell>
              <TableCell style={{ fontWeight: 'bold', backgroundColor: theme.palette.mode === 'dark' ? '#353536' : '#f5f5f5' }}>Compliance</TableCell>
              <TableCell style={{ fontWeight: 'bold', backgroundColor: theme.palette.mode === 'dark' ? '#353536' : '#f5f5f5' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              // Show loading skeletons for the table
              [...Array(rowsPerPage)].map((_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton width={60} /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton width={120} /></TableCell>
                  <TableCell><Skeleton width={80} /></TableCell>
                </TableRow>
              ))
            ) : displayedLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Box py={3}>
                    <Typography variant="body1" color="text.secondary">
                      No logs match the current filters
                    </Typography>
                    <Button 
                      variant="text" 
                      color="primary" 
                      onClick={() => {
                        setSearchTerm('');
                        setSelectedComplianceFilter('all');
                      }}
                      sx={{ mt: 1 }}
                    >
                      Clear Filters
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              displayedLogs.map((log, idx) => {
                const parsedLog = log.parsed;
                const rule = parsedLog.rule || {};

                const complianceTypes = [
                  rule.hipaa?.length && 'HIPAA',
                  rule.gdpr?.length && 'GDPR',
                  rule.nist_800_53?.length && 'NIST',
                  rule.pci_dss?.length && 'PCI DSS',
                  rule.tsc?.length && 'TSC',
                  rule.gpg13?.length && 'GPG13'
                ].filter(Boolean);

                return (
                  <TableRow key={idx} hover>
                    <TableCell>{formatTimestamp(parsedLog.timestamp)}</TableCell>
                    <TableCell>
                      <Tooltip title={rule.description}>
                        <Typography
                          sx={{
                            maxWidth: '300px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {rule.description}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={0.5} flexWrap="wrap">
                        {complianceTypes.map((type) => (
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
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        startIcon={<VisibilityIcon />}
                        onClick={() => handleViewDetails(log)}
                        variant="text"
                        color="primary"
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination Controls */}
      <Grid container spacing={2} alignItems="center" sx={{ mt: 2 }}>
        <Grid item xs={12} sm={6} md={4}>
          <FormControl variant="outlined" size="small" fullWidth>
            <InputLabel id="rows-per-page-label">Rows per page</InputLabel>
            <Select
              labelId="rows-per-page-label"
              value={rowsPerPage}
              onChange={handleChangeRowsPerPage}
              label="Rows per page"
              disabled={loading}
            >
              <MenuItem value={10}>10</MenuItem>
              <MenuItem value={25}>25</MenuItem>
              <MenuItem value={50}>50</MenuItem>
              <MenuItem value={100}>100</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6} md={8} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          {loading ? (
            <Skeleton variant="rectangular" width={300} height={36} />
          ) : (
            <Pagination 
              count={totalPages} 
              page={page} 
              onChange={handleChangePage} 
              color="primary"
              showFirstButton
              showLastButton
              siblingCount={isMobile ? 0 : 1}
            />
          )}
        </Grid>
      </Grid>

      {/* Log Details Dialog */}
      <Dialog
        open={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{
          backgroundColor: '#f5f5f5',
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
        <DialogContent>
          <StructuredLogView data={selectedLog} />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default SessionLogs;