import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Card, CardContent, Grid, Paper, IconButton, Dialog, useTheme } from '@mui/material';
import ReactECharts from 'echarts-for-react';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import CloseIcon from '@mui/icons-material/Close';
import { API_URL } from '../config';
import * as echarts from 'echarts';

// Fullscreen wrapper component for any visualization
export const FullscreenableChart = ({ title, renderChart, height = '400px' }) => {
  const [fullscreen, setFullscreen] = useState(false);
  const theme = useTheme();

  const toggleFullscreen = () => {
    setFullscreen(!fullscreen);
  };

  return (
    <>
      <Card 
        sx={{ 
          height: '100%', 
          position: 'relative',
          transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: 6
          }
        }}
      >
        <CardContent sx={{ height: '100%', pb: '16px !important' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="h6" color="text.primary" fontWeight="medium">
              {title}
            </Typography>
            <IconButton 
              onClick={toggleFullscreen} 
              size="small"
              sx={{ 
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                '&:hover': {
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'
                }
              }}
            >
              <FullscreenIcon fontSize="small" />
            </IconButton>
          </Box>
          <Box height={height} width="100%">
            {renderChart(false)}
          </Box>
        </CardContent>
      </Card>

      <Dialog 
        open={fullscreen} 
        onClose={toggleFullscreen} 
        fullWidth 
        maxWidth="lg"
        PaperProps={{
          sx: {
            bgcolor: theme.palette.background.paper,
            backgroundImage: 'none',
            height: '90vh'
          }
        }}
      >
        <Box sx={{ p: 2, position: 'relative' }}>
          <IconButton
            onClick={toggleFullscreen}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
          <Typography variant="h5" align="center" mb={4} mt={1}>
            {title}
          </Typography>
          <Box height="calc(90vh - 100px)" width="100%">
            {renderChart(true)}
          </Box>
        </Box>
      </Dialog>
    </>
  );
};

// Funnel Chart Component
export const EventAnalysisFunnel = ({ metricsData }) => {
  const getFunnelChartOptions = (isFullscreen) => {
    // For static structure regardless of data values
    const data = [
      { value: metricsData.totalLogs || 100, name: 'Total Activities', itemStyle: { color: '#4CAF50' } },
      { value: metricsData.normalLogs || 70, name: 'Detected (Rule Level 1-11)', itemStyle: { color: '#2196F3' } },
      { value: metricsData.majorLogs || 30, name: 'Alerts (Rule Level >12)', itemStyle: { color: '#F44336' } }
    ];

    return {
      title: {
        text: isFullscreen ? 'Security Event Analysis' : '',
        left: 'center',
        textStyle: {
          fontSize: isFullscreen ? 22 : 16
        }
      },
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b} : {c}'
      },
      legend: {
        bottom: isFullscreen ? '5%' : '0%',
        left: 'center',
        data: ['Total Activities', 'Detected (Rule Level 1-11)', 'Alerts (Rule Level >12)'],
        textStyle: {
          fontSize: isFullscreen ? 14 : 12
        }
      },
      series: [
        {
          name: 'Event Analysis',
          type: 'funnel',
          left: '10%',
          top: isFullscreen ? 80 : 60,
          bottom: isFullscreen ? 80 : 60,
          width: '80%',
          minSize: '30%',
          maxSize: '100%',
          sort: 'descending',
          gap: 2,
          label: {
            show: true,
            position: 'inside',
            formatter: '{b}: {c}',
            fontSize: isFullscreen ? 16 : 12
          },
          labelLine: {
            length: 10,
            lineStyle: {
              width: 1,
              type: 'solid'
            }
          },
          itemStyle: {
            borderColor: '#fff',
            borderWidth: 1,
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowOffsetY: 5,
            shadowColor: 'rgba(0, 0, 0, 0.2)'
          },
          emphasis: {
            label: {
              fontSize: isFullscreen ? 20 : 14,
              fontWeight: 'bold',
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            },
            itemStyle: {
              shadowBlur: 20,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          },
          data: data
        }
      ],
      animation: true,
      animationDuration: 1000,
      animationEasing: 'elasticOut'
    };
  };

  return (
    <FullscreenableChart
      title="Event Analysis"
      renderChart={(isFullscreen) => (
        <ReactECharts
          option={getFunnelChartOptions(isFullscreen)}
          style={{ height: '100%', width: '100%' }}
          opts={{ renderer: 'canvas' }}
        />
      )}
    />
  );
};

