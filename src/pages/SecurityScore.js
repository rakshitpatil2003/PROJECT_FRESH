import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';
import ReactECharts from 'echarts-for-react';

const SecurityScore = () => {
  // Static score value
  const score = 74; // Example score (can be dynamic later)

  // ECharts options for the graded gauge chart
  const gaugeChartOptions = {
    tooltip: {
      formatter: '{a} <br/>{b} : {c}%',
    },
    series: [
      {
        name: 'Security Score',
        type: 'gauge',
        min: 0,
        max: 100,
        splitNumber: 4,
        axisLine: {
          lineStyle: {
            width: 10,
            color: [
              [0.25, '#FF6B6B'], // Poor (0–25)
              [0.5, '#FFD166'],  // Fair (26–50)
              [0.75, '#06D6A0'], // Good (51–75)
              [1, '#118AB2'],    // Excellent (76–100)
            ],
          },
        },
        axisTick: {
          length: 12,
          lineStyle: {
            color: 'auto',
          },
        },
        splitLine: {
          length: 20,
          lineStyle: {
            color: 'auto',
          },
        },
        detail: {
          formatter: '{value}%',
          fontSize: 20,
          offsetCenter: [0, '70%'],
        },
        data: [{ value: score, name: 'Security Score' }],
      },
    ],
  };

  return (
    <Box p={4}>
      <Typography variant="h4" gutterBottom>Security Score</Typography>
      
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Current Security Score</Typography>
          <ReactECharts
            option={gaugeChartOptions}
            style={{ height: '400px', width: '100%' }}
          />
        </CardContent>
      </Card>
    </Box>
  );
};

export default SecurityScore;