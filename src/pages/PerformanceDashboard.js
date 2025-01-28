import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';
import ReactECharts from 'echarts-for-react';

const PerformanceDashboard = () => {
  // Static data for the custom pie chart
  const pieChartData = [
    { name: 'Event Analyzed', value: 40, color: '#4CAF50' }, // Green
    { name: 'Detection', value: 30, color: '#2196F3' },     // Blue
    { name: 'Alerts', value: 30, color: '#F44336' },        // Red
  ];

  // ECharts options for the custom pie chart
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
        name: 'Performance',
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
        itemStyle: {
          color: (params) => pieChartData[params.dataIndex].color,
        },
      },
    ],
  };

  return (
    <Box p={4}>
      <Typography variant="h4" gutterBottom>Performance Dashboard</Typography>
      
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Event Analysis</Typography>
          <ReactECharts
            option={pieChartOptions}
            style={{ height: '400px', width: '100%' }}
          />
        </CardContent>
      </Card>
    </Box>
  );
};

export default PerformanceDashboard;