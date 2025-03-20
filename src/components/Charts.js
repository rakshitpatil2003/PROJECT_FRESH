import React, { useEffect, useState, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import { API_URL } from '../config';

const Charts = () => {
  // State for chart data
  const [chartData, setChartData] = useState({
    timestamps: [],
    newLogCounts: [],
    totalLogsHistory: []
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

        // For the first data point, just show 10 new logs rather than the entire history
        const isFirstDataPoint = prevData.totalLogsHistory.length === 0;
        // Get previous total logs from history or default to 0
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
        
        return {
          timestamps: newTimestamps,
          newLogCounts: newLogCounts,
          totalLogsHistory: newTotalLogsHistory
        };
      });
      
      setLoading(false);
      setError(null);
    } catch (error) {
      console.error('Error fetching metrics for charts:', error);
      setError('Failed to load chart data');
      setLoading(false);
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

  const barChartOption = {
    animation: true,
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: function(params) {
        const value = params[0].value;
        return `${params[0].name}: ${value} new logs`;
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
      data: chartData.timestamps,
      axisLabel: {
        rotate: 45,
        interval: 0
      }
    },
    yAxis: {
      type: 'value',
      name: 'New Logs Count',
      minInterval: 1 // Ensure y-axis shows whole numbers
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
            if (value === 0) return '#cccccc'; // Grey for zero
            if (value < 5) return '#91CC75';  // Green for small values
            if (value < 15) return '#5470C6'; // Blue for medium values
            return '#EE6666'; // Red for large values
          }
        },
        label: {
          show: true,
          position: 'top',
          formatter: '{c}'
        }
      }
    ]
  };

  const lineChartOption = {
    animation: true,
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'line'
      },
      formatter: function(params) {
        const value = params[0].value;
        return `${params[0].name}: ${value} new logs`;
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
      data: chartData.timestamps,
      axisLabel: {
        rotate: 45,
        interval: 0
      }
    },
    yAxis: {
      type: 'value',
      name: 'New Logs Count',
      minInterval: 1 // Ensure y-axis shows whole numbers
    },
    series: [
      {
        name: 'New Logs',
        data: chartData.newLogCounts,
        type: 'line',
        smooth: true,
        lineStyle: {
          color: '#91CC75',
        },
        areaStyle: {
          color: '#91CC75',
          opacity: 0.2
        },
        symbol: 'circle',
        symbolSize: 8,
      }
    ]
  };

  // If loading and no data yet
  if (loading && chartData.timestamps.length === 0) {
    return (
      <div style={{ textAlign: 'center', marginTop: '50px' }}>
        <h2>Loading chart data...</h2>
        <p>Charts will appear as logs are collected.</p>
      </div>
    );
  }

  // If there's an error
  if (error && chartData.timestamps.length === 0) {
    return (
      <div style={{ textAlign: 'center', marginTop: '50px', color: '#f44336' }}>
        <h2>Error loading chart data</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div>
      <h2>New Logs per 10-Second Window (Last 100 Seconds)</h2>
      <ReactECharts 
        option={barChartOption} 
        style={{ height: '400px', width: '100%' }}
        notMerge={true}
      />

      <h2>New Logs Trend (Last 100 Seconds)</h2>
      <ReactECharts 
        option={lineChartOption} 
        style={{ height: '400px', width: '100%' }}
        notMerge={true}
      />
      
      {chartData.newLogCounts.every(count => count === 0) && (
        <div style={{ textAlign: 'center', marginTop: '20px', color: '#ff9800' }}>
          <p>No new logs detected in the time window. Charts will update when new logs arrive.</p>
        </div>
      )}
    </div>
  );
};

export default Charts;