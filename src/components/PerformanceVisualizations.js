import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Card, CardContent, Grid, Paper, IconButton, Dialog, useTheme } from '@mui/material';
import ReactECharts from 'echarts-for-react';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import CloseIcon from '@mui/icons-material/Close';
import { API_URL } from '../config';
import * as echarts from 'echarts';
import 'echarts-liquidfill';

const registerThemes = () => {
  // Define dark theme
  echarts.registerTheme('dark', {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    textStyle: {
      color: 'rgba(255, 255, 255, 0.8)'
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      textStyle: {
        color: '#fff'
      }
    }
  });

  // Define light theme
  echarts.registerTheme('light', {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    textStyle: {
      color: '#333'
    },
    tooltip: {
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      borderColor: 'rgba(0, 0, 0, 0.1)',
      textStyle: {
        color: '#333'
      }
    }
  });
};

// Call the function
registerThemes();

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
  // Helper function to format large numbers with appropriate suffixes
  const formatNumber = (num) => {
    if (num >= 1000000000) {
      return (num / 1000000000).toFixed(2) + 'B';
    }
    if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const getFunnelChartOptions = (isFullscreen) => {
    // Create fixed data for the triangle regardless of actual values
    // This ensures the shape remains consistent
    const data = [
      { 
        value: 100, 
        name: 'Events Analyzed', 
        displayValue: metricsData.totalLogs || 231500000
      },
      { 
        value: 57, 
        name: 'Detection', 
        displayValue: metricsData.normalLogs || 1320000
      },
      { 
        value: 14, 
        name: 'Alerts', 
        displayValue: metricsData.majorLogs || 216
      }
    ];

    return {
      backgroundColor: 'transparent',
      series: [
        {
          type: 'funnel',
          width: '80%',
          height: '90%',
          left: 'center',
          top: 'center',
          min: 0,
          max: 100,
          minSize: '0%',
          maxSize: '100%',
          sort: 'none',
          gap: 0,
          label: {
            show: true,
            position: 'inside',
            formatter: function(params) {
              // Display the actual count, not the fixed value
              const displayValue = formatNumber(params.data.displayValue);
              return '{white|' + displayValue + '}\n{white|' + params.name + '}';
            },
            rich: {
              white: {
                color: '#ffffff',
                fontSize: isFullscreen ? 16 : 14,
                fontWeight: 'bold',
                lineHeight: 25
              }
            }
          },
          labelLine: {
            show: false
          },
          itemStyle: {
            borderWidth: 0
          },
          data: [
            {
              ...data[0],
              itemStyle: {
                color: '#4CAF50',
                shadowBlur: 10,
                shadowColor: 'rgba(0, 0, 0, 0.3)'
              }
            },
            {
              ...data[1],
              itemStyle: {
                color: '#2196F3',
                shadowBlur: 10,
                shadowColor: 'rgba(0, 0, 0, 0.3)'
              }
            },
            {
              ...data[2],
              itemStyle: {
                color: '#F44336',
                shadowBlur: 10,
                shadowColor: 'rgba(0, 0, 0, 0.3)'
              }
            }
          ]
        }
      ]
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
// Fixed Security Score Gauge Component
// Liquid-Fill Security Score Gauge Component
// Final Liquid Security Score Gauge Component
// Adjusted Liquid Security Score Gauge Component
// Final Adjusted Security Score Gauge Component
export const SecurityScoreGauge = ({ securityScore = 0 }) => {
  // Logic to determine the score category and color
  const getScoreCategory = (score) => {
    if (score >= 80) return { category: 'PROTECTED', color: '#4caf50', secondaryColor: '#2196f3' }; // Green with blue hint
    if (score >= 60) return { category: 'MODERATE', color: '#2196f3', secondaryColor: '#ff9800' }; // Blue with orange hint
    if (score >= 40) return { category: 'AT RISK', color: '#ff9800', secondaryColor: '#f44336' }; // Orange with red hint
    return { category: 'VULNERABLE', color: '#f44336', secondaryColor: '#f44336' }; // Red
  };

  const scoreInfo = getScoreCategory(securityScore);
  const normalizedScore = securityScore / 100; // Convert to 0-1 range for liquid fill
  
  const getSecurityScoreOptions = (isFullscreen) => {
    const fontSize = isFullscreen ? 22 : 16;
    const valueSize = isFullscreen ? 28 : 20;
    const categorySize = isFullscreen ? 20 : 16;
    
    return {
      backgroundColor: 'transparent',
      series: [
        // Liquid Fill series
        {
          type: 'liquidFill',
          radius: '80%', 
          center: ['50%', '50%'], // Centered in the chart area
          data: [
            {
              value: normalizedScore,
              itemStyle: {
                color: scoreInfo.color,
                opacity: 0.8
              }
            },
            {
              value: normalizedScore * 0.9,
              itemStyle: {
                color: scoreInfo.secondaryColor,
                opacity: 0.2
              }
            }
          ],
          // Adjust these properties to change wave appearance
          amplitude: 10, // Wave size
          waveLength: '80%',
          phase: 'auto',
          period: (100 - securityScore) / 30 + 2, // Wave speed based on score (lower score = faster waves)
          direction: 'right',
          shape: 'circle',
          // Background
          backgroundStyle: {
            color: 'rgba(0, 0, 0, 0.05)',
            borderColor: scoreInfo.color,
            borderWidth: 1
          },
          // Outline
          outline: {
            show: true,
            borderDistance: 5,
            itemStyle: {
              borderColor: scoreInfo.color,
              borderWidth: 3,
              shadowBlur: 5,
              shadowColor: scoreInfo.color
            }
          },
          // Add label inside the liquid with white text
          label: {
            show: true,
            position: ['50%', '50%'],
            formatter: function(param) {
              return [
                '{title|Security Score}',
                '{value|' + securityScore + '%}'
              ].join('\n');
            },
            fontSize: fontSize,
            fontWeight: 'bold',
            color: '#ffffff',
            insideColor: '#ffffff',
            textAlign: 'center',
            textVerticalAlign: 'middle',
            rich: {
              title: {
                color: '#ffffff',
                fontSize: fontSize,
                fontWeight: 'bold',
                textAlign: 'center',
                lineHeight: fontSize * 1.2
              },
              value: {
                color: '#ffffff',
                fontSize: valueSize,
                fontWeight: 'bold',
                textAlign: 'center',
                textShadow: '0 0 5px rgba(0, 0, 0, 0.3)'
              }
            }
          },
          // Emphasizes the border glow based on security level
          itemStyle: {
            shadowBlur: 10,
            shadowColor: scoreInfo.color
          }
        },
        // Add ring with blinking animation
        {
          type: 'gauge',
          radius: '90%',
          center: ['50%', '50%'], 
          min: 0,
          max: 100,
          axisLine: {
            lineStyle: {
              width: 2,
              color: [[1, scoreInfo.color]]
            }
          },
          axisLabel: {
            show: false
          },
          axisTick: {
            show: false
          },
          splitLine: {
            show: false
          },
          pointer: {
            show: false
          },
          detail: {
            show: false
          },
          data: [{
            value: 0,
            name: ''
          }],
          // Create a blinking animation
          animationDuration: 1000,
          animationDurationUpdate: 1000,
          animationEasing: 'cubicOut',
          animationEasingUpdate: 'cubicOut',
          animationDelay: 0,
          animationDelayUpdate: 0
        }
      ]
    };
  };

  return (
    <FullscreenableChart
      title={
        <div style={{ 
          textAlign: 'center', 
          marginBottom: '10px', 
          fontSize: '18px',
          fontWeight: 'bold',
          color: scoreInfo.color
        }}>
          <span>Security Score</span>
          <div style={{ 
            marginTop: '8px', 
            fontSize: '20px', 
            color: scoreInfo.color,
            fontWeight: 'bold' 
          }}>
            {scoreInfo.category}
          </div>
        </div>
      }
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
// Improved Events Per Second Gauge
export const EventsPerSecondGauge = ({ chartData }) => {
  // Calculate events per second based on last 10 bars (100 seconds)
  const calculateEPS = useCallback(() => {
    if (!chartData || !chartData.newLogCounts || chartData.newLogCounts.length === 0) {
      return 0;
    }
    
    // Total events in last 10 bars
    const totalEvents = chartData.newLogCounts.reduce((sum, count) => sum + count, 0);
    
    // Calculate events per second (total divided by 100 seconds)
    const eventsPerSec = totalEvents / 100;
    
    // Return rounded value with 1 decimal place
    return Math.round(eventsPerSec * 10) / 10;
  }, [chartData]);

  // Memoize the EPS value to prevent unnecessary calculations
  const eps = React.useMemo(() => calculateEPS(), [calculateEPS]);

  // Determine the appropriate scale maximum based on the EPS value
  const getMaxScale = (epsValue) => {
    if (epsValue <= 5) return 10;
    if (epsValue <= 10) return 20;
    if (epsValue <= 20) return 30;
    if (epsValue <= 50) return 60;
    if (epsValue <= 80) return 100;
    return 150; // For extremely high values
  };

  // Determine color based on EPS value
  const getEpsColor = (value) => {
    if (value < 5) return '#4caf50'; // Green for low traffic
    if (value < 20) return '#2196f3'; // Blue for moderate traffic
    if (value < 50) return '#ff9800'; // Orange for high traffic
    return '#f44336'; // Red for very high traffic
  };

  const epsColor = getEpsColor(eps);
  const maxScale = getMaxScale(eps);

  const getEPSGaugeOptions = (isFullscreen) => {
    const fontSize = isFullscreen ? 18 : 14;
    const detailSize = isFullscreen ? 24 : 18;
    
    return {
      backgroundColor: 'transparent',
      series: [
        // Main gauge with gradient
        {
          name: 'Events Per Second',
          type: 'gauge',
          radius: isFullscreen ? '75%' : '85%',
          center: ['50%', '55%'],
          startAngle: 180,
          endAngle: 0,
          min: 0,
          max: maxScale,
          splitNumber: 5,
          axisLine: {
            lineStyle: {
              width: 20,
              color: [
                [0.25, '#4caf50'], // Green
                [0.5, '#2196f3'],  // Blue
                [0.75, '#ff9800'], // Orange
                [1, '#f44336']     // Red
              ]
            }
          },
          pointer: {
            width: 5,
            length: '60%',
            offsetCenter: [0, '8%'],
            itemStyle: {
              color: epsColor,
              shadowColor: 'rgba(0, 0, 0, 0.3)',
              shadowBlur: 8,
              shadowOffsetX: 2,
              shadowOffsetY: 2
            }
          },
          axisTick: {
            distance: -22,
            length: 8,
            lineStyle: {
              color: '#fff',
              width: 2,
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.3)'
            }
          },
          splitLine: {
            distance: -22,
            length: 15,
            lineStyle: {
              color: '#fff',
              width: 3,
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.3)'
            }
          },
          axisLabel: {
            distance: -15,
            color: '#999',
            fontSize: 12
          },
          title: {
            offsetCenter: [0, '65%'],
            fontSize: fontSize,
            fontWeight: 'bold',
            color: epsColor
          },
          detail: {
            offsetCenter: [0, '90%'],
            fontSize: detailSize,
            fontWeight: 'bold',
            color: epsColor,
            formatter: '{value} eps'
          },
          data: [{
            value: eps,
            name: epsColor === '#4caf50' ? 'Low Traffic' : 
                  epsColor === '#2196f3' ? 'Moderate Traffic' : 
                  epsColor === '#ff9800' ? 'High Traffic' : 'Heavy Traffic'
          }],
          animation: true,
          animationDuration: 1500,
          animationEasing: 'bounceOut'
        },
        // Add outer decorative ring
        {
          name: 'Outer Ring',
          type: 'gauge',
          radius: '95%',
          center: ['50%', '55%'],
          startAngle: 180,
          endAngle: 0,
          min: 0,
          max: maxScale,
          splitNumber: 0,
          axisLine: {
            lineStyle: {
              width: 5,
              color: [[1, 'rgba(255,255,255,0.1)']]
            }
          },
          axisLabel: {
            show: false
          },
          axisTick: {
            show: false
          },
          splitLine: {
            show: false
          },
          detail: {
            show: false
          },
          data: [{
            value: 0,
            name: ''
          }]
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