import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, Paper, CircularProgress, Link, Dialog, DialogTitle, DialogContent, IconButton, Chip, Grid, Tab, Tabs, Skeleton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
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
import { DataGrid } from '@mui/x-data-grid';
import FullscreenIcon from '@mui/icons-material/Fullscreen';

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
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const theme = useTheme();
  const [fullscreenChart, setFullscreenChart] = useState(null);
  const [fullscreenTitle, setFullscreenTitle] = useState('');

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

  const openFullscreenChart = (option, title) => {
    setFullscreenChart(option);
    setFullscreenTitle(title);
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
      // First try to get techniques from parsed rule.mitre
      let techniques = [];

      // Check all possible paths where technique data might be stored
      if (log.rule?.mitre?.technique) {
        techniques = Array.isArray(log.rule.mitre.technique)
          ? log.rule.mitre.technique
          : [log.rule.mitre.technique];
      } else if (log.rawLog?.message?.rule?.mitre?.technique) {
        techniques = Array.isArray(log.rawLog.message.rule.mitre.technique)
          ? log.rawLog.message.rule.mitre.technique
          : [log.rawLog.message.rule.mitre.technique];
      } else if (typeof log.rawLog?.message === 'string') {
        try {
          const parsedMessage = JSON.parse(log.rawLog.message);
          if (parsedMessage?.rule?.mitre?.technique) {
            techniques = Array.isArray(parsedMessage.rule.mitre.technique)
              ? parsedMessage.rule.mitre.technique
              : [parsedMessage.rule.mitre.technique];
          }
        } catch (e) {
          // Silently fail if parsing fails
        }
      }

      // Process found techniques
      techniques.forEach(tech => {
        if (tech) {
          // Extract just the technique name without ID
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
      // First try to get tactics from parsed rule.mitre
      let tactics = [];

      // Check all possible paths where tactic data might be stored
      if (log.rule?.mitre?.tactic) {
        tactics = Array.isArray(log.rule.mitre.tactic)
          ? log.rule.mitre.tactic
          : [log.rule.mitre.tactic];
      } else if (log.rawLog?.message?.rule?.mitre?.tactic) {
        tactics = Array.isArray(log.rawLog.message.rule.mitre.tactic)
          ? log.rawLog.message.rule.mitre.tactic
          : [log.rawLog.message.rule.mitre.tactic];
      } else if (typeof log.rawLog?.message === 'string') {
        try {
          const parsedMessage = JSON.parse(log.rawLog.message);
          if (parsedMessage?.rule?.mitre?.tactic) {
            tactics = Array.isArray(parsedMessage.rule.mitre.tactic)
              ? parsedMessage.rule.mitre.tactic
              : [parsedMessage.rule.mitre.tactic];
          }
        } catch (e) {
          // Silently fail if parsing fails
        }
      }

      // Process found tactics
      tactics.forEach(tactic => {
        if (tactic) {
          // Extract just the tactic name without ID
          const cleanTactic = tactic.split('(')[0].trim();
          acc[cleanTactic] = (acc[cleanTactic] || 0) + 1;
        }
      });
      return acc;
    }, {});

    // Enhanced MITRE IDs extraction
    const mitreIds = logs.reduce((acc, log) => {
      // First try to get IDs from parsed rule.mitre
      let ids = [];

      // Check all possible paths where ID data might be stored
      if (log.rule?.mitre?.id) {
        ids = Array.isArray(log.rule.mitre.id)
          ? log.rule.mitre.id
          : [log.rule.mitre.id];
      } else if (log.rawLog?.message?.rule?.mitre?.id) {
        ids = Array.isArray(log.rawLog.message.rule.mitre.id)
          ? log.rawLog.message.rule.mitre.id
          : [log.rawLog.message.rule.mitre.id];
      } else if (typeof log.rawLog?.message === 'string') {
        try {
          const parsedMessage = JSON.parse(log.rawLog.message);
          if (parsedMessage?.rule?.mitre?.id) {
            ids = Array.isArray(parsedMessage.rule.mitre.id)
              ? parsedMessage.rule.mitre.id
              : [parsedMessage.rule.mitre.id];
          }
        } catch (e) {
          // Silently fail if parsing fails
        }
      }

      // Process found IDs
      ids.forEach(id => {
        if (id) {
          // Make sure we have a clean ID format
          const cleanId = id.trim();
          acc[cleanId] = (acc[cleanId] || 0) + 1;
        }
      });
      return acc;
    }, {});

    // Enhanced Rule Groups extraction
    const ruleGroups = logs.reduce((acc, log) => {
      // First try to get groups from parsed rule
      let groups = [];

      // Check all possible paths where group data might be stored
      if (log.rule?.groups) {
        groups = Array.isArray(log.rule.groups)
          ? log.rule.groups
          : [log.rule.groups];
      } else if (log.rawLog?.message?.rule?.groups) {
        groups = Array.isArray(log.rawLog.message.rule.groups)
          ? log.rawLog.message.rule.groups
          : [log.rawLog.message.rule.groups];
      } else if (typeof log.rawLog?.message === 'string') {
        try {
          const parsedMessage = JSON.parse(log.rawLog.message);
          if (parsedMessage?.rule?.groups) {
            groups = Array.isArray(parsedMessage.rule.groups)
              ? parsedMessage.rule.groups
              : [parsedMessage.rule.groups];
          }
        } catch (e) {
          // Silently fail if parsing fails
        }
      }

      // Process found groups
      groups.forEach(group => {
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
      mitreIds,
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

  // MITRE IDs chart option
  const getMitreIdsChartOption = () => {
    // Use horizontal bar chart for IDs
    const sortedIds = Object.entries(visualizationData.mitreIds || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const categories = sortedIds.map(([name]) => name);
    const values = sortedIds.map(([_, value]) => value);

    return {
      title: {
        text: 'MITRE ATT&CK IDs',
        left: 'center',
        textStyle: {
          color: theme.palette.mode === 'dark' ? '#fff' : '#000'
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        formatter: function (params) {
          const dataIndex = params[0].dataIndex;
          const id = categories[dataIndex];
          const value = values[dataIndex];
          return `<strong>${id}</strong>: ${value} occurrences`;
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
                  onClick={() => openFullscreenChart(getTimelineChartOption(visualizationData.timelineData || {}), 'Timeline Chart')}
                  sx={{ position: 'absolute', top: 5, right: 5, bgcolor: 'rgba(255,255,255,0.7)' }}
                  size="small"
                >
                  <FullscreenIcon />
                </IconButton>
              </Box>
            )}
          </Grid>

          {/* Rule Level Distribution - Changed to horizontal bar */}
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

          {/* MITRE Tactics */}
          <Grid item xs={12} md={6}>
            {loading ? (
              <Skeleton variant="rectangular" height={300} />
            ) : (
              <Box position="relative">
                <ReactECharts
                  option={getMitreTacticsChartOption()}
                  style={{ height: 350 }}
                  opts={{ renderer: 'canvas' }}
                  theme={theme.palette.mode === 'dark' ? 'dark' : ''}
                />
                <IconButton
                  onClick={() => openFullscreenChart(getMitreTacticsChartOption(), 'MITRE ATT&CK Tactics')}
                  sx={{ position: 'absolute', top: 5, right: 5, bgcolor: 'rgba(255,255,255,0.7)' }}
                  size="small"
                >
                  <FullscreenIcon />
                </IconButton>
              </Box>
            )}
          </Grid>

          {/* MITRE Techniques */}
          <Grid item xs={12} md={6}>
            {loading ? (
              <Skeleton variant="rectangular" height={300} />
            ) : (
              <Box position="relative">
                <ReactECharts
                  option={getMitreTechniquesChartOption()}
                  style={{ height: 350 }}
                  opts={{ renderer: 'canvas' }}
                  theme={theme.palette.mode === 'dark' ? 'dark' : ''}
                />
                <IconButton
                  onClick={() => openFullscreenChart(getMitreTechniquesChartOption(), 'MITRE ATT&CK Techniques')}
                  sx={{ position: 'absolute', top: 5, right: 5, bgcolor: 'rgba(255,255,255,0.7)' }}
                  size="small"
                >
                  <FullscreenIcon />
                </IconButton>
              </Box>
            )}
          </Grid>
          {/* MITRE IDs */}
          <Grid item xs={12} md={6}>
            {loading ? (
              <Skeleton variant="rectangular" height={300} />
            ) : (
              <Box position="relative">
                <ReactECharts
                  option={getMitreIdsChartOption()}
                  style={{ height: 350 }}
                  opts={{ renderer: 'canvas' }}
                  theme={theme.palette.mode === 'dark' ? 'dark' : ''}
                />
                <IconButton
                  onClick={() => openFullscreenChart(getMitreIdsChartOption(), 'MITRE ATT&CK IDs')}
                  sx={{ position: 'absolute', top: 5, right: 5, bgcolor: 'rgba(255,255,255,0.7)' }}
                  size="small"
                >
                  <FullscreenIcon />
                </IconButton>
              </Box>
            )}
          </Grid>
          {/* Rule Groups */}
          <Grid item xs={12} md={6}>
            {loading ? (
              <Skeleton variant="rectangular" height={300} />
            ) : (
              <Box position="relative">
                <ReactECharts
                  option={getRuleGroupsChartOption()}
                  style={{ height: 350 }}
                  opts={{ renderer: 'canvas' }}
                  theme={theme.palette.mode === 'dark' ? 'dark' : ''}
                />
                <IconButton
                  onClick={() => openFullscreenChart(getRuleGroupsChartOption(), 'Rule Groups Distribution')}
                  sx={{ position: 'absolute', top: 5, right: 5, bgcolor: 'rgba(255,255,255,0.7)' }}
                  size="small"
                >
                  <FullscreenIcon />
                </IconButton>
              </Box>
            )}
          </Grid>
        </Grid>
      )}

      {/* Rest of the component remains the same as in the previous implementation */}
      {/* (Include the Events Tab and Log Details Dialog) */}
      {activeTab === 1 && (
        <Paper elevation={2} sx={{ mb: 3 }}>
          <Box sx={{
            height: 650,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* DataGrid code here */}
            <DataGrid
              rows={logs.map((log, index) => {
                const parsedLog = parseLogMessage(log);
                return {
                  id: index,
                  timestamp: parsedLog.timestamp,
                  agentName: parsedLog.agent.name,
                  ruleLevel: parsedLog.rule.level,
                  description: parsedLog.rule.description,
                  fullLog: parsedLog
                };
              })}
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

export default MajorLogs;