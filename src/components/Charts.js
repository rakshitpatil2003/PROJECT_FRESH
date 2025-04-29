import React, { useEffect, useState, useCallback, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import { Box, Typography, IconButton, Dialog, useTheme, Skeleton } from '@mui/material';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import CloseIcon from '@mui/icons-material/Close';
import { API_URL } from '../config';

const Charts = () => {
  // State for chart data
  const [chartData, setChartData] = useState({
    timestamps: [],
    newLogCounts: [],
    totalLogsHistory: []
  });
  
  // Store previous data in a ref for caching
  const cachedDataRef = useRef({
    timestamps: [],
    newLogCounts: [],
    totalLogsHistory: []
  });
  
  // State for UI controls
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [barChartFullscreen, setBarChartFullscreen] = useState(false);
  const [lineChartFullscreen, setLineChartFullscreen] = useState(false);
  
  // Theme for styling
  const theme = useTheme();

  // Function to fetch metrics directly from the API
  const fetchMetrics = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(`${API_URL}/api/logs/metrics`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      const currentTime = new Date().toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      });
      
      // Update chart data based on the new metrics
      setChartData(prevData => {
        // If there's cached data and current data is empty, use cached data first
        if (prevData.timestamps.length === 0 && cachedDataRef.current.timestamps.length > 0) {
          prevData = { ...cachedDataRef.current };
        }

        // For the first data point, just show 10 new logs rather than the entire history
        const isFirstDataPoint = prevData.totalLogsHistory.length === 0;
        
        // Get previous total logs from history or default to current total minus 10
        const previousTotal = isFirstDataPoint
          ? data.totalLogs - 10  // This will make the first bar show exactly 10
          : (prevData.totalLogsHistory.length > 0 
            ? prevData.totalLogsHistory[prevData.totalLogsHistory.length - 1] 
            : 0);
        
        // Calculate new logs in this interval
        const newLogs = Math.max(0, data.totalLogs - previousTotal);
        
        // Update timestamps - add new timestamp
        const newTimestamps = [...prevData.timestamps, currentTime];
        if (newTimestamps.length > 10) {
          newTimestamps.shift(); // Remove oldest timestamp if we have more than 10
        }
        
        // Update new logs counts - add new count
        const newLogCounts = [...prevData.newLogCounts, newLogs];
        if (newLogCounts.length > 10) {
          newLogCounts.shift(); // Remove oldest count if we have more than 10
        }
        
        // Update total logs history
        const newTotalLogsHistory = [...prevData.totalLogsHistory, data.totalLogs];
        if (newTotalLogsHistory.length > 11) { // Keep 11 to calculate 10 differences
          newTotalLogsHistory.shift();
        }
        
        // Update the cached data reference
        const newData = {
          timestamps: newTimestamps,
          newLogCounts: newLogCounts,
          totalLogsHistory: newTotalLogsHistory
        };
        
        cachedDataRef.current = newData;
        
        // Also store in localStorage for persistence across refreshes
        try {
          localStorage.setItem('chartDataCache', JSON.stringify(newData));
        } catch (e) {
          console.warn('Failed to cache chart data to localStorage:', e);
        }
        
        return newData;
      });
      
      setLoading(false);
      setError(null);
    } catch (error) {
      console.error('Error fetching metrics for charts:', error);
      setError('Failed to load chart data');
      setLoading(false);
    }
  }, []);

  // Load cached data from localStorage on first render
  useEffect(() => {
    try {
      const cachedData = localStorage.getItem('chartDataCache');
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        setChartData(parsedData);
        cachedDataRef.current = parsedData;
        setLoading(false);
      }
    } catch (e) {
      console.warn('Failed to load cached chart data:', e);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchMetrics();
    
    // Set up interval for updates
    const interval = setInterval(fetchMetrics, 10000);
    
    // Clean up on unmount
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  const toggleBarChartFullscreen = () => {
    setBarChartFullscreen(!barChartFullscreen);
  };

  const toggleLineChartFullscreen = () => {
    setLineChartFullscreen(!lineChartFullscreen);
  };

  const getBarChartOption = (isFullscreen) => {
    return {
      backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'transparent',
      animation: true,
      title: {
        text: isFullscreen ? 'New Logs per 10-Second Window (Last 100 Seconds)' : '',
        left: 'center',
        top: 10,
        textStyle: {
          color: theme.palette.text.primary,
          fontSize: isFullscreen ? 20 : 16
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        formatter: function(params) {
          const value = params[0].value;
          return `${params[0].name}: ${value} new logs`;
        },
        textStyle: {
          fontSize: isFullscreen ? 14 : 12
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: isFullscreen ? '15%' : '8%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: chartData.timestamps,
        axisLabel: {
          rotate: 45,
          interval: 0,
          fontSize: isFullscreen ? 14 : 12,
          color: theme.palette.text.secondary
        },
        axisLine: {
          lineStyle: {
            color: theme.palette.divider
          }
        }
      },
      yAxis: {
        type: 'value',
        name: 'New Logs Count',
        nameTextStyle: {
          fontSize: isFullscreen ? 14 : 12,
          color: theme.palette.text.secondary
        },
        minInterval: 1, // Ensure y-axis shows whole numbers
        axisLabel: {
          fontSize: isFullscreen ? 14 : 12,
          color: theme.palette.text.secondary
        },
        axisLine: {
          lineStyle: {
            color: theme.palette.divider
          }
        },
        splitLine: {
          lineStyle: {
            color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
          }
        }
      },
      series: [
        {
          name: 'New Logs',
          data: chartData.newLogCounts,
          type: 'bar',
          itemStyle: {
            color: function(params) {
              // Define a color gradient based on the value
              const value = params.value;
              if (value === 0) return theme.palette.mode === 'dark' ? '#555' : '#ccc'; // Grey for zero
              if (value < 5) return '#91CC75';  // Green for small values
              if (value < 15) return '#5470C6'; // Blue for medium values
              return '#EE6666'; // Red for large values
            },
            borderRadius: [4, 4, 0, 0]
          },
          label: {
            show: true,
            position: 'top',
            formatter: '{c}',
            fontSize: isFullscreen ? 14 : 12,
            color: theme.palette.text.secondary
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0,0,0,0.3)'
            }
          },
          animationDelay: function (idx) {
            return idx * 100;
          }
        }
      ],
      animationEasing: 'elasticOut',
      animationDelayUpdate: function (idx) {
        return idx * 5;
      }
    };
  };

  const getLineChartOption = (isFullscreen) => {
    return {
      backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'transparent',
      animation: true,
      title: {
        text: isFullscreen ? 'New Logs Trend (Last 100 Seconds)' : '',
        left: 'center',
        top: 10,
        textStyle: {
          color: theme.palette.text.primary,
          fontSize: isFullscreen ? 20 : 16
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'line'
        },
        formatter: function(params) {
          const value = params[0].value;
          return `${params[0].name}: ${value} new logs`;
        },
        textStyle: {
          fontSize: isFullscreen ? 14 : 12
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: isFullscreen ? '15%' : '8%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: chartData.timestamps,
        axisLabel: {
          rotate: 45,
          interval: 0,
          fontSize: isFullscreen ? 14 : 12,
          color: theme.palette.text.secondary
        },
        axisLine: {
          lineStyle: {
            color: theme.palette.divider
          }
        },
        boundaryGap: false
      },
      yAxis: {
        type: 'value',
        name: 'New Logs Count',
        nameTextStyle: {
          fontSize: isFullscreen ? 14 : 12,
          color: theme.palette.text.secondary
        },
        minInterval: 1, // Ensure y-axis shows whole numbers
        axisLabel: {
          fontSize: isFullscreen ? 14 : 12,
          color: theme.palette.text.secondary
        },
        axisLine: {
          lineStyle: {
            color: theme.palette.divider
          }
        },
        splitLine: {
          lineStyle: {
            color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
          }
        }
      },
      series: [
        {
          name: 'New Logs',
          data: chartData.newLogCounts,
          type: 'line',
          smooth: true,
          lineStyle: {
            width: 3,
            color: '#5470C6',
            shadowColor: 'rgba(0,0,0,0.3)',
            shadowBlur: 10
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [{
                offset: 0, color: theme.palette.mode === 'dark' ? 'rgba(84,112,198,0.7)' : 'rgba(84,112,198,0.5)'
              }, {
                offset: 1, color: theme.palette.mode === 'dark' ? 'rgba(84,112,198,0.1)' : 'rgba(84,112,198,0.1)'
              }]
            }
          },
          symbol: 'circle',
          symbolSize: 8,
          emphasis: {
            scale: true,
            focus: 'series',
            itemStyle: {
              shadowBlur: 20,
              shadowColor: 'rgba(0,0,0,0.5)'
            }
          },
          markPoint: {
            data: [
              { type: 'max', name: 'Max' },
              { type: 'min', name: 'Min' }
            ],
            label: {
              fontSize: isFullscreen ? 14 : 12
            }
          },
          animationDelay: function(idx) {
            return idx * 100;
          }
        }
      ],
      animationEasing: 'elasticOut',
      animationDelayUpdate: function (idx) {
        return idx * 5;
      }
    };
  };

  // If loading and no data yet
  if (loading && chartData.timestamps.length === 0) {
    return (
      <Box sx={{ mt: 4 }}>
        <Skeleton variant="rectangular" height={400} animation="wave" sx={{ mb: 4 }} />
        <Skeleton variant="rectangular" height={400} animation="wave" />
      </Box>
    );
  }

  // If there's an error
  if (error && chartData.timestamps.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', my: 4, color: theme.palette.error.main }}>
        <Typography variant="h6">Error loading chart data</Typography>
        <Typography variant="body1">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      {/* Bar Chart */}
      <Box sx={{ position: 'relative', mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6" fontWeight="medium">
            New Logs per 10-Second Window (Last 100 Seconds)
          </Typography>
          <IconButton 
            onClick={toggleBarChartFullscreen} 
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
        <ReactECharts 
          option={getBarChartOption(false)} 
          style={{ height: '400px', width: '100%' }}
          notMerge={true}
          opts={{ renderer: 'canvas' }}
        />
      </Box>

      {/* Line Chart */}
      <Box sx={{ position: 'relative' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6" fontWeight="medium">
            New Logs Trend (Last 100 Seconds)
          </Typography>
          <IconButton 
            onClick={toggleLineChartFullscreen} 
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
        <ReactECharts 
          option={getLineChartOption(false)} 
          style={{ height: '400px', width: '100%' }}
          notMerge={true}
          opts={{ renderer: 'canvas' }}
        />
      </Box>
      
      {/* Message when no new logs */}
      {chartData.newLogCounts.every(count => count === 0) && (
        <Box sx={{ textAlign: 'center', mt: 3, color: theme.palette.warning.main }}>
          <Typography variant="body1">
            No new logs detected in the time window. Charts will update when new logs arrive.
          </Typography>
        </Box>
      )}

      {/* Fullscreen Dialog for Bar Chart */}
      <Dialog 
        open={barChartFullscreen} 
        onClose={toggleBarChartFullscreen} 
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
        <Box sx={{ p: 2, position: 'relative', height: '100%' }}>
          <IconButton
            onClick={toggleBarChartFullscreen}
            sx={{ position: 'absolute', right: 8, top: 8, zIndex: 10 }}
          >
            <CloseIcon />
          </IconButton>
          <Box height="calc(90vh - 50px)" width="100%">
            <ReactECharts 
              option={getBarChartOption(true)} 
              style={{ height: '100%', width: '100%' }}
              notMerge={true}
              opts={{ renderer: 'canvas' }}
            />
          </Box>
        </Box>
      </Dialog>

      {/* Fullscreen Dialog for Line Chart */}
      <Dialog 
        open={lineChartFullscreen} 
        onClose={toggleLineChartFullscreen} 
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
        <Box sx={{ p: 2, position: 'relative', height: '100%' }}>
          <IconButton
            onClick={toggleLineChartFullscreen}
            sx={{ position: 'absolute', right: 8, top: 8, zIndex: 10 }}
          >
            <CloseIcon />
          </IconButton>
          <Box height="calc(90vh - 50px)" width="100%">
            <ReactECharts 
              option={getLineChartOption(true)} 
              style={{ height: '100%', width: '100%' }}
              notMerge={true}
              opts={{ renderer: 'canvas' }}
            />
          </Box>
        </Box>
      </Dialog>
    </Box>
  );
};

export default Charts;