import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Alert,
    TextField,
    InputAdornment,
    CircularProgress,
    Link,
    Dialog,
    DialogTitle,
    DialogContent,
    IconButton,
    Chip,
    Pagination,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Grid,
    Tooltip,
    Card,
    CardContent
} from '@mui/material';
import { 
    Search as SearchIcon, 
    ShieldOutlined as MitreIcon 
} from '@mui/icons-material';
import CloseIcon from '@mui/icons-material/Close';
import axios from 'axios';
import * as echarts from 'echarts/core';
import { 
    TitleComponent, 
    TooltipComponent, 
    GridComponent, 
    DatasetComponent, 
    TransformComponent 
} from 'echarts/components';
import { 
    PieChart, 
    BarChart, 
    LineChart 
} from 'echarts/charts';
import { 
    LabelLayout, 
    UniversalTransition 
} from 'echarts/features';
import { CanvasRenderer } from 'echarts/renderers';
import { parseLogMessage, StructuredLogView } from '../utils/normalizeLogs';
import { API_URL } from '../config';

echarts.use([
    TitleComponent,
    TooltipComponent,
    GridComponent,
    DatasetComponent,
    TransformComponent,
    PieChart,
    BarChart,
    LineChart,
    LabelLayout,
    UniversalTransition,
    CanvasRenderer
]);

const MitreAttackLogs = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [chartLoading, setChartLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedLog, setSelectedLog] = useState(null);

    // Dashboard state
    const [dashboardData, setDashboardData] = useState({
        tacticDistribution: [],
        techniqueDistribution: [],
        levelDistribution: [],
        timeSeriesData: [],
        topAgents: []
    });
    
    // Pagination and filtering states
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(100);
    const [totalPages, setTotalPages] = useState(0);
    const [totalLogs, setTotalLogs] = useState(0);

    // Time range state
    const [timeRange, setTimeRange] = useState('7days');

    // Search state
    const [searchTerm, setSearchTerm] = useState('');

    // Refs for charts
    const tacticChartRef = React.useRef(null);
    const techniqueChartRef = React.useRef(null);
    const levelChartRef = React.useRef(null);
    const timeSeriesChartRef = React.useRef(null);
    const agentChartRef = React.useRef(null);

    // Function to get time range start date
    const getTimeRangeDate = useCallback(() => {
        const now = new Date();
        let startDate;
        
        switch(timeRange) {
          case '1hr':
            startDate = new Date(now.getTime() - 60 * 60 * 1000);
            break;
          case '6hr':
            startDate = new Date(now.getTime() - 6 * 60 * 60 * 1000);
            break;
          case '24hr':
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
          case '7days':
          default:
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        }
        
        console.log(`Time range: ${timeRange}, start date: ${startDate.toISOString()}`);
        return startDate;
      }, [timeRange]);

    const renderCharts = useCallback((data) => {
        if (!data || Object.values(data).some(arr => !Array.isArray(arr) || arr.length === 0)) {
            console.warn('Insufficient data for charts rendering');
            return;
          }
        setTimeout(() => {

            requestAnimationFrame(() => {
            // Tactic Distribution Pie Chart
            if (tacticChartRef.current && tacticChartRef.current.clientHeight > 0) {
                const tacticChart = echarts.init(tacticChartRef.current);
                tacticChart.setOption({
                    title: { text: 'Top MITRE Tactics', left: 'center' },
                    tooltip: { trigger: 'item' },
                    series: [{
                        type: 'pie',
                        radius: ['40%', '70%'],
                        avoidLabelOverlap: false,
                        itemStyle: { borderRadius: 10 },
                        data: data.tacticDistribution
                    }]
                });
            }});

            requestAnimationFrame(() => {
            // Technique Distribution Bar Chart
            if (techniqueChartRef.current) {
                const techniqueChart = echarts.init(techniqueChartRef.current);
                techniqueChart.setOption({
                    title: { text: 'Top Techniques', left: 'center' },
                    tooltip: { trigger: 'axis' },
                    xAxis: { 
                        type: 'category', 
                        data: data.techniqueDistribution.map(item => item.name),
                        axisLabel: { rotate: 45, interval: 0 }
                    },
                    yAxis: { type: 'value' },
                    series: [{
                        type: 'bar',
                        data: data.techniqueDistribution.map(item => item.value),
                        itemStyle: { color: '#3f51b5' }
                    }]
                });
            }});

            requestAnimationFrame(() => {
            // Level Distribution Pie Chart
            if (levelChartRef.current) {
                const levelChart = echarts.init(levelChartRef.current);
                levelChart.setOption({
                    title: { text: 'Rule Severity Levels', left: 'center' },
                    tooltip: { trigger: 'item' },
                    series: [{
                        type: 'pie',
                        radius: ['40%', '70%'],
                        avoidLabelOverlap: false,
                        itemStyle: { borderRadius: 10 },
                        data: data.levelDistribution,
                        color: ['#f44336', '#ff9800', '#2196f3', '#4caf50']
                    }]
                });
            }});

            requestAnimationFrame(() => {
            // Time Series Line Chart
            if (timeSeriesChartRef.current) {
                const timeSeriesChart = echarts.init(timeSeriesChartRef.current);
                timeSeriesChart.setOption({
                    title: { text: 'Logs Over Time', left: 'center' },
                    tooltip: { trigger: 'axis' },
                    xAxis: { 
                        type: 'category', 
                        data: data.timeSeriesData.map(item => item.name),
                        axisLabel: { rotate: 45, interval: 0 }
                    },
                    yAxis: { type: 'value' },
                    series: [{
                        type: 'line',
                        data: data.timeSeriesData.map(item => item.value),
                        smooth: true,
                        itemStyle: { color: '#9c27b0' }
                    }]
                });
            }});

            requestAnimationFrame(() => {
            // Top Agents Bar Chart
            if (agentChartRef.current) {
                const agentChart = echarts.init(agentChartRef.current);
                agentChart.setOption({
                    title: { text: 'Top Agents', left: 'center' },
                    tooltip: { trigger: 'axis' },
                    xAxis: { 
                        type: 'category', 
                        data: data.topAgents.map(item => item.name),
                        axisLabel: { rotate: 45, interval: 0 }
                    },
                    yAxis: { type: 'value' },
                    series: [{
                        type: 'bar',
                        data: data.topAgents.map(item => item.value),
                        itemStyle: { color: '#ff5722' }
                    }]
                });
            }});
            
            
        }, 200);
    },[]);

    const prepareDashboardData = useCallback((logData) => {
        // Tactic Distribution
        const tacticCounts = {};
        const techniqueCounts = {};
        const levelCounts = {};
        const agentCounts = {};
        const timeSeriesData = {};
        const getTimeGroupKey = (timestamp) => {
            const date = new Date(timestamp);
            if (timeRange === '1hr') {
              // Group by minutes for 1 hour view
              return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
            } else if (timeRange === '6hr' || timeRange === '24hr') {
              // Group by hour for 6-24 hour view
              return `${date.getHours().toString().padStart(2, '0')}:00`;
            } else {
              // Group by day for 7-day view
              return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
            }
          };

        logData.forEach(log => {
            const parsed = log.parsed;
            if (!parsed) return;
            
            const rule = parsed.rule || {};
            const mitre = rule.mitre || {};

            // Tactic Distribution
            mitre.tactic?.forEach(tactic => {
                tacticCounts[tactic] = (tacticCounts[tactic] || 0) + 1;
            });

            // Technique Distribution
            mitre.technique?.forEach(technique => {
                techniqueCounts[technique] = (techniqueCounts[technique] || 0) + 1;
            });

            // Level Distribution
            const level = rule.level || 'Unknown';
            levelCounts[level] = (levelCounts[level] || 0) + 1;

            // Agent Distribution
            const agentName = parsed.agent?.name || 'Unknown';
            agentCounts[agentName] = (agentCounts[agentName] || 0) + 1;

            // Time Series Data - Group by day for better visualization
            const timestamp = new Date(parsed.timestamp);
            //const dateKey = `${timestamp.getFullYear()}-${(timestamp.getMonth() + 1).toString().padStart(2, '0')}-${timestamp.getDate().toString().padStart(2, '0')}`;
            const timeKey = getTimeGroupKey(timestamp);
            timeSeriesData[timeKey] = (timeSeriesData[timeKey] || 0) + .1;
        });

        // Convert to chart-friendly format
        const dashboardData = {
            tacticDistribution: Object.entries(tacticCounts)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 10),
            techniqueDistribution: Object.entries(techniqueCounts)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 10),
            levelDistribution: Object.entries(levelCounts)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => a.name.localeCompare(b.name)),
            timeSeriesData: Object.entries(timeSeriesData)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => a.name.localeCompare(b.name)),
            topAgents: Object.entries(agentCounts)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 5)
        };

        setDashboardData(dashboardData);
        
        // Render charts
        renderCharts(dashboardData);

        if (!Array.isArray(logData) || logData.length === 0) {
            console.warn('No logs data available for dashboard');
            return;
          }

    },[renderCharts]);

    // Fetch ALL Mitre logs for visualization
    const fetchAllMitreLogs = useCallback(async () => {
        try {
            setChartLoading(true);
            setError(null);

            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Authentication token not found');
            }

            const startTime = getTimeRangeDate().toISOString();
            
            // This API call should return ALL Mitre logs for the selected time range
            // without pagination limits for visualization purposes
            const response = await axios.get(`${API_URL}/api/logs/mitre`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                params: {
                    startTime: startTime,
                    limit: 5000,  // Request a large batch of logs
                    page: 1
                    //hasMitre: true
                }
            });
            console.log(`Fetched ${response.data.logs.length} logs for time range: ${timeRange}`);

            const allLogs = response.data.logs || [];
            
            // Parse logs
            const parsedLogs = allLogs
                .map(log => ({
                    ...log,
                    parsed: parseLogMessage(log)
                }))
                .filter(log => log.parsed !== null);

            // Set total count for info display
            setTotalLogs(parsedLogs.length);
            
            // Prepare dashboard data with ALL logs
            prepareDashboardData(parsedLogs);

        } catch (error) {
            console.error('Error fetching all Mitre Attack logs for visualization:', error);
            setError(error.response?.data?.message || error.message || 'Failed to fetch visualization data');
        } finally {
            setChartLoading(false);
        }
    }, [getTimeRangeDate, prepareDashboardData, timeRange]);

    // Fetch paginated Mitre logs for the table display
    const fetchPaginatedMitreLogs = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Authentication token not found');
            }

            const startTime = getTimeRangeDate().toISOString();
            
            const params = {
                page,
                limit: rowsPerPage,
                search: searchTerm,
                startTime: startTime,
                hasMitre: true
            };

            const response = await axios.get(`${API_URL}/api/logs/mitre`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                params
            });

            // Parse each log with parseLogMessage
            const parsedLogs = response.data.logs
                .map(log => ({
                    ...log,
                    parsed: parseLogMessage(log)
                }))
                .filter(log => log.parsed !== null);

            setLogs(parsedLogs);
            setTotalPages(response.data.totalPages || 1);

        } catch (error) {
            console.error('Error fetching paginated Mitre Attack logs:', error);
            setError(error.response?.data?.message || error.message || 'Failed to fetch logs');
            setLogs([]);
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage, searchTerm, getTimeRangeDate]);

    // Handle window resize to redraw charts
    useEffect(() => {
        let resizeTimer;
        
        const handleResize = () => {
          clearTimeout(resizeTimer);
          resizeTimer = setTimeout(() => {
            const charts = [
              tacticChartRef.current && echarts.getInstanceByDom(tacticChartRef.current),
              techniqueChartRef.current && echarts.getInstanceByDom(techniqueChartRef.current),
              levelChartRef.current && echarts.getInstanceByDom(levelChartRef.current),
              timeSeriesChartRef.current && echarts.getInstanceByDom(timeSeriesChartRef.current),
              agentChartRef.current && echarts.getInstanceByDom(agentChartRef.current)
            ].filter(Boolean);
            
            charts.forEach(chart => chart.resize());
          }, 200);
        };
      
        window.addEventListener('resize', handleResize);
        return () => {
          window.removeEventListener('resize', handleResize);
          clearTimeout(resizeTimer);
        };
      }, []);

    // Fetch ALL Mitre logs for visualization when time range changes
    useEffect(() => {
        fetchAllMitreLogs();
    }, [fetchAllMitreLogs, timeRange]);

    // Fetch paginated Mitre logs for table display with debouncing for search
    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            fetchPaginatedMitreLogs();
        }, 500);

        return () => clearTimeout(debounceTimer);
    }, [fetchPaginatedMitreLogs, page, searchTerm, timeRange]);

    useEffect(() => {
        if (!chartLoading && Object.values(dashboardData).some(arr => arr.length > 0)) {
          renderCharts(dashboardData);
        }
      }, [chartLoading, dashboardData, renderCharts]);

    const handleViewDetails = (log) => {
        setSelectedLog(parseLogMessage(log));
    };

    useEffect(() => {
        // Clear existing dashboard data when time range changes
        setDashboardData({
          tacticDistribution: [],
          techniqueDistribution: [],
          levelDistribution: [],
          timeSeriesData: [],
          topAgents: []
        });
        
        // Show loading indicator
        setChartLoading(true);
        
        // fetchAllMitreLogs will be called due to dependency
      }, [timeRange]);


    useEffect(() => {
        let charts = [];
        
        // Function to initialize all charts once data is available
        const initCharts = () => {
          if (chartLoading || !Object.values(dashboardData).some(arr => arr.length > 0)) {
            return;
          }
          
          const refs = [
            tacticChartRef.current,
            techniqueChartRef.current,
            levelChartRef.current,
            timeSeriesChartRef.current,
            agentChartRef.current
          ];
          
          // Clean up any existing chart instances
          charts.forEach(chart => {
            chart.dispose();
          });
          charts = [];
          
          // Create new instances
          refs.forEach(ref => {
            if (ref && ref.clientWidth > 0 && ref.clientHeight > 0) {
              try {
                const chart = echarts.init(ref);
                charts.push(chart);
              } catch (err) {
                console.error('Error initializing chart:', err);
              }
            }
          });
          
          // Render charts with data
          renderCharts(dashboardData);
        };
        
        // Initialize charts when data is ready
        initCharts();
        
        // Cleanup function
        return () => {
          charts.forEach(chart => {
            chart.dispose();
          });
        };
      }, [dashboardData, chartLoading, renderCharts]);

    const formatTimestamp = (timestamp) => {
        try {
            return new Date(timestamp).toLocaleString();
        } catch (error) {
            return 'Invalid Date';
        }
    };

    const renderMitreDetails = (mitre) => {
        if (!mitre) return null;
        return (
            <Box>
                {mitre.id?.length > 0 && (
                    <Tooltip title="Technique ID">
                        <Chip 
                            label={`ID: ${mitre.id.join(', ')}`} 
                            size="small" 
                            color="primary" 
                            variant="outlined" 
                            sx={{ m: 0.5 }}
                        />
                    </Tooltip>
                )}
                {mitre.tactic?.length > 0 && (
                    <Tooltip title="Tactic">
                        <Chip 
                            label={`Tactic: ${mitre.tactic.join(', ')}`} 
                            size="small" 
                            color="secondary" 
                            variant="outlined" 
                            sx={{ m: 0.5 }}
                        />
                    </Tooltip>
                )}
                {mitre.technique?.length > 0 && (
                    <Tooltip title="Technique">
                        <Chip 
                            label={`Technique: ${mitre.technique.join(', ')}`} 
                            size="small" 
                            color="info" 
                            variant="outlined" 
                            sx={{ m: 0.5 }}
                        />
                    </Tooltip>
                )}
            </Box>
        );
    };

    // Get chip color based on rule level
    const getLevelColor = (level) => {
        const numLevel = parseInt(level);
        if (numLevel >= 10) return 'error';
        if (numLevel >= 7) return 'warning';
        if (numLevel >= 4) return 'info';
        return 'success';
    };

    return (
        <Box p={4}>
            <Typography variant="h4" gutterBottom sx={{ color: '#d32f2f', mb: 3 }}>
                MITRE ATT&CK Logs
                <Typography variant="subtitle1" sx={{ color: 'text.secondary', mt: 1 }}>
                    Tracking Adversarial Tactics and Techniques
                </Typography>
            </Typography>

            {/* Filtering Section */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}>
                    <TextField
                        fullWidth
                        margin="normal"
                        variant="outlined"
                        placeholder="Search logs by any field (including raw message)..."
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
                <Grid item xs={12} md={6}>
                    <FormControl fullWidth margin="normal" variant="outlined">
                        <InputLabel>Time Range</InputLabel>
                        <Select
                            value={timeRange}
                            onChange={(e) => {
                              setTimeRange(e.target.value);
                              // Optionally reset page to 1 when time range changes
                              setPage(1);
                            }}
                            label="Time Range"
                        >
                            <MenuItem value="1hr">Last 1 Hour</MenuItem>
                            <MenuItem value="6hr">Last 6 Hours</MenuItem>
                            <MenuItem value="24hr">Last 24 Hours</MenuItem>
                            <MenuItem value="7days">Last 7 Days</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>
            </Grid>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            <Alert
                icon={<MitreIcon />}
                severity="warning"
                sx={{ mb: 3 }}
            >
                {totalLogs} MITRE ATT&CK related logs found in the selected time range
            </Alert>

            {/* Dashboard Visualization Section */}
            <Typography variant="h5" gutterBottom sx={{ color: '#555', mb: 2 }}>
                Dashboard for {timeRange === '1hr' ? 'Last Hour' : 
                              timeRange === '6hr' ? 'Last 6 Hours' : 
                              timeRange === '24hr' ? 'Last 24 Hours' : 
                              'Last 7 Days'}
            </Typography>
            
            {chartLoading ? (
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
                    <CircularProgress color="secondary" />
                    <Typography variant="subtitle1" sx={{ ml: 2 }}>
                        Loading visualization data...
                    </Typography>
                </Box>
            ) : (
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={12} md={6} lg={3}>
                        <Card>
                            <CardContent>
                                <Box ref={tacticChartRef} sx={{ height: 300 }} />
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={6} lg={3}>
                        <Card>
                            <CardContent>
                                <Box ref={techniqueChartRef} sx={{ height: 300 }} />
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={6} lg={3}>
                        <Card>
                            <CardContent>
                                <Box ref={levelChartRef} sx={{ height: 300 }} />
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={6} lg={3}>
                        <Card>
                            <CardContent>
                                <Box ref={timeSeriesChartRef} sx={{ height: 300 }} />
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12}>
                        <Card>
                            <CardContent>
                                <Box ref={agentChartRef} sx={{ height: 300 }} />
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            <Typography variant="h5" gutterBottom sx={{ color: '#555', mb: 2 }}>
                Log Details
            </Typography>
            
            {loading ? (
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
                    <CircularProgress color="error" />
                </Box>
            ) : (
                <>
                    <TableContainer component={Paper} sx={{ maxHeight: 'calc(100vh - 400px)' }}>
                        <Table stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Timestamp</TableCell>
                                    <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Agent Name</TableCell>
                                    <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Rule Level</TableCell>
                                    <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Rule Description</TableCell>
                                    <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>MITRE Details</TableCell>
                                    <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {logs.map((log) => {
                                    const parsedLog = log.parsed;
                                    if (!parsedLog) return null;
                                    
                                    const rule = parsedLog.rule || {};

                                    return (
                                        <TableRow key={log._id} hover>
                                            <TableCell>{formatTimestamp(parsedLog.timestamp)}</TableCell>
                                            <TableCell>{parsedLog.agent?.name || 'Unknown'}</TableCell>
                                            <TableCell>
                                                <Chip 
                                                    label={rule.level} 
                                                    color={getLevelColor(rule.level)}
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell>{rule.description}</TableCell>
                                            <TableCell>
                                                {renderMitreDetails(rule.mitre)}
                                            </TableCell>
                                            <TableCell>
                                                <Link
                                                    component="button"
                                                    variant="body2"
                                                    onClick={() => handleViewDetails(log)}
                                                    sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                                                >
                                                    View Details
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
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
                                    onChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
                                    label="Rows per page"
                                >
                                    <MenuItem value={10}>10</MenuItem>
                                    <MenuItem value={25}>25</MenuItem>
                                    <MenuItem value={50}>50</MenuItem>
                                    <MenuItem value={100}>100</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6} md={8} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Pagination 
                                count={totalPages} 
                                page={page} 
                                onChange={(e, newPage) => setPage(newPage)} 
                                color="primary"
                                showFirstButton
                                showLastButton
                            />
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
                            <Typography variant="h6">MITRE ATT&CK Log Details</Typography>
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
                </>
            )}
        </Box>
    );
};

export default MitreAttackLogs;