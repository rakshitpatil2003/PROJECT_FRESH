import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,Typography,Table,TableBody,TableCell,TableContainer,TableHead,TableRow,Paper,Alert,TextField,InputAdornment,CircularProgress,Link,Dialog,DialogTitle,DialogContent,IconButton,Chip,Grid,Tab,Tabs,TablePagination,Skeleton
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import CloseIcon from '@mui/icons-material/Close';
import WarningIcon from '@mui/icons-material/Warning';
import axios from 'axios';
import { parseLogMessage } from '../utils/normalizeLogs';
import { StructuredLogView } from '../utils/normalizeLogs';
import { API_URL } from '../config';
import { useTheme } from '@mui/material/styles';

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

const MajorLogs = () => {
  const [logs, setLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const theme = useTheme();

  const fetchMajorLogs = useCallback(async (search) => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await axios.get(
        `${API_URL}/api/logs/major${search ? `?search=${encodeURIComponent(search)}` : ''}`,
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

      // Enhanced validation to ensure we catch all logs >= 12
      const validLogs = response.data.filter(log => {
        const ruleLevel = parseInt(log.rule?.level);
        return !isNaN(ruleLevel) && ruleLevel >= 12;
      });

      // Sort by timestamp in DESCENDING order (latest first)
      const sortedLogs = validLogs.sort((a, b) =>
        new Date(b.timestamp) - new Date(a.timestamp)
      );

      setLogs(sortedLogs);

    } catch (error) {
      console.error('Error fetching major logs:', error);
      setError(error.response?.data?.message || error.message || 'Failed to fetch major logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const getRuleLevelSeverity = (level) => {
    const numLevel = parseInt(level);
    if (numLevel >= 15) return 'Critical';
    if (numLevel >= 13) return 'High';
    if (numLevel >= 12) return 'Major';
    return 'Normal';
  };

  // Memoized data processing for visualizations
  const visualizationData = useMemo(() => {
    if (!logs.length) return {};

    // Timeline Data - sorted in ascending order (oldest first)
    const timelineData = logs.reduce((acc, log) => {
      const date = new Date(log.timestamp).toLocaleDateString();
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

    // Agent Distribution with Top 10
    const agentDistribution = logs.reduce((acc, log) => {
      const agent = log.agent?.name || 'Unknown';
      acc[agent] = (acc[agent] || 0) + 1;
      return acc;
    }, {});

    // Rule Level Distribution
    const ruleLevelDistribution = logs.reduce((acc, log) => {
      const level = log.rule?.level?.toString() || 'Unknown';
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {});

    // Enhanced MITRE Techniques extraction
const mitreTechniques = logs.reduce((acc, log) => {
  // Try multiple approaches to get MITRE technique data
  let mitre = log.rule?.mitre || {};
  if (!mitre.technique && log.rawLog?.message?.rule?.mitre) {
    mitre = log.rawLog.message.rule.mitre;
  }
  
  let techniques = [];
  // Handle both array and string cases
  if (Array.isArray(mitre.technique)) {
    techniques = mitre.technique;
  } else if (mitre.technique) {
    techniques = [mitre.technique];
  }
  
  techniques.forEach(tech => {
    if (tech) {
      const cleanTech = tech.split('(')[0].trim();
      acc[cleanTech] = (acc[cleanTech] || 0) + 1;
    }
  });
  return acc;
}, {});


    // Severity Distribution
    const severityDistribution = logs.reduce((acc, log) => {
      const severity = getRuleLevelSeverity(log.rule?.level);
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    }, {});

    // Enhanced MITRE Tactics extraction
const mitreTactics = logs.reduce((acc, log) => {
  // Try multiple approaches to get MITRE tactic data
  let mitre = log.rule?.mitre || {};
  if (!mitre.tactic && log.rawLog?.message?.rule?.mitre) {
    mitre = log.rawLog.message.rule.mitre;
  }
  
  let tactics = [];
  // Handle both array and string cases
  if (Array.isArray(mitre.tactic)) {
    tactics = mitre.tactic;
  } else if (mitre.tactic) {
    tactics = [mitre.tactic];
  }
  
  tactics.forEach(tactic => {
    if (tactic) {
      const cleanTactic = tactic.split('(')[0].trim();
      acc[cleanTactic] = (acc[cleanTactic] || 0) + 1;
    }
  });
  return acc;
}, {});



    // Enhanced Rule Groups extraction
const ruleGroups = logs.reduce((acc, log) => {
  // Try multiple approaches to get rule groups data
  let groups = log.rule?.groups || [];
  if ((!groups || groups.length === 0) && log.rawLog?.message?.rule?.groups) {
    groups = log.rawLog.message.rule.groups;
  }
  
  let groupArray = [];
  // Handle both array and string cases
  if (Array.isArray(groups)) {
    groupArray = groups;
  } else if (groups) {
    groupArray = [groups];
  }
  
  groupArray.forEach(group => {
    if (group) {
      acc[group] = (acc[group] || 0) + 1;
    }
  });
  return acc;
}, {});

    return {
      timelineData: orderedTimelineData, // Now ordered oldest to newest
      agentDistribution,
      ruleLevelDistribution,
      mitreTechniques,
      mitreTactics,
      ruleGroups,
      severityDistribution,
      totalLogs: logs.length
    };
  }, [logs]);

  // Update the getTimelineChartOption to ensure proper ordering
  const getTimelineChartOption = (data) => {
    const dates = Object.keys(data);
    const values = Object.values(data);

    return {
      title: {
        text: 'Alert Timeline',
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

  // MITRE Tactics chart option
const getMitreTacticsChartOption = () => {
  const tacticsData = Object.entries(visualizationData.mitreTactics || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, value], index) => ({
      name,
      value,
      itemStyle: { color: COLOR_PALETTE[index % COLOR_PALETTE.length] }
    }));

  return {
    title: {
      text: 'MITRE ATT&CK Tactics',
      left: 'center',
      textStyle: {
        color: theme.palette.mode === 'dark' ? '#fff' : '#000'
      }
    },
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 10 },
      data: tacticsData,
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      },
      label: {
        formatter: '{b}: {c} ({d}%)'
      }
    }],
    backgroundColor: theme.palette.mode === 'dark' ? '#353536' : '#fff'
  };
};

// MITRE Techniques chart option
const getMitreTechniquesChartOption = () => {
  // Use horizontal bar chart for techniques as they can have longer names
  const sortedTechniques = Object.entries(visualizationData.mitreTechniques || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const categories = sortedTechniques.map(([name]) => name);
  const values = sortedTechniques.map(([_, value]) => value);

  return {
    title: {
      text: 'MITRE ATT&CK Techniques',
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
      name: 'Occurrences',
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

// Rule Groups chart option
const getRuleGroupsChartOption = () => {
  const groupsData = Object.entries(visualizationData.ruleGroups || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, value], index) => ({
      name,
      value,
      itemStyle: { color: COLOR_PALETTE[index % COLOR_PALETTE.length] }
    }));

  return {
    title: {
      text: 'Rule Groups Distribution',
      left: 'center',
      textStyle: {
        color: theme.palette.mode === 'dark' ? '#fff' : '#000'
      }
    },
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 10 },
      data: groupsData,
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      },
      label: {
        formatter: '{b}: {c} ({d}%)'
      }
    }],
    backgroundColor: theme.palette.mode === 'dark' ? '#353536' : '#fff'
  };
};

  const getMitreChartOption = (data, title) => {
    const entries = Object.entries(data)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    return {
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
        radius: ['40%', '70%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 10 },
        data: entries.map(([name, value], index) => ({
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
        },
        label: {
          formatter: '{b}: {c} ({d}%)'
        }
      }],
      backgroundColor: theme.palette.mode === 'dark' ? '#353536' : '#fff'
    };
  };

  // Add this new function for horizontal bar chart with labels
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

  // Rest of the component remains the same as in the previous implementation...
  // (Include all the previous methods like getRuleLevelColor, formatTimestamp, etc.)
  const getRuleLevelColor = (level) => {
    const numLevel = parseInt(level);
    if (numLevel >= 15) return '#d32f2f'; // Red
    if (numLevel >= 13) return '#f57c00'; // Orange
    if (numLevel >= 12) return '#ed6c02'; // Light Orange
    return '#1976d2'; // Blue (default)
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
    const debounceTimer = setTimeout(() => {
      fetchMajorLogs(searchTerm);
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, fetchMajorLogs]);

  if (loading && !logs.length) {
    return (
      <Box
        p={4}
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="50vh"
      >
        <CircularProgress size={40} />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading major logs...
        </Typography>
      </Box>
    );
  }

  // Render method starts here...
  return (
    <Box p={4}>
      <Typography variant="h4" gutterBottom sx={{ color: '#d32f2f', mb: 3 }}>
        Major Logs Analysis
        <Typography variant="subtitle1" sx={{ color: 'text.secondary', mt: 1 }}>
          Showing logs with rule level ≥ 12
        </Typography>
      </Typography>

      <Tabs
        value={activeTab}
        onChange={(e, newValue) => setActiveTab(newValue)}
        sx={{ mb: 3 }}
      >
        <Tab label="Dashboard" />
        <Tab label="Events" />
      </Tabs>

      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* Timeline Chart - now shows oldest on left, newest on right */}
          <Grid item xs={12} md={6}>
            {loading ? (
              <Skeleton variant="rectangular" height={300} />
            ) : (
              <ReactECharts
                option={getTimelineChartOption(visualizationData.timelineData || {})}
                style={{ height: 300 }}
              />
            )}
          </Grid>

          {/* Rule Level Distribution - Changed to horizontal bar */}
          <Grid item xs={12} md={6}>
            {loading ? (
              <Skeleton variant="rectangular" height={300} />
            ) : (
              <ReactECharts
                option={getHorizontalBarChartOption(visualizationData.ruleLevelDistribution || {}, 'Rule Level Distribution')}
                style={{ height: 300 }}
              />
            )}
          </Grid>

          {/* Agent Distribution */}
          <Grid item xs={12} md={6}>
            {loading ? (
              <Skeleton variant="rectangular" height={300} />
            ) : (
              <ReactECharts
                option={getBarChartOption(visualizationData.agentDistribution || {}, 'Agent Distribution')}
                style={{ height: 300 }}
              />
            )}
          </Grid>

          {/* Severity Distribution */}
          <Grid item xs={12} md={6}>
            {loading ? (
              <Skeleton variant="rectangular" height={300} />
            ) : (
              <ReactECharts
                option={getPieChartOption(visualizationData.severityDistribution || {}, 'Severity Distribution')}
                style={{ height: 300 }}
              />
            )}
          </Grid>

          {/* MITRE Tactics */}
          <Grid item xs={12} md={6}>
            {loading ? (
              <Skeleton variant="rectangular" height={300} />
            ) : (
              <ReactECharts
                  option={getMitreTacticsChartOption()}
                  style={{ height: '100%', width: '100%' }}
                  theme={theme.palette.mode === 'dark' ? 'dark' : ''}
              />
            )}
          </Grid>

          {/* MITRE Techniques */}
          <Grid item xs={12} md={6}>
            {loading ? (
              <Skeleton variant="rectangular" height={300} />
            ) : (
              <ReactECharts
                option={getMitreTechniquesChartOption()}
                style={{ height: '100%', width: '100%' }}
                theme={theme.palette.mode === 'dark' ? 'dark' : ''}
              />
            )}
          </Grid>




          {/* Rule Groups */}
          <Grid item xs={12} md={6}>
            {loading ? (
              <Skeleton variant="rectangular" height={300} />
            ) : (
              <ReactECharts
                option={getRuleGroupsChartOption()}
                style={{ height: '100%', width: '100%' }}
                theme={theme.palette.mode === 'dark' ? 'dark' : ''}
              />
            )}
          </Grid>
        </Grid>
      )}

      {/* Rest of the component remains the same as in the previous implementation */}
      {/* (Include the Events Tab and Log Details Dialog) */}
      {activeTab === 1 && (
        <Box>
          <TextField
            fullWidth
            margin="normal"
            variant="outlined"
            placeholder="Search by agent name, description, rule level..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 3 }}
          />

          <Alert
            severity={logs.length > 0 ? "warning" : "info"}
            sx={{ mb: 3 }}
            icon={logs.length > 0 ? <WarningIcon /> : undefined}
          >
            {logs.length > 0
              ? `Found ${logs.length} major security logs that require attention`
              : 'No major logs found for the specified criteria'}
          </Alert>

          <TableContainer component={Paper} sx={{ maxHeight: 'calc(100vh - 300px)' }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>Agent Name</TableCell>
                  <TableCell>Rule Level</TableCell>
                  <TableCell>Severity</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((log) => {
                    const parsedLog = parseLogMessage(log);
                    return (
                      <TableRow key={parsedLog.timestamp}>
                        <TableCell>{formatTimestamp(parsedLog.timestamp)}</TableCell>
                        <TableCell>{parsedLog.agent.name}</TableCell>
                        <TableCell>
                          <Typography sx={{ color: getRuleLevelColor(parsedLog.rule.level), fontWeight: 'bold' }}>
                            {parsedLog.rule.level}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getRuleLevelSeverity(parsedLog.rule.level)}
                            sx={{
                              backgroundColor: getRuleLevelColor(parsedLog.rule.level),
                              color: 'white',
                              fontWeight: 'bold'
                            }}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{parsedLog.rule.description}</TableCell>
                        <TableCell>
                          <Link
                            component="button"
                            onClick={() => setSelectedLog(parsedLog)}
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
          <TablePagination
            rowsPerPageOptions={[10, 25, 50]}
            component="div"
            count={logs.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(e, newPage) => setPage(newPage)}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
          />
        </Box>
      )}

      {/* Log Details Dialog */}
      <Dialog
        open={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{
          backgroundColor: '#ffebee',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Typography variant="h6">Major Log Details</Typography>
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
    </Box>
  );
};

export default MajorLogs;