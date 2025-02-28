import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Container, 
  Grid, 
  Paper, 
  Typography, 
  CircularProgress, 
  Alert,
  //Card,
  //CardContent,
  //Divider,
  //Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
//import { useTheme } from '@mui/material/styles';
import ReactECharts from 'echarts-for-react';
import { parseLogMessage } from '../utils/normalizeLogs';
import { API_URL } from '../config';

const AdvancedAnalytics = () => {
  //const theme = useTheme();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('24h');
  const [protocolFilter, setProtocolFilter] = useState('all');

  // Summary counts
  const [summary, setSummary] = useState({
    notice: 0,    // Level 1-7
    warning: 0,   // Level 8-11
    critical: 0,  // Level 12-16
    total: 0
  });

  // Define fetchLogs outside of the component or with useCallback
const fetchLogs = useCallback(async () => {
  try {
    setLoading(true);
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token not found');
    }

    const response = await fetch(`${API_URL}/api/logs?timeRange=${timeRange}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();

    // Match the structure from LogDetails.js
    const logsArray = data.logs || [];
    
    // Check the structure of your response data
    //const parsedLogs = Array.isArray(data) ? data : (data.data || data.logs || []);
    
    // Parse log data using the normalizeLogs utility
    const parsedLogs = logsArray.map(log => parseLogMessage(log)).filter(log => log !== null);
    
    setLogs(parsedLogs);
    calculateSummary(parsedLogs);
    setError(null);
  } catch (error) {
    console.error('Error fetching logs:', error);
    setError(error.message);
  } finally {
    setLoading(false);
  }
}, [timeRange]); // Only depend on timeRange

useEffect(() => {
  fetchLogs();
  // Refresh data every 30 seconds
  const interval = setInterval(fetchLogs, 30000);
  return () => clearInterval(interval);
}, [fetchLogs]); // This is okay now because fetchLogs is memoized

  const calculateSummary = (logsData) => {
    const counts = {
      notice: 0,
      warning: 0,
      critical: 0,
      total: logsData.length
    };

    logsData.forEach(log => {
      const level = parseInt(log.rule?.level || 0);
      if (level >= 1 && level <= 7) counts.notice++;
      else if (level >= 8 && level <= 11) counts.warning++;
      else if (level >= 12 && level <= 16) counts.critical++;
    });

    setSummary(counts);
  };

  // Filter logs by selected protocol
  const filteredLogs = protocolFilter === 'all' 
    ? logs 
    : logs.filter(log => log.network?.protocol?.toLowerCase() === protocolFilter.toLowerCase());

  // Data for log levels over time chart
  const getLogLevelTimeData = () => {
    // Create time buckets (hourly)
    const timeData = {};
    const nowTime = new Date();
    const hours = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 24;
    
    // Initialize time buckets
    for (let i = hours - 1; i >= 0; i--) {
      const time = new Date(nowTime.getTime() - (i * 60 * 60 * 1000));
      const timeKey = time.toISOString().slice(0, 13); // Group by hour
      timeData[timeKey] = { notice: 0, warning: 0, critical: 0, time: time };
    }
    
    // Fill with actual data
    filteredLogs.forEach(log => {
      if (!log.timestamp) return;
      
      const logTime = new Date(log.timestamp);
      const timeKey = logTime.toISOString().slice(0, 13);
      if (!timeData[timeKey]) return;
      
      const level = parseInt(log.rule?.level || 0);
      if (level >= 1 && level <= 7) timeData[timeKey].notice++;
      else if (level >= 8 && level <= 11) timeData[timeKey].warning++;
      else if (level >= 12 && level <= 16) timeData[timeKey].critical++;
    });
    
    // Convert to array for chart
    return Object.values(timeData);
  };

  // Data for protocol distribution chart
  const getProtocolDistribution = () => {
    const protocols = {};
    
    filteredLogs.forEach(log => {
      if (!log.network?.protocol || log.network.protocol === 'N/A') return;
      
      const protocol = log.network.protocol;
      protocols[protocol] = (protocols[protocol] || 0) + 1;
    });
    
    // Convert to array and sort by count
    return Object.entries(protocols)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Top 8 protocols
  };

  // Data for top source IPs
  const getTopSourceIPs = () => {
    const sourceIPs = {};
    
    filteredLogs.forEach(log => {
      if (!log.network?.srcIp || log.network.srcIp === 'N/A') return;
      
      const ip = log.network.srcIp;
      sourceIPs[ip] = (sourceIPs[ip] || 0) + 1;
    });
    
    // Convert to array and sort by count
    return Object.entries(sourceIPs)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10 source IPs
  };

  // Data for level distribution chart
  const getLevelDistribution = () => {
    const levels = {};
    
    filteredLogs.forEach(log => {
      const level = log.rule?.level || 'unknown';
      levels[level] = (levels[level] || 0) + 1;
    });
    
    // Convert to array for chart
    return Object.entries(levels)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => {
        // Sort numerically by level
        const levelA = parseInt(a.name) || 0;
        const levelB = parseInt(b.name) || 0;
        return levelA - levelB;
      });
  };

  // Network traffic data
  // Modified getNetworkFlowData function to prevent cycles in Sankey diagram
const getNetworkFlowData = () => {
  const nodeMap = new Map(); // Track all unique nodes
  const linkMap = new Map(); // Track all unique links to prevent cycles
  const processedLinks = []; // Final links for the Sankey diagram
  
  // First pass: collect all unique IPs and categorize them
  filteredLogs.slice(0, 300).forEach(log => {
    if (!log.network?.srcIp || !log.network?.destIp) return;
    if (log.network.srcIp === 'N/A' || log.network.destIp === 'N/A') return;
    
    // Add source node if not exists
    if (!nodeMap.has(log.network.srcIp)) {
      nodeMap.set(log.network.srcIp, {
        name: log.network.srcIp,
        category: 'Source',
        itemStyle: { color: '#5470c6' },
        value: 1
      });
    } else {
      const node = nodeMap.get(log.network.srcIp);
      node.value++;
    }
    
    // Add target node if not exists
    if (!nodeMap.has(log.network.destIp)) {
      nodeMap.set(log.network.destIp, {
        name: log.network.destIp,
        category: 'Target',
        itemStyle: { color: '#91cc75' },
        value: 1
      });
    } else {
      const node = nodeMap.get(log.network.destIp);
      node.value++;
    }
    
    // Create a directional link key
    const linkKey = `${log.network.srcIp}->${log.network.destIp}`;
    
    // Add link if not exists
    if (!linkMap.has(linkKey)) {
      const level = parseInt(log.rule?.level || 0);
      
      // Determine color based on severity
      let linkColor;
      if (level >= 12) linkColor = '#f44336'; // Critical
      else if (level >= 8) linkColor = '#ffc107'; // Warning
      else linkColor = '#2196f3'; // Notice
      
      linkMap.set(linkKey, {
        source: log.network.srcIp,
        target: log.network.destIp,
        value: 1,
        lineStyle: { color: linkColor }
      });
    } else {
      // Increment link value
      linkMap.get(linkKey).value++;
    }
  });
  
  // Convert links to array and ensure they form a DAG (no cycles)
  const nodeDegrees = new Map(); // Track in-degree of each node
  
  // Initialize in-degree counts
  for (const node of nodeMap.keys()) {
    nodeDegrees.set(node, 0);
  }
  
  // Count in-degrees
  for (const link of linkMap.values()) {
    const targetNode = link.target;
    nodeDegrees.set(targetNode, (nodeDegrees.get(targetNode) || 0) + 1);
  }
  
  // Sort links to ensure DAG structure (sources should come before targets)
  Array.from(linkMap.values()).forEach(link => {
    // Only add links where target has higher in-degree than source
    // This ensures we maintain a directed flow
    if (nodeDegrees.get(link.target) >= nodeDegrees.get(link.source)) {
      processedLinks.push(link);
    }
  });
  
  // Create nodes array from the map
  const nodesArray = Array.from(nodeMap.values());
  
  return { nodes: nodesArray, links: processedLinks };
};

  // Rule description data
  const getRuleDescriptions = () => {
    const descriptions = {};
    
    filteredLogs.forEach(log => {
      if (!log.rule?.description || log.rule.description === 'No description') return;
      
      const desc = log.rule.description;
      descriptions[desc] = (descriptions[desc] || 0) + 1;
    });
    
    // Convert to array and sort by count
    return Object.entries(descriptions)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10 descriptions
  };

  // Chart options
  const levelTimeOptions = {
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
      data: getLogLevelTimeData().map(item => {
        const time = new Date(item.time);
        return time.getHours() + ':00';
      })
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
        data: getLogLevelTimeData().map(item => item.notice)
      },
      {
        name: 'Warning (8-11)',
        type: 'line',
        stack: 'Total',
        areaStyle: { opacity: 0.3 },
        emphasis: { focus: 'series' },
        color: '#ffc107',
        data: getLogLevelTimeData().map(item => item.warning)
      },
      {
        name: 'Critical (12-16)',
        type: 'line',
        stack: 'Total',
        areaStyle: { opacity: 0.3 },
        emphasis: { focus: 'series' },
        color: '#f44336',
        data: getLogLevelTimeData().map(item => item.critical)
      }
    ]
  };

  const protocolPieOptions = {
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
        data: getProtocolDistribution()
      }
    ]
  };

  const topSourceIPsOptions = {
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
      data: getTopSourceIPs().map(item => item.name),
      axisLabel: {
        formatter: function(value) {
          return value.length > 15 ? value.substring(0, 12) + '...' : value;
        }
      }
    },
    series: [
      {
        name: 'Count',
        type: 'bar',
        data: getTopSourceIPs().map(item => item.value),
        itemStyle: {
          color: function(params) {
            // Color gradient based on value
            const value = params.value;
            const maxValue = Math.max(...getTopSourceIPs().map(item => item.value));
            const ratio = value / maxValue;
            return {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 1,
              y2: 0,
              colorStops: [{
                offset: 0, color: '#2196f3'
              }, {
                offset: 1, color: ratio > 0.7 ? '#f44336' : '#2196f3'
              }]
            };
          }
        }
      }
    ]
  };

  const levelDistributionOptions = {
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
      data: getLevelDistribution().map(item => item.name)
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: 'Count',
        type: 'bar',
        data: getLevelDistribution().map(item => ({
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

  const networkFlowOptions = {
    title: {
      text: 'Network Traffic Flow',
      left: 'center'
    },
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c}'
    },
    series: [
      {
        type: 'sankey',
        nodeAlign: 'right', // Right alignment as per example
        data: getNetworkFlowData().nodes,
        links: getNetworkFlowData().links,
        emphasis: {
          focus: 'adjacency'
        },
        label: {
          position: 'right',
          formatter: '{b}'
        },
        lineStyle: {
          color: 'source',
          curveness: 0.5
        },
        levels: [
          {
            depth: 0,
            itemStyle: {
              color: '#5470c6'
            },
            lineStyle: {
              color: 'gradient',
              opacity: 0.6
            }
          },
          {
            depth: 1,
            itemStyle: {
              color: '#91cc75'
            },
            lineStyle: {
              color: 'gradient',
              opacity: 0.6
            }
          }
        ],
        layoutIterations: 64,
        orient: 'horizontal'
      }
    ]
  };

  const ruleDescriptionOptions = {
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
        data: getRuleDescriptions().map(item => ({
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

  const handleTimeRangeChange = (event) => {
    setTimeRange(event.target.value);
  };

  const handleProtocolFilterChange = (event) => {
    setProtocolFilter(event.target.value);
  };

  // Get distinct protocols for filter
  const getDistinctProtocols = () => {
    const protocols = new Set();
    logs.forEach(log => {
      if (log.network?.protocol && log.network.protocol !== 'N/A') {
        protocols.add(log.network.protocol);
      }
    });
    return Array.from(protocols).sort();
  };

  if (loading && logs.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" height="500px">
          <CircularProgress />
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
                {getDistinctProtocols().map(protocol => (
                  <MenuItem key={protocol} value={protocol}>{protocol}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Grid>
        
        <Grid item xs={12} md={4} sx={{ textAlign: 'right' }}>
          <Typography variant="body2" color="textSecondary">
            {logs.length > 0 
              ? `Showing ${filteredLogs.length} logs from ${logs.length} total` 
              : 'No logs available'}
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
            <Typography variant="h4" color="success.main">
              {summary.notice}
            </Typography>
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
            <Typography variant="h4" color="warning.main">
              {summary.warning}
            </Typography>
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
            <Typography variant="h4" color="error.main">
              {summary.critical}
            </Typography>
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
            <Typography variant="h4" color="primary.main">
              {summary.total}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              All Severity Levels
            </Typography>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Charts */}
      <Grid container spacing={3}>
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 2, height: '400px' }}>
            <ReactECharts 
              option={levelTimeOptions} 
              style={{ height: '100%', width: '100%' }}
              opts={{ renderer: 'canvas' }}
            />
          </Paper>
        </Grid>
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 2, height: '400px' }}>
            <ReactECharts 
              option={networkFlowOptions} 
              style={{ height: '100%', width: '100%' }}
              opts={{ renderer: 'canvas' }}
            />
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '400px' }}>
            <ReactECharts 
              option={levelDistributionOptions} 
              style={{ height: '100%', width: '100%' }}
              opts={{ renderer: 'canvas' }}
            />
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '400px' }}>
            <ReactECharts 
              option={protocolPieOptions} 
              style={{ height: '100%', width: '100%' }}
              opts={{ renderer: 'canvas' }}
            />
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '400px' }}>
            <ReactECharts 
              option={topSourceIPsOptions} 
              style={{ height: '100%', width: '100%' }}
              opts={{ renderer: 'canvas' }}
            />
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '400px' }}>
            <ReactECharts 
              option={ruleDescriptionOptions} 
              style={{ height: '100%', width: '100%' }}
              opts={{ renderer: 'canvas' }}
            />
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default AdvancedAnalytics;