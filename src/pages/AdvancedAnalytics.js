import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Alert,
  CircularProgress
} from '@mui/material';
import ReactECharts from 'echarts-for-react';

const AdvancedAnalytics = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/logs', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const data = await response.json();
        setLogs(data.logsWithGeolocation || []);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  // Static data for the pie chart (Public Host, Private Host, Users, Applications)
  const pieChartData = [
    { name: 'Public Host', value: 40 },
    { name: 'Private Host', value: 30 },
    { name: 'Users', value: 20 },
    { name: 'Applications', value: 10 },
  ];

  // ECharts options for the pie chart (Public Host, Private Host, Users, Applications)
  const pieChartOptions = {
    tooltip: {
      trigger: 'item',
    },
    legend: {
      bottom: '10%',
      left: 'center',
    },
    series: [
      {
        name: 'Distribution',
        type: 'pie',
        radius: '50%',
        data: pieChartData,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    ],
  };

  // Static data for the pie chart (Critical and Major alerts only)
  const criticalMajorData = [
    { name: 'Critical', value: 15 }, // Static value
    { name: 'Major', value: 25 },   // Static value
  ];

  // ECharts options for the pie chart (Critical and Major alerts)
  const criticalMajorPieChartOptions = {
    tooltip: {
      trigger: 'item',
    },
    legend: {
      bottom: '10%',
      left: 'center',
    },
    series: [
      {
        name: 'Alerts',
        type: 'pie',
        radius: '50%',
        data: criticalMajorData,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    ],
  };

  // Static data for the half-donut chart (Critical, Major, Minor, and Alerts)
  const halfDonutData = [
    { name: 'Critical', value: 15 }, // Static value
    { name: 'Major', value: 25 },   // Static value
    { name: 'Minor', value: 10 },   // Static value
    { name: 'Alerts', value: 50 },  // Static value
  ];

  // ECharts options for the half-donut chart
  const halfDonutOptions = {
    tooltip: {
      trigger: 'item',
    },
    legend: {
      bottom: '10%',
      left: 'center',
    },
    series: [
      {
        name: 'Alerts',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['50%', '60%'],
        startAngle: 180,
        endAngle: 0,
        data: halfDonutData,
        itemStyle: {
          borderRadius: 5,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: false,
        },
        emphasis: {
          label: {
            show: true,
            fontSize: '16',
            fontWeight: 'bold',
          },
        },
      },
    ],
  };

  // Process logs for bar chart (log count per severity level)
  const severityDistribution = logs.reduce((acc, log) => {
    const severity = log.level || 'unknown';
    acc[severity] = (acc[severity] || 0) + 1;
    return acc;
  }, {});

  const barChartData = Object.entries(severityDistribution).map(([name, value]) => ({
    name,
    value,
  }));

  const barChartOptions = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
    },
    xAxis: {
      type: 'category',
      data: barChartData.map((item) => item.name),
    },
    yAxis: {
      type: 'value',
      name: 'Log Count',
    },
    series: [
      {
        data: barChartData.map((item) => item.value),
        type: 'bar',
        itemStyle: {
          color: '#5470C6',
        },
      },
    ],
  };

  // Process logs for time distribution (log count per hour)
  const timeDistribution = logs.reduce((acc, log) => {
    const hour = new Date(log.timestamp).getHours();
    const timeKey = `${hour}:00`;
    acc[timeKey] = (acc[timeKey] || 0) + 1;
    return acc;
  }, {});

  const timeChartData = Object.entries(timeDistribution).sort((a, b) => a[0].localeCompare(b[0]));

  const timeChartOptions = {
    tooltip: {
      trigger: 'axis',
    },
    xAxis: {
      type: 'category',
      data: timeChartData.map((item) => item[0]),
    },
    yAxis: {
      type: 'value',
      name: 'Log Count',
    },
    series: [
      {
        data: timeChartData.map((item) => item[1]),
        type: 'line',
        smooth: true,
        lineStyle: {
          color: '#91CC75',
        },
      },
    ],
  };

  // Static data for the stacked line chart
  const stackedLineChartData = {
    categories: [
      'Potential Web Exploit',
      'Potential Data Exfiltration',
      'Insider/Compromised Credential Threat',
      'Potential Ransomware Botnet Detected',
      'Potential Malware Infected Host',
      'Policy Violation',
      'UDA Host Login Failure',
      'UDA Trojan Horse Traffic',
      'Password Spraying',
    ],
    timeIntervals: Array.from({ length: 24 }, (_, i) => {
      const now = new Date();
      const time = new Date(now - (24 - i) * 60 * 60 * 1000);
      return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }),
    values: [
      [10, 20, 30, 40, 50, 60, 70, 80, 90], // Hour 1
      [15, 25, 35, 45, 55, 65, 75, 85, 95], // Hour 2
      [20, 30, 40, 50, 60, 70, 80, 90, 100], // Hour 3
      // Add more static data for each hour...
    ],
  };

  // ECharts options for the stacked line chart
  const stackedLineChartOptions = {
    tooltip: {
      trigger: 'axis',
    },
    legend: {
      data: stackedLineChartData.categories,
      bottom: '10%',
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: stackedLineChartData.timeIntervals,
    },
    yAxis: {
      type: 'value',
    },
    series: stackedLineChartData.categories.map((category, index) => ({
      name: category,
      type: 'line',
      stack: 'total',
      data: stackedLineChartData.values.map((hourValues) => hourValues[index]),
    })),
  };

  return (
    <Box p={4}>
      <Typography variant="h4" gutterBottom>Advanced Analytics</Typography>
      
      <TextField
        fullWidth
        margin="normal"
        label="Search Logs"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      {/* First Row: Distribution of Terms, Log Severity Distribution, Log Time Distribution */}
      <Box display="flex" gap={4} my={4} flexWrap="wrap">
        {/* Pie Chart for Public Host, Private Host, Users, Applications */}
        <Card sx={{ flex: 1, minWidth: '300px' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Distribution of Terms</Typography>
            <ReactECharts
              option={pieChartOptions}
              style={{ height: '400px', width: '100%' }}
            />
          </CardContent>
        </Card>

        {/* Bar Chart for Severity Distribution */}
        <Card sx={{ flex: 1, minWidth: '300px' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Log Severity Distribution</Typography>
            <ReactECharts
              option={barChartOptions}
              style={{ height: '400px', width: '100%' }}
            />
          </CardContent>
        </Card>

        {/* Time Distribution Chart */}
        <Card sx={{ flex: 1, minWidth: '300px' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Log Time Distribution</Typography>
            <ReactECharts
              option={timeChartOptions}
              style={{ height: '400px', width: '100%' }}
            />
          </CardContent>
        </Card>
      </Box>

      {/* Second Row: Critical & Major Alerts, Alerts Distribution */}
      <Box display="flex" gap={4} my={4} flexWrap="wrap">
        {/* Pie Chart for Critical and Major Alerts */}
        <Card sx={{ flex: 1, minWidth: '300px' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Critical & Major Alerts</Typography>
            <ReactECharts
              option={criticalMajorPieChartOptions}
              style={{ height: '400px', width: '100%' }}
            />
          </CardContent>
        </Card>

        {/* Half-Donut Chart for Critical, Major, Minor, and Alerts */}
        <Card sx={{ flex: 1, minWidth: '300px' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Alerts Distribution</Typography>
            <ReactECharts
              option={halfDonutOptions}
              style={{ height: '400px', width: '100%' }}
            />
          </CardContent>
        </Card>
      </Box>

      {/* Stacked Line Chart */}
      <Box my={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Threat Trends Over Time</Typography>
            <ReactECharts
              option={stackedLineChartOptions}
              style={{ height: '400px', width: '100%' }}
            />
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default AdvancedAnalytics;