import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import ReactECharts from 'echarts-for-react';
import { 
  Box, 
  Typography, 
  Paper, 
  Table, 
  TableContainer, 
  TableHead, 
  TableBody, 
  TableRow, 
  TableCell,
  Chip,
  Grid,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  CircularProgress,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Card,
  CardContent,
  Tabs,
  Tab,
  Button
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import TableViewIcon from '@mui/icons-material/TableView';
import DashboardIcon from '@mui/icons-material/Dashboard';
import { parseLogMessage, StructuredLogView } from '../utils/normalizeLogs';

// Define API URL from environment or default
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const ThreatHunting = () => {
  // State variables
  const [logs, setLogs] = useState([]);
  const [allLogs, setAllLogs] = useState([]); // Store all logs for visualization
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState(0);
  const [view, setView] = useState('dashboard'); // 'dashboard' or 'events'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedSrcCountry, setSelectedSrcCountry] = useState('');
  const [selectedDstCountry, setSelectedDstCountry] = useState('');

  // Fetch logs from API
  useEffect(() => {
    const fetchThreatLogs = async () => {
      try {
        setLoading(true);
        
        // Fetch paginated logs for the table
        const response = await axios.get(`${API_URL}/api/logs/threats`, {
          params: {
            page: page,
            limit: rowsPerPage,
            search: searchTerm,
            action: selectedAction,
            srcCountry: selectedSrcCountry,
            dstCountry: selectedDstCountry
          }
        });
        
        // Parse logs through our normalization function
        const normalizedLogs = response.data.logs.map(log => parseLogMessage(log));
        
        setLogs(normalizedLogs);
        // Calculate total pages based on response
        setTotalPages(Math.ceil(response.data.total / rowsPerPage) || 1);
        
        // Fetch all logs for visualization (with a higher limit or no pagination)
        const allLogsResponse = await axios.get(`${API_URL}/api/logs/threats`, {
          params: {
            limit: 1000 // Adjust based on your data size
          }
        });
        
        const allNormalizedLogs = allLogsResponse.data.logs.map(log => parseLogMessage(log));
        setAllLogs(allNormalizedLogs);
        
        setError(null);
      } catch (err) {
        console.error('Error fetching threat logs:', err);
        setError('Failed to fetch threat logs. Please try again.');
        setLogs([]);
        setAllLogs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchThreatLogs();
  }, [page, rowsPerPage, searchTerm, selectedAction, selectedSrcCountry, selectedDstCountry]);

  // Handler for viewing log details
  const handleViewDetails = (log) => {
    setSelectedLog(log);
  };

  // Format timestamp to be more readable
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch (e) {
      return timestamp;
    }
  };

  // Get color based on action type
  const getActionColor = (action) => {
    if (!action) return 'default';
    
    const actionLower = action.toLowerCase();
    if (actionLower === 'block' || actionLower === 'denied') return 'error';
    if (actionLower === 'alert') return 'warning';
    if (actionLower === 'allow' || actionLower === 'permitted') return 'success';
    return 'info';
  };

  // Process data for visualizations
  const visualizationData = useMemo(() => {
    if (!allLogs || allLogs.length === 0) return null;
    
    // Count by action type
    const actionCounts = {};
    
    // Source and destination countries
    const srcCountryMap = {};
    const dstCountryMap = {};
    const serviceMap = {};
    const appCategoryMap = {};
    const directionMap = {};
    const timelineData = [];
    const srcDestPairs = {};
    
    allLogs.forEach(log => {
      // Process action
      const action = log.traffic?.action || 'Unknown';
      actionCounts[action] = (actionCounts[action] || 0) + 1;
      
      // Process source country
      const srcCountry = log.traffic?.srcCountry || 'Unknown';
      if (srcCountry !== 'N/A' && srcCountry !== 'Unknown') {
        srcCountryMap[srcCountry] = (srcCountryMap[srcCountry] || 0) + 1;
      }
      
      // Process destination country
      const dstCountry = log.traffic?.dstCountry || 'Unknown';
      if (dstCountry !== 'N/A' && dstCountry !== 'Unknown') {
        dstCountryMap[dstCountry] = (dstCountryMap[dstCountry] || 0) + 1;
      }
      
      // Process service
      const service = log.traffic?.service || 'Unknown';
      if (service !== 'N/A' && service !== 'Unknown') {
        serviceMap[service] = (serviceMap[service] || 0) + 1;
      }
      
      // Process app category
      const appcat = log.traffic?.appcat || 'Unknown';
      if (appcat !== 'N/A' && appcat !== 'Unknown') {
        appCategoryMap[appcat] = (appCategoryMap[appcat] || 0) + 1;
      }
      
      // Process direction
      const direction = log.traffic?.direction || 'Unknown';
      if (direction !== 'N/A' && direction !== 'Unknown') {
        directionMap[direction] = (directionMap[direction] || 0) + 1;
      }
      
      // Process timestamp for timeline
      if (log.timestamp) {
        let date;
        try {
          date = new Date(log.timestamp);
          const dateString = date.toISOString().split('T')[0];
          
          // Group by date
          const existingIndex = timelineData.findIndex(item => item.date === dateString);
          if (existingIndex >= 0) {
            timelineData[existingIndex].count += 1;
          } else {
            timelineData.push({
              date: dateString,
              count: 1
            });
          }
        } catch (e) {
          // Skip invalid dates
        }
      }
      
      // Process source-destination pairs for connection visualization
      if (srcCountry !== 'N/A' && srcCountry !== 'Unknown' && 
          dstCountry !== 'N/A' && dstCountry !== 'Unknown') {
        const pairKey = `${srcCountry}->${dstCountry}`;
        srcDestPairs[pairKey] = (srcDestPairs[pairKey] || 0) + 1;
      }
    });
    
    // Sort and format for charts
    const topSrcCountries = Object.entries(srcCountryMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));
      
    const topDstCountries = Object.entries(dstCountryMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));
      
    const topServices = Object.entries(serviceMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));
    
    const topAppCategories = Object.entries(appCategoryMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));
      
    // Sort timeline data
    const sortedTimelineData = timelineData
      .sort((a, b) => new Date(a.date) - new Date(b.date));
      
    // Create connection data for source -> destination visualization
    const connectionData = Object.entries(srcDestPairs)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50) // Take top 50 connections
      .map(([pair, value]) => {
        const [source, target] = pair.split('->');
        return { source, target, value };
      });
    
    // Extract unique countries for connection chart
    const connectionCountries = new Set();
    connectionData.forEach(item => {
      connectionCountries.add(item.source);
      connectionCountries.add(item.target);
    });
    
    return {
      actionCounts,
      topSrcCountries,
      topDstCountries,
      topServices,
      topAppCategories,
      directionCounts: directionMap,
      timelineData: sortedTimelineData,
      connectionData,
      connectionCountries: Array.from(connectionCountries)
    };
  }, [allLogs]);

  // Chart options
  const actionChartOption = {
    title: {
      text: 'Events by Action',
      left: 'center'
    },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      data: Object.keys(visualizationData?.actionCounts || {})
    },
    series: [
      {
        name: 'Action',
        type: 'pie',
        radius: ['50%', '70%'],
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
            fontSize: '18',
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: Object.entries(visualizationData?.actionCounts || {}).map(([name, value]) => ({
          name,
          value,
          itemStyle: {
            color: name.toLowerCase() === 'block' || name.toLowerCase() === 'denied' ? '#dc3545' : 
                  name.toLowerCase() === 'alert' ? '#ffc107' : 
                  name.toLowerCase() === 'allow' || name.toLowerCase() === 'permitted' ? '#28a745' : '#6c757d'
          }
        }))
      }
    ]
  };

  const srcCountryChartOption = {
    title: {
      text: 'Top Source Countries',
      left: 'center'
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
      type: 'value'
    },
    yAxis: {
      type: 'category',
      data: (visualizationData?.topSrcCountries || []).map(item => item.name).reverse(),
      axisLabel: {
        width: 120,
        overflow: 'truncate'
      }
    },
    series: [
      {
        name: 'Count',
        type: 'bar',
        data: (visualizationData?.topSrcCountries || []).map(item => item.value).reverse(),
        itemStyle: {
          color: '#36a2eb'
        }
      }
    ]
  };

  const dstCountryChartOption = {
    title: {
      text: 'Top Destination Countries',
      left: 'center'
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
      type: 'value'
    },
    yAxis: {
      type: 'category',
      data: (visualizationData?.topDstCountries || []).map(item => item.name).reverse(),
      axisLabel: {
        width: 120,
        overflow: 'truncate'
      }
    },
    series: [
      {
        name: 'Count',
        type: 'bar',
        data: (visualizationData?.topDstCountries || []).map(item => item.value).reverse(),
        itemStyle: {
          color: '#ff6384'
        }
      }
    ]
  };

  const serviceChartOption = {
    title: {
      text: 'Top Services',
      left: 'center'
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
      type: 'value'
    },
    yAxis: {
      type: 'category',
      data: (visualizationData?.topServices || []).map(item => item.name).reverse(),
      axisLabel: {
        width: 150,
        overflow: 'truncate'
      }
    },
    series: [
      {
        name: 'Count',
        type: 'bar',
        data: (visualizationData?.topServices || []).map(item => item.value).reverse(),
        itemStyle: {
          color: '#4bc0c0'
        }
      }
    ]
  };

  const appCategoryChartOption = {
    title: {
      text: 'Top Application Categories',
      left: 'center'
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
      type: 'value'
    },
    yAxis: {
      type: 'category',
      data: (visualizationData?.topAppCategories || []).map(item => item.name).reverse(),
      axisLabel: {
        width: 150,
        overflow: 'truncate'
      }
    },
    series: [
      {
        name: 'Count',
        type: 'bar',
        data: (visualizationData?.topAppCategories || []).map(item => item.value).reverse(),
        itemStyle: {
          color: '#ff9f40'
        }
      }
    ]
  };

  const directionChartOption = {
    title: {
      text: 'Traffic Direction',
      left: 'center'
    },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'horizontal',
      bottom: 'bottom',
      data: Object.keys(visualizationData?.directionCounts || {})
    },
    series: [
      {
        name: 'Direction',
        type: 'pie',
        radius: '50%',
        data: Object.entries(visualizationData?.directionCounts || {}).map(([name, value]) => ({
          name,
          value
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

  const timelineChartOption = {
    title: {
      text: 'Events Timeline',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        label: {
          backgroundColor: '#6a7985'
        }
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: (visualizationData?.timelineData || []).map(item => item.date)
    },
    yAxis: {
      type: 'value',
      name: 'Events'
    },
    series: [
      {
        name: 'Detected Events',
        type: 'line',
        stack: 'Total',
        areaStyle: {},
        emphasis: {
          focus: 'series'
        },
        data: (visualizationData?.timelineData || []).map(item => item.count),
        itemStyle: {
          color: '#8884d8'
        }
      }
    ]
  };

  const connectionMapOption = {
    title: {
      text: 'Connection Map',
      left: 'center'
    },
    tooltip: {
      formatter: function(param) {
        return `${param.data.source} → ${param.data.target}: ${param.data.value} event(s)`;
      }
    },
    series: [
      {
        type: 'sankey',
        left: 50,
        right: 150,
        data: (visualizationData?.connectionCountries || []).map(name => ({
          name: name
        })),
        links: visualizationData?.connectionData || [],
        emphasis: {
          focus: 'adjacency'
        },
        lineStyle: {
          color: 'gradient',
          curveness: 0.5
        }
      }
    ]
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Threat Hunting
      </Typography>
      <Typography variant="body1" paragraph>
        This page displays security events and traffic patterns for threat analysis.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* View toggle buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Button 
            variant={view === 'dashboard' ? 'contained' : 'outlined'}
            startIcon={<DashboardIcon />}
            onClick={() => setView('dashboard')}
            sx={{ mr: 2 }}
          >
            Dashboard
          </Button>
          <Button 
            variant={view === 'events' ? 'contained' : 'outlined'}
            startIcon={<TableViewIcon />}
            onClick={() => setView('events')}
          >
            Events
          </Button>
        </Box>
        
        {/* Search and filter controls could go here */}
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Dashboard View */}
          {view === 'dashboard' && visualizationData && (
            <Paper sx={{ mb: 4, p: 2 }}>
              <Tabs 
                value={activeTab} 
                onChange={(e, newValue) => setActiveTab(newValue)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ mb: 2 }}
              >
                <Tab label="Overview" />
                <Tab label="Countries" />
                <Tab label="Services & Apps" />
                <Tab label="Timeline" />
                <Tab label="Connection Map" />
              </Tabs>
              
              {/* Overview Tab */}
              {activeTab === 0 && (
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <ReactECharts option={actionChartOption} style={{ height: '350px' }} />
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <ReactECharts option={directionChartOption} style={{ height: '350px' }} />
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              )}
              
              {/* Countries Tab */}
              {activeTab === 1 && (
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <ReactECharts option={srcCountryChartOption} style={{ height: '500px' }} />
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <ReactECharts option={dstCountryChartOption} style={{ height: '500px' }} />
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              )}
              
              {/* Services & Apps Tab */}
              {activeTab === 2 && (
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <ReactECharts option={serviceChartOption} style={{ height: '500px' }} />
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <ReactECharts option={appCategoryChartOption} style={{ height: '500px' }} />
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              )}
              
              {/* Timeline Tab */}
              {activeTab === 3 && (
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Card>
                      <CardContent>
                        <ReactECharts option={timelineChartOption} style={{ height: '400px' }} />
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              )}
              
              {/* Connection Map Tab */}
              {activeTab === 4 && (
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Card>
                      <CardContent>
                        <ReactECharts option={connectionMapOption} style={{ height: '600px' }} />
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              )}
            </Paper>
          )}

          {/* Events View (Table) */}
          {view === 'events' && (
            <>
              {logs.length === 0 ? (
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="h6">No threat events found</Typography>
                  <Typography variant="body2" color="textSecondary">
                    There are currently no threat events to display.
                  </Typography>
                </Paper>
              ) : (
                <>
                  <TableContainer component={Paper} sx={{ mb: 3 }}>
                    <Table sx={{ minWidth: 650 }} aria-label="threat events table">
                      <TableHead>
                        <TableRow>
                          <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Timestamp</TableCell>
                          <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Agent Name</TableCell>
                          <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Action</TableCell>
                          <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Source</TableCell>
                          <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Destination</TableCell>
                          <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Application</TableCell>
                          <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Message</TableCell>
                          <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {logs.map((log) => (
                          <TableRow key={log._id || log.id || Math.random().toString()} hover>
                            <TableCell>{formatTimestamp(log.timestamp)}</TableCell>
                            <TableCell>{log.agent?.name || 'Unknown'}</TableCell>
                            <TableCell>
                              <Chip 
                                label={log.traffic?.action || 'N/A'} 
                                color={getActionColor(log.traffic?.action)}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              {log.network?.srcIp !== 'N/A' ? log.network.srcIp : 'N/A'}
                              {log.traffic?.srcCountry !== 'N/A' && ` (${log.traffic.srcCountry})`}
                            </TableCell>
                            <TableCell>
                              {log.network?.destIp !== 'N/A' ? log.network.destIp : 'N/A'}
                              {log.traffic?.dstCountry !== 'N/A' && ` (${log.traffic.dstCountry})`}
                            </TableCell>
                            <TableCell>
                              {log.traffic?.app !== 'N/A' ? log.traffic.app : 'N/A'}
                              {log.traffic?.appcat !== 'N/A' && ` (${log.traffic.appcat})`}
                            </TableCell>
                            <TableCell>{log.traffic?.msg || 'N/A'}</TableCell>
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
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  
                  {/* Pagination for logs table */}
                  <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                    <Pagination 
                      count={totalPages} 
                      page={page} 
                      onChange={(event, value) => setPage(value)}
                      color="primary"
                    />
                  </Box>
                </>
              )}
            </>
          )}
          
          {/* Log Details Dialog */}
          <Dialog 
            open={selectedLog !== null} 
            onClose={() => setSelectedLog(null)}
            fullWidth
            maxWidth="md"
          >
            {selectedLog && (
              <>
                <DialogTitle>
                  Log Details
                  <IconButton
                    aria-label="close"
                    onClick={() => setSelectedLog(null)}
                    sx={{
                      position: 'absolute',
                      right: 8,
                      top: 8,
                      color: (theme) => theme.palette.grey[500],
                    }}
                  >
                    <CloseIcon />
                  </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Timestamp: {formatTimestamp(selectedLog.timestamp)}
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2">Agent Information</Typography>
                        <Typography>Name: {selectedLog.agent?.name || 'N/A'}</Typography>
                        <Typography>ID: {selectedLog.agent?.id || 'N/A'}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2">Action</Typography>
                        <Chip 
                          label={selectedLog.traffic?.action || 'N/A'} 
                          color={getActionColor(selectedLog.traffic?.action)}
                        />
                      </Grid>
                    </Grid>
                  </Box>
                  
                  {/* Structured Log View Component */}
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    Structured Log Data
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f9f9f9' }}>
                    <StructuredLogView log={selectedLog} />
                  </Paper>
                  
                  {/* Raw Log Section */}
                  <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                    Raw Log
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f9f9f9', overflowX: 'auto' }}>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {JSON.stringify(selectedLog.rawLog || selectedLog, null, 2)}
                    </pre>
                  </Paper>
                </DialogContent>
              </>
            )}
          </Dialog>
        </>
      )}
    </Box>
  );
};

export default ThreatHunting;