// Security Score Gauge Component
export const SecurityScoreGauge = ({ securityScore = 0 }) => {
  // Logic to determine the score category
  const getScoreCategory = (score) => {
    if (score >= 80) return { category: 'Protected', color: '#118AB2' };
    if (score >= 60) return { category: 'Moderate', color: '#06D6A0' };
    if (score >= 40) return { category: 'At Risk', color: '#FFD166' };
    return { category: 'Vulnerable', color: '#FF6B6B' };
  };

  const scoreInfo = getScoreCategory(securityScore);

  const getSecurityScoreOptions = (isFullscreen) => {
    const textSize = isFullscreen ? 18 : 14;
    const detailSize = isFullscreen ? 20 : 16;
    
    return {
      title: {
        text: isFullscreen ? 'Security Score Analysis' : '',
        left: 'center',
        textStyle: {
          fontSize: isFullscreen ? 22 : 16
        }
      },
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
          radius: isFullscreen ? '80%' : '90%',
          center: ['50%', '60%'],
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
          pointer: {
            width: 5,
            itemStyle: {
              color: 'auto'
            }
          },
          title: {
            offsetCenter: [0, '80%'],
            fontSize: textSize,
            color: scoreInfo.color
          },
          detail: {
            formatter: '{value}%',
            fontSize: detailSize,
            offsetCenter: [0, '60%'],
            valueAnimation: true,
            color: scoreInfo.color
          },
          data: [{ value: securityScore, name: scoreInfo.category }],
          animationDuration: 1500
        },
      ],
    };
  };

  return (
    <FullscreenableChart
      title="Security Score"
      renderChart={(isFullscreen) => (
        <ReactECharts
          option={getSecurityScoreOptions(isFullscreen)}
          style={{ height: '100%', width: '100%' }}
          opts={{ renderer: 'canvas' }}
        />
      )}
    />
  );
};

// Events Per Second Gauge
export const EventsPerSecondGauge = ({ chartData }) => {
  // Calculate events per second based on last 10 bars (100 seconds)
  const calculateEPS = useCallback(() => {
    if (!chartData || !chartData.newLogCounts || chartData.newLogCounts.length === 0) {
      return 0;
    }
    
    // Total events in last 100 seconds
    const totalEvents = chartData.newLogCounts.reduce((sum, count) => sum + count, 0);
    
    // Calculate events per 10 seconds since each bar represents 10 seconds
    const eventsPerTenSecs = totalEvents / chartData.newLogCounts.length;
    
    // Return rounded value
    return Math.round(eventsPerTenSecs * 10) / 10;
  }, [chartData]);

  // Memoize the EPS value to prevent unnecessary calculations
  const eps = React.useMemo(() => calculateEPS(), [calculateEPS]);

  const getEPSGaugeOptions = (isFullscreen) => {
    // Determine color based on EPS value
    const getColor = (value) => {
      if (value < 5) return '#4caf50'; // Green
      if (value < 20) return '#2196f3'; // Blue
      if (value < 50) return '#ff9800'; // Orange
      return '#f44336'; // Red
    };

    const gaugeColor = getColor(eps);
    const textSize = isFullscreen ? 18 : 14;
    const detailSize = isFullscreen ? 24 : 18;

    return {
      title: {
        text: isFullscreen ? 'Traffic Volume Monitoring' : '',
        left: 'center',
        textStyle: {
          fontSize: isFullscreen ? 22 : 16
        }
      },
      series: [
        {
          type: 'gauge',
          min: 0,
          max: 100,
          splitNumber: 10,
          radius: isFullscreen ? '80%' : '90%',
          center: ['50%', '60%'],
          axisLine: {
            lineStyle: {
              width: 10,
              color: [
                [0.3, '#4caf50'],  // Green
                [0.6, '#2196f3'],  // Blue
                [0.8, '#ff9800'],  // Orange
                [1, '#f44336']     // Red
              ]
            }
          },
          pointer: {
            itemStyle: {
              color: gaugeColor
            },
            width: 5
          },
          axisTick: {
            distance: -12,
            length: 8,
            lineStyle: {
              color: '#999',
              width: 1
            }
          },
          splitLine: {
            distance: -20,
            length: 16,
            lineStyle: {
              color: '#999',
              width: 2
            }
          },
          axisLabel: {
            distance: -32,
            color: '#999',
            fontSize: isFullscreen ? 14 : 10
          },
          title: {
            offsetCenter: [0, '80%'],
            fontSize: textSize,
            color: gaugeColor
          },
          detail: {
            valueAnimation: true,
            formatter: '{value} eps',
            color: gaugeColor,
            fontSize: detailSize,
            offsetCenter: [0, '60%']
          },
          data: [{
            value: eps,
            name: 'Events Per Second'
          }],
          animationDuration: 1500,
          animationEasing: 'elasticOut'
        }
      ]
    };
  };

  return (
    <FullscreenableChart
      title="Events Per Second"
      renderChart={(isFullscreen) => (
        <ReactECharts
          option={getEPSGaugeOptions(isFullscreen)}
          style={{ height: '100%', width: '100%' }}
          opts={{ renderer: 'canvas' }}
        />
      )}
    />
  );
};

