import React, { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';

const Charts = ({ logs }) => {
  // State for both charts using 10-second windows
  const [logWindows, setLogWindows] = useState({
    timestamps: Array(10).fill('').map((_, i) => {
      const time = new Date(Date.now() - (10 - i) * 10000);
      return time.toLocaleTimeString();
    }),
    counts: Array(10).fill(0)
  });

  const [timeDistribution, setTimeDistribution] = useState({
    timestamps: Array(10).fill('').map((_, i) => {
      const time = new Date(Date.now() - (10 - i) * 10000);
      return time.toLocaleTimeString();
    }),
    counts: Array(10).fill(0)
  });

  useEffect(() => {
    const updateCharts = () => {
      const now = Date.now();
      const currentWindow = Math.floor(now / 10000) * 10000;
      
      // Create time windows for the last 100 seconds
      const timeWindows = Array(10).fill(0).map((_, i) => ({
        start: currentWindow - (10 - i) * 10000,
        end: currentWindow - (9 - i) * 10000
      }));

      // Count logs for each window
      const newCounts = timeWindows.map(window => {
        return logs.filter(log => {
          const logTime = new Date(log.timestamp).getTime();
          return logTime >= window.start && logTime < window.end;
        }).length;
      });

      // Update timestamps for both charts
      const newTimestamps = timeWindows.map(window => 
        new Date(window.start).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit' 
        })
      );

      // Update first chart
      setLogWindows({
        timestamps: newTimestamps,
        counts: newCounts
      });

      // Update time distribution
      setTimeDistribution({
        timestamps: newTimestamps,
        counts: newCounts
      });
    };

    // Initial update
    updateCharts();
    
    // Update every 10 seconds
    const timer = setInterval(updateCharts, 10000);

    return () => clearInterval(timer);
  }, [logs]);

  const levelChartData = {
    animation: true,
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
      type: 'category',
      data: logWindows.timestamps,
      axisLabel: {
        rotate: 45,
        interval: 0
      }
    },
    yAxis: {
      type: 'value',
      name: 'Logs in 10s Window'
    },
    series: [
      {
        data: logWindows.counts,
        type: 'bar',
        itemStyle: {
          color: '#5470C6'
        }
      }
    ]
  };

  const timeChartData = {
    animation: true,
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'line'
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
      data: timeDistribution.timestamps,
      axisLabel: {
        rotate: 45,
        interval: 0
      }
    },
    yAxis: {
      type: 'value',
      name: 'Number of Logs'
    },
    series: [
      {
        data: timeDistribution.counts,
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

  return (
    <div>
      <h2>Log Count per 10-Second Window (Last 100 Seconds)</h2>
      <ReactECharts 
        option={levelChartData} 
        style={{ height: '400px', width: '100%' }}
        notMerge={true}
      />

      <h2>Real-time Log Distribution (Last 100 Seconds)</h2>
      <ReactECharts 
        option={timeChartData} 
        style={{ height: '400px', width: '100%' }}
        notMerge={true}
      />
    </div>
  );
};

export default Charts;