// Top Agents Component
export const TopAgentsVisualization = ({ topAgents }) => {
  const getTopAgentsOptions = (isFullscreen) => {
    const textSize = isFullscreen ? 14 : 12;
    
    return {
      title: {
        text: isFullscreen ? 'Top Active Agents' : '',
        left: 'center',
        textStyle: {
          fontSize: isFullscreen ? 22 : 16
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      legend: {
        show: false
      },
      grid: {
        left: '3%',
        right: '10%',
        bottom: '3%',
        top: isFullscreen ? '10%' : '5%',
        containLabel: true
      },
      xAxis: {
        type: 'value',
        name: 'Event Count',
        nameLocation: 'middle',
        nameGap: 30,
        nameTextStyle: {
          fontSize: textSize
        },
        axisLabel: {
          fontSize: textSize
        }
      },
      yAxis: {
        type: 'category',
        data: (topAgents || []).map(agent => agent.name || 'Unknown').reverse(),
        axisLabel: {
          fontSize: textSize,
          width: 120,
          overflow: 'truncate'
        }
      },
      series: [
        {
          name: 'Events',
          type: 'bar',
          data: (topAgents || []).map(agent => ({
            value: agent.count,
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                { offset: 0, color: '#83bff6' },
                { offset: 0.5, color: '#188df0' },
                { offset: 1, color: '#0b5ea8' }
              ])
            }
          })).reverse(),
          label: {
            show: true,
            position: 'right',
            fontSize: textSize
          },
          showBackground: true,
          backgroundStyle: {
            color: 'rgba(180, 180, 180, 0.1)'
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }
      ],
      animationDuration: 1000,
      animationEasing: 'elasticOut'
    };
  };

  return (
    <FullscreenableChart
      title="Top 7 Active Agents"
      renderChart={(isFullscreen) => (
        <ReactECharts
          option={getTopAgentsOptions(isFullscreen)}
          style={{ height: '100%', width: '100%' }}
          opts={{ renderer: 'canvas' }}
        />
      )}
    />
  );
};

// Alert Trends Component
export const AlertTrendsChart = ({ alertTrends }) => {
  const getAlertTrendsOptions = (isFullscreen) => {
    const textSize = isFullscreen ? 14 : 12;
    
    // Parse dates and ensure they're in order
    const dates = (alertTrends || []).map(item => item.date).sort();
    
    // Prepare series data
    const critical = (alertTrends || []).map(item => item.critical || 0);
    const high = (alertTrends || []).map(item => item.high || 0);
    const medium = (alertTrends || []).map(item => item.medium || 0);
    const low = (alertTrends || []).map(item => item.low || 0);
    
    return {
      title: {
        text: isFullscreen ? 'Alert Trend Analysis (Last 7 Days)' : '',
        left: 'center',
        textStyle: {
          fontSize: isFullscreen ? 22 : 16
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      legend: {
        data: ['Critical', 'High', 'Medium', 'Low'],
        bottom: 0,
        textStyle: {
          fontSize: textSize
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        top: isFullscreen ? '15%' : '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: {
          fontSize: textSize,
          rotate: 45
        }
      },
      yAxis: {
        type: 'value',
        name: 'Alert Count',
        nameTextStyle: {
          fontSize: textSize
        },
        axisLabel: {
          fontSize: textSize
        }
      },
      series: [
        {
          name: 'Critical',
          type: 'bar',
          stack: 'total',
          emphasis: {
            focus: 'series'
          },
          data: critical,
          itemStyle: {
            color: '#DC3545'
          },
          animationDelay: function (idx) {
            return idx * 100;
          }
        },
        {
          name: 'High',
          type: 'bar',
          stack: 'total',
          emphasis: {
            focus: 'series'
          },
          data: high,
          itemStyle: {
            color: '#FD7E14'
          },
          animationDelay: function (idx) {
            return idx * 100 + 100;
          }
        },
        {
          name: 'Medium',
          type: 'bar',
          stack: 'total',
          emphasis: {
            focus: 'series'
          },
          data: medium,
          itemStyle: {
            color: '#FFC107'
          },
          animationDelay: function (idx) {
            return idx * 100 + 200;
          }
        },
        {
          name: 'Low',
          type: 'bar',
          stack: 'total',
          emphasis: {
            focus: 'series'
          },
          data: low,
          itemStyle: {
            color: '#20C997'
          },
          animationDelay: function (idx) {
            return idx * 100 + 300;
          }
        }
      ],
      animationEasing: 'elasticOut',
      animationDelayUpdate: function (idx) {
        return idx * 5;
      }
    };
  };

  return (
    <FullscreenableChart
      title="Alert Trends (Last 7 Days)"
      renderChart={(isFullscreen) => (
        <ReactECharts
          option={getAlertTrendsOptions(isFullscreen)}
          style={{ height: '100%', width: '100%' }}
          opts={{ renderer: 'canvas' }}
        />
      )}
    />
  );
};