import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import ReactECharts from 'echarts-for-react';
import * as am4core from "@amcharts/amcharts4/core";
import * as am4maps from "@amcharts/amcharts4/maps";
import am4geodata_worldLow from "@amcharts/amcharts4-geodata/worldLow";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableContainer,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Grid,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  CircularProgress,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Card,
  CardContent,
  Tabs,
  Tab,
  Button
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import TableViewIcon from '@mui/icons-material/TableView';
import DashboardIcon from '@mui/icons-material/Dashboard';
import { parseLogMessage, StructuredLogView } from '../utils/normalizeLogs';

// Define API URL from environment or default
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Add this before your component
// Updated to use full country names to match your logs
const countryCoordinates = {
  "United States": { latitude: 39.7837304, longitude: -100.4458825 }, "India": { latitude: 20.5937, longitude: 78.9629 },
  "Germany": { latitude: 51.1657, longitude: 10.4515 }, "France": { latitude: 46.6034, longitude: 1.8883 }, "Netherlands": { latitude: 52.1326, longitude: 5.2913 },
  "Singapore": { latitude: 1.3521, longitude: 103.8198 }, "Japan": { latitude: 36.2048, longitude: 138.2529 }, "Luxembourg": { latitude: 49.8153, longitude: 6.1296 },
  "Reserved": { latitude: 7.873054, longitude: 80.771797 }, "China": { latitude: 35.8617, longitude: 104.1954 }, "United Kingdom": { latitude: 55.3781, longitude: -3.4360 },
  "Canada": { latitude: 56.1304, longitude: -106.3468 }, "Australia": { latitude: -25.2744, longitude: 133.7751 }, "Brazil": { latitude: -14.2350, longitude: -51.9253 },
  "Russia": { latitude: 61.5240, longitude: 105.3188 }, "South Korea": { latitude: 35.9078, longitude: 127.7669 }, "Italy": { latitude: 41.8719, longitude: 12.5674 },
  "Spain": { latitude: 40.4637, longitude: -3.7492 }, "Mexico": { latitude: 23.6345, longitude: -102.5528 }, "Indonesia": { latitude: -0.7893, longitude: 113.9213 },
  "South Africa": { latitude: -30.5595, longitude: 22.9375 }, "Korea, Republic of": { latitude: 40.339852, longitude: 127.510093 },
  "Hong Kong": { latitude: 22.319303, longitude: 114.169361 }, "Afghanistan": { latitude: 33.9391, longitude: 67.709953 },
  "Albania": { latitude: 41.1533, longitude: 20.1683 }, "Algeria": { latitude: 28.0339, longitude: 1.6596 }, "Andorra": { latitude: 42.5078, longitude: 1.5211 },
  "Angola": { latitude: -11.2027, longitude: 17.8739 }, "Argentina": { latitude: -38.4161, longitude: -63.6167 }, "Armenia": { latitude: 40.0691, longitude: 45.0382 },
  "Austria": { latitude: 47.5162, longitude: 14.5501 }, "Azerbaijan": { latitude: 40.1431, longitude: 47.5769 }, "Bahamas": { latitude: 25.0343, longitude: -77.3963 },
  "Bahrain": { latitude: 26.0667, longitude: 50.5577 }, "Bangladesh": { latitude: 23.685, longitude: 90.3563 }, "Belarus": { latitude: 53.9006, longitude: 27.559 },
  "Belgium": { latitude: 50.8503, longitude: 4.3517 }, "Belize": { latitude: 17.1899, longitude: -88.4976 }, "Benin": { latitude: 9.3077, longitude: 2.3158 },
  "Bhutan": { latitude: 27.5142, longitude: 90.4336 }, "Bolivia": { latitude: -16.2902, longitude: -63.5887 }, "Botswana": { latitude: -22.3285, longitude: 24.6849 },
  "Brunei": { latitude: 4.5353, longitude: 114.7277 }, "Bulgaria": { latitude: 42.7339, longitude: 25.4858 }, "Burkina Faso": { latitude: 12.2383, longitude: -1.5616 },
  "Burundi": { latitude: -3.3731, longitude: 29.9189 }, "Cambodia": { latitude: 12.5657, longitude: 104.991 }, "Cameroon": { latitude: 7.3697, longitude: 12.3547 },
  "Chile": { latitude: -35.6751, longitude: -71.543 }, "Colombia": { latitude: 4.5709, longitude: -74.2973 }, "Costa Rica": { latitude: 9.7489, longitude: -83.7534 },
  "Croatia": { latitude: 45.1, longitude: 15.2 }, "Cuba": { latitude: 21.5218, longitude: -77.7812 }, "Cyprus": { latitude: 35.1264, longitude: 33.4299 },
  "Czech Republic": { latitude: 49.8175, longitude: 15.473 }, "Denmark": { latitude: 56.2639, longitude: 9.5018 }, "Dominican Republic": { latitude: 18.7357, longitude: -70.1627 },
  "Ecuador": { latitude: -1.8312, longitude: -78.1834 }, "Egypt": { latitude: 26.8206, longitude: 30.8025 }, "El Salvador": { latitude: 13.7942, longitude: -88.8965 },
  "Estonia": { latitude: 58.5953, longitude: 25.0136 }, "Ethiopia": { latitude: 9.145, longitude: 40.4897 }, "Finland": { latitude: 61.9241, longitude: 25.7482 },
  "Ghana": { latitude: 7.9465, longitude: -1.0232 }, "Greece": { latitude: 39.0742, longitude: 21.8243 }, "Guatemala": { latitude: 15.7835, longitude: -90.2308 },
  "Honduras": { latitude: 15.1999, longitude: -86.2419 }, "Hungary": { latitude: 47.1625, longitude: 19.5033 }, "Iceland": { latitude: 64.9631, longitude: -19.0208 },
  "Iran": { latitude: 32.4279, longitude: 53.688 }, "Iraq": { latitude: 33.2232, longitude: 43.6793 }, "Ireland": { latitude: 53.4129, longitude: -8.2439 },
  "Israel": { latitude: 31.0461, longitude: 34.8516 }, "Jamaica": { latitude: 18.1096, longitude: -77.2975 }, "Jordan": { latitude: 30.5852, longitude: 36.2384 },
  "Kazakhstan": { latitude: 48.0196, longitude: 66.9237 }, "Kuwait": { latitude: 29.3117, longitude: 47.4818 }, "Latvia": { latitude: 56.8796, longitude: 24.6032 },
  "Lebanon": { latitude: 33.8547, longitude: 35.8623 }, "Lithuania": { latitude: 55.1694, longitude: 23.8813 }, "Madagascar": { latitude: -18.7669, longitude: 46.8691 },
  "Malaysia": { latitude: 4.2105, longitude: 101.9758 }, "Malta": { latitude: 35.9375, longitude: 14.3754 }, "Nepal": { latitude: 28.3949, longitude: 84.124 },
  "New Zealand": { latitude: -40.9006, longitude: 174.886 }, "Norway": { latitude: 60.472, longitude: 8.4689 }, "Pakistan": { latitude: 30.3753, longitude: 69.3451 },
  "Philippines": { latitude: 12.8797, longitude: 121.774 }, "Poland": { latitude: 51.9194, longitude: 19.1451 }, "Portugal": { latitude: 39.3999, longitude: -8.2245 },
  "Sweden": { latitude: 60.1282, longitude: 18.6435 }, "Switzerland": { latitude: 46.8182, longitude: 8.2275 }, "Thailand": { latitude: 15.870, longitude: 100.9925 }
};




const ThreatHunting = () => {
  // State variables
  const [logs, setLogs] = useState([]);
  const [allLogs, setAllLogs] = useState([]); // Store all logs for visualization
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState(0);
  const [view, setView] = useState('dashboard'); // 'dashboard' or 'events'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedSrcCountry, setSelectedSrcCountry] = useState('');
  const [selectedDstCountry, setSelectedDstCountry] = useState('');

  // Fetch logs from API
  // Modify the useEffect function to fetch all logs for visualization
  useEffect(() => {
    const fetchThreatLogs = async () => {
      try {
        setLoading(true);

        // Fetch paginated logs for the table
        const response = await axios.get(`${API_URL}/api/logs/threats`, {
          params: {
            page: page,
            limit: rowsPerPage,
            search: searchTerm,
            action: selectedAction,
            srcCountry: selectedSrcCountry,
            dstCountry: selectedDstCountry
          }
        });

        // Parse logs through our normalization function
        const normalizedLogs = response.data.logs.map(log => parseLogMessage(log));

        setLogs(normalizedLogs);
        // Calculate total pages based on response
        setTotalPages(Math.ceil(response.data.total / rowsPerPage) || 1);

        // Fetch ALL logs for visualization without pagination
        const allLogsResponse = await axios.get(`${API_URL}/api/logs/threats`, {
          params: {
            limit: 0, // Set limit to 0 to fetch all logs
            search: searchTerm,
            action: selectedAction,
            srcCountry: selectedSrcCountry,
            dstCountry: selectedDstCountry
          }
        });

        const allNormalizedLogs = allLogsResponse.data.logs.map(log => parseLogMessage(log));
        setAllLogs(allNormalizedLogs);

        setError(null);
      } catch (err) {
        console.error('Error fetching threat logs:', err);
        setError('Failed to fetch threat logs. Please try again.');
        setLogs([]);
        setAllLogs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchThreatLogs();
  }, [page, rowsPerPage, searchTerm, selectedAction, selectedSrcCountry, selectedDstCountry]);

  // Handler for viewing log details
  const handleViewDetails = (log) => {
    setSelectedLog(log);
  };

  // Format timestamp to be more readable
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch (e) {
      return timestamp;
    }
  };

  // Get color based on action type
  const getActionColor = (action) => {
    if (!action) return 'default';

    const actionLower = action.toLowerCase();
    if (actionLower === 'block' || actionLower === 'denied') return 'error';
    if (actionLower === 'alert') return 'warning';
    if (actionLower === 'allow' || actionLower === 'permitted') return 'success';
    return 'info';
  };



  // Process data for visualizations
  const visualizationData = useMemo(() => {
    if (!allLogs || allLogs.length === 0) return null;

    // Count by action type
    const actionCounts = {};

    // Source and destination countries
    const srcCountryMap = {};
    const dstCountryMap = {};
    const serviceMap = {};
    const appCategoryMap = {};
    const directionMap = {};
    const timelineData = [];
    const srcDestPairs = {};

    allLogs.forEach(log => {
      // Process action
      const action = log.traffic?.action || 'Unknown';
      actionCounts[action] = (actionCounts[action] || 0) + 1;

      // Process source country
      const srcCountry = log.traffic?.srcCountry || 'Unknown';
      if (srcCountry !== 'N/A' && srcCountry !== 'Unknown') {
        srcCountryMap[srcCountry] = (srcCountryMap[srcCountry] || 0) + 1;
      }

      // Process destination country
      const dstCountry = log.traffic?.dstCountry || 'Unknown';
      if (dstCountry !== 'N/A' && dstCountry !== 'Unknown') {
        dstCountryMap[dstCountry] = (dstCountryMap[dstCountry] || 0) + 1;
      }

      // Process service
      const service = log.traffic?.service || 'Unknown';
      if (service !== 'N/A' && service !== 'Unknown') {
        serviceMap[service] = (serviceMap[service] || 0) + 1;
      }

      // Process app category
      const appcat = log.traffic?.appcat || 'Unknown';
      if (appcat !== 'N/A' && appcat !== 'Unknown') {
        appCategoryMap[appcat] = (appCategoryMap[appcat] || 0) + 1;
      }

      // Process direction
      const direction = log.traffic?.direction || 'Unknown';
      if (direction !== 'N/A' && direction !== 'Unknown') {
        directionMap[direction] = (directionMap[direction] || 0) + 1;
      }

      // Process timestamp for timeline
      if (log.timestamp) {
        let date;
        try {
          date = new Date(log.timestamp);
          const dateString = date.toISOString().split('T')[0];

          // Group by date
          const existingIndex = timelineData.findIndex(item => item.date === dateString);
          if (existingIndex >= 0) {
            timelineData[existingIndex].count += 1;
          } else {
            timelineData.push({
              date: dateString,
              count: 1
            });
          }
        } catch (e) {
          // Skip invalid dates
        }
      }

      // Process source-destination pairs for connection visualization
      if (srcCountry !== 'N/A' && srcCountry !== 'Unknown' &&
        dstCountry !== 'N/A' && dstCountry !== 'Unknown' &&
        countryCoordinates[srcCountry] && countryCoordinates[dstCountry]) {
        const pairKey = `${srcCountry}->${dstCountry}`;
        srcDestPairs[pairKey] = (srcDestPairs[pairKey] || 0) + 1;
      }
    });

    // Sort and format for charts
    const topSrcCountries = Object.entries(srcCountryMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));

    const topDstCountries = Object.entries(dstCountryMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));

    const topServices = Object.entries(serviceMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));

    const topAppCategories = Object.entries(appCategoryMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));

    // Sort timeline data
    const sortedTimelineData = timelineData
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Create connection data for source -> destination visualization
    const connectionData = Object.entries(srcDestPairs)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50) // Take top 50 connections
      .map(([pair, value]) => {
        const [source, target] = pair.split('->');
        return {
          source, target, value, srcLatitude: countryCoordinates[source]?.latitude || 0,
          srcLongitude: countryCoordinates[source]?.longitude || 0,
          dstLatitude: countryCoordinates[target]?.latitude || 0,
          dstLongitude: countryCoordinates[target]?.longitude || 0
        };


      })// Filter out connections without coordinates
      .filter(conn => {
        return conn.srcLatitude && conn.srcLongitude &&
          conn.dstLatitude && conn.dstLongitude;
      });

    // Extract unique countries for connection chart
    const connectionCountries = new Set();
    connectionData.forEach(item => {
      connectionCountries.add(item.source);
      connectionCountries.add(item.target);
    });

    return {
      actionCounts,
      topSrcCountries,
      topDstCountries,
      topServices,
      topAppCategories,
      directionCounts: directionMap,
      timelineData: sortedTimelineData,
      connectionData,
      connectionCountries: Array.from(connectionCountries)
    };
  }, [allLogs]);

  // Chart options
  const actionChartOption = {
    title: {
      text: 'Events by Action',
      left: 'center'
    },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      data: Object.keys(visualizationData?.actionCounts || {})
    },
    series: [
      {
        name: 'Action',
        type: 'pie',
        radius: ['50%', '70%'],
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
            fontSize: '18',
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: Object.entries(visualizationData?.actionCounts || {}).map(([name, value]) => ({
          name,
          value,
          itemStyle: {
            color: name.toLowerCase() === 'block' || name.toLowerCase() === 'denied' ? '#dc3545' :
              name.toLowerCase() === 'alert' ? '#ffc107' :
                name.toLowerCase() === 'allow' || name.toLowerCase() === 'permitted' ? '#28a745' : '#6c757d'
          }
        }))
      }
    ]
  };

  const srcCountryChartOption = {
    title: {
      text: 'Top Source Countries',
      left: 'center'
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
      type: 'value'
    },
    yAxis: {
      type: 'category',
      data: (visualizationData?.topSrcCountries || []).map(item => item.name).reverse(),
      axisLabel: {
        width: 120,
        overflow: 'truncate'
      }
    },
    series: [
      {
        name: 'Count',
        type: 'bar',
        data: (visualizationData?.topSrcCountries || []).map(item => item.value).reverse(),
        itemStyle: {
          color: '#36a2eb'
        }
      }
    ]
  };

  const dstCountryChartOption = {
    title: {
      text: 'Top Destination Countries',
      left: 'center'
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
      type: 'value'
    },
    yAxis: {
      type: 'category',
      data: (visualizationData?.topDstCountries || []).map(item => item.name).reverse(),
      axisLabel: {
        width: 120,
        overflow: 'truncate'
      }
    },
    series: [
      {
        name: 'Count',
        type: 'bar',
        data: (visualizationData?.topDstCountries || []).map(item => item.value).reverse(),
        itemStyle: {
          color: '#ff6384'
        }
      }
    ]
  };

  const serviceChartOption = {
    title: {
      text: 'Top Services',
      left: 'center'
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
      type: 'value'
    },
    yAxis: {
      type: 'category',
      data: (visualizationData?.topServices || []).map(item => item.name).reverse(),
      axisLabel: {
        width: 150,
        overflow: 'truncate'
      }
    },
    series: [
      {
        name: 'Count',
        type: 'bar',
        data: (visualizationData?.topServices || []).map(item => item.value).reverse(),
        itemStyle: {
          color: '#4bc0c0'
        }
      }
    ]
  };

  const appCategoryChartOption = {
    title: {
      text: 'Top Application Categories',
      left: 'center'
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
      type: 'value'
    },
    yAxis: {
      type: 'category',
      data: (visualizationData?.topAppCategories || []).map(item => item.name).reverse(),
      axisLabel: {
        width: 150,
        overflow: 'truncate'
      }
    },
    series: [
      {
        name: 'Count',
        type: 'bar',
        data: (visualizationData?.topAppCategories || []).map(item => item.value).reverse(),
        itemStyle: {
          color: '#ff9f40'
        }
      }
    ]
  };

  const directionChartOption = {
    title: {
      text: 'Traffic Direction',
      left: 'center'
    },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'horizontal',
      bottom: 'bottom',
      data: Object.keys(visualizationData?.directionCounts || {})
    },
    series: [
      {
        name: 'Direction',
        type: 'pie',
        radius: '50%',
        data: Object.entries(visualizationData?.directionCounts || {}).map(([name, value]) => ({
          name,
          value
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

  const timelineChartOption = {
    title: {
      text: 'Events Timeline',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        label: {
          backgroundColor: '#6a7985'
        }
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
      boundaryGap: false,
      data: (visualizationData?.timelineData || []).map(item => item.date)
    },
    yAxis: {
      type: 'value',
      name: 'Events'
    },
    series: [
      {
        name: 'Detected Events',
        type: 'line',
        stack: 'Total',
        areaStyle: {},
        emphasis: {
          focus: 'series'
        },
        data: (visualizationData?.timelineData || []).map(item => item.count),
        itemStyle: {
          color: '#8884d8'
        }
      }
    ]
  };


  // Add this somewhere in your code to debug country entries that don't have coordinates
  useEffect(() => {
    if (allLogs && allLogs.length > 0) {
      const countriesInLogs = new Set();
      allLogs.forEach(log => {
        if (log.traffic?.srcCountry && log.traffic.srcCountry !== 'N/A' && log.traffic.srcCountry !== 'Unknown') {
          countriesInLogs.add(log.traffic.srcCountry);
        }
        if (log.traffic?.dstCountry && log.traffic.dstCountry !== 'N/A' && log.traffic.dstCountry !== 'Unknown') {
          countriesInLogs.add(log.traffic.dstCountry);
        }
      });

      // Find countries that don't have coordinates defined
      const missingCoordinates = Array.from(countriesInLogs).filter(country => !countryCoordinates[country]);
      if (missingCoordinates.length > 0) {
        console.warn('Countries missing coordinates:', missingCoordinates);
      }
    }
  }, [allLogs]);



  const WorldConnectionMap = ({ connectionData }) => {
    const chartRef = React.useRef(null);
    const chartInstanceRef = React.useRef(null);

    useEffect(() => {
      // Create map instance
      const chart = am4core.create("chartdiv", am4maps.MapChart);
      chartInstanceRef.current = chart;

      // Set map definition
      chart.geodata = am4geodata_worldLow;

      // Set projection
      chart.projection = new am4maps.projections.Miller();

      // Create map polygon series
      const polygonSeries = chart.series.push(new am4maps.MapPolygonSeries());
      polygonSeries.useGeodata = true;
      polygonSeries.mapPolygons.template.fill = am4core.color("#d9d9d9");
      polygonSeries.mapPolygons.template.stroke = am4core.color("#ffffff");

      // Configure country hover states
      polygonSeries.mapPolygons.template.tooltipText = "{name}";
      polygonSeries.mapPolygons.template.cursorOverStyle = am4core.MouseCursorStyle.pointer;

      // Add city markers
      const citySeries = chart.series.push(new am4maps.MapImageSeries());
      const city = citySeries.mapImages.template.createChild(am4core.Circle);
      city.radius = 5;
      city.fill = am4core.color("#f00");
      city.strokeWidth = 2;
      city.stroke = am4core.color("#fff");

      // Add city tooltips
      citySeries.mapImages.template.tooltipText = "{title}";

      // Set cities based on connection data
      const cityData = [];
      const uniqueCountries = new Set();

      if (connectionData && connectionData.length > 0) {
        connectionData.forEach(conn => {
          if (conn.srcLongitude && conn.srcLatitude && !uniqueCountries.has(conn.source)) {
            cityData.push({
              title: conn.source,
              latitude: conn.srcLatitude,
              longitude: conn.srcLongitude
            });
            uniqueCountries.add(conn.source);
          }

          if (conn.dstLongitude && conn.dstLatitude && !uniqueCountries.has(conn.target)) {
            cityData.push({
              title: conn.target,
              latitude: conn.dstLatitude,
              longitude: conn.dstLongitude
            });
            uniqueCountries.add(conn.target);
          }
        });
      }

      citySeries.mapImages.template.propertyFields.latitude = "latitude";
      citySeries.mapImages.template.propertyFields.longitude = "longitude";
      citySeries.data = cityData;

      // Configure line series with arrows
      const lineSeries = chart.series.push(new am4maps.MapArcSeries());
      lineSeries.mapLines.template.line.strokeWidth = 2;
      lineSeries.mapLines.template.line.stroke = am4core.color("#e03e96");
      lineSeries.mapLines.template.line.strokeOpacity = 0.5;
      lineSeries.mapLines.template.line.nonScalingStroke = true;

      // Add arrows
      const arrow = lineSeries.mapLines.template.line.strokeDasharray = "1,1";
      lineSeries.mapLines.template.line.events.on("inited", function (event) {
        event.target.strokeDasharray = "1,1";
      });

      // Add line tooltips
      lineSeries.mapLines.template.tooltipText = "{source} → {target}: {value} event(s)";

      // Add lines based on connection data
      if (connectionData && connectionData.length > 0) {
        const lines = connectionData.map(conn => {
          return {
            geometry: {
              type: "LineString",
              coordinates: [
                { longitude: conn.srcLongitude, latitude: conn.srcLatitude },
                { longitude: conn.dstLongitude, latitude: conn.dstLatitude }
              ]
            },
            source: conn.source,
            target: conn.target,
            value: conn.value
          };
        });

        lineSeries.data = lines;
      }

      chartRef.current = chart;

      return () => {
        chart.dispose();
      };
    }, [connectionData]);

    return (
      <Box id="chartdiv" style={{ width: "100%", height: "600px" }}></Box>
    );
  };

  // Replace the Sankey chart with a Chord diagram
  const connectionMapOption = {
    title: {
      text: 'Country Connection Map',
      left: 'center'
    },
    tooltip: {
      trigger: 'item',
      formatter: function (param) {
        if (param.data && param.data.source && param.data.target) {
          return `${param.data.source} → ${param.data.target}: ${param.data.value} event(s)`;
        }
        return param.name;
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
      data: Array.from(new Set([
        ...(visualizationData?.connectionData || []).map(item => item.source),
        ...(visualizationData?.connectionData || []).map(item => item.target)
      ])).sort(),
      axisLabel: {
        interval: 0,
        rotate: 45
      }
    },
    yAxis: {
      type: 'category',
      data: Array.from(new Set([
        ...(visualizationData?.connectionData || []).map(item => item.source),
        ...(visualizationData?.connectionData || []).map(item => item.target)
      ])).sort(),
      axisLabel: {
        interval: 0
      }
    },
    series: [
      {
        name: 'Connections',
        type: 'scatter',
        symbolSize: function (val) {
          return Math.sqrt(val[2]) * 3;
        },
        data: (visualizationData?.connectionData || []).map(item => {
          const srcIndex = Array.from(new Set([
            ...(visualizationData?.connectionData || []).map(i => i.source),
            ...(visualizationData?.connectionData || []).map(i => i.target)
          ])).sort().indexOf(item.source);

          const targetIndex = Array.from(new Set([
            ...(visualizationData?.connectionData || []).map(i => i.source),
            ...(visualizationData?.connectionData || []).map(i => i.target)
          ])).sort().indexOf(item.target);

          return [srcIndex, targetIndex, item.value, item.source, item.target];
        }),
        emphasis: {
          label: {
            show: true,
            formatter: function (param) {
              return param.data[3] + ' → ' + param.data[4];
            },
            position: 'top'
          }
        },
        label: {
          show: false
        },
        itemStyle: {
          color: function (params) {
            return '#' +
              Math.floor(Math.random() * 256).toString(16).padStart(2, '0') +
              Math.floor(Math.random() * 256).toString(16).padStart(2, '0') +
              Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
          }
        }
      },
      {
        name: 'Lines',
        type: 'lines',
        coordinateSystem: 'cartesian2d',
        zlevel: 1,
        effect: {
          show: true,
          smooth: true,
          period: 6,
          trailLength: 0.5,
          symbol: 'arrow',
          symbolSize: 8
        },
        lineStyle: {
          width: function (params) {
            return Math.log(params.data.value) + 1;
          },
          color: 'rgb(200, 45, 45)',
          opacity: 0.6,
          curveness: 0.5
        },
        data: (visualizationData?.connectionData || []).map(item => {
          const srcIndex = Array.from(new Set([
            ...(visualizationData?.connectionData || []).map(i => i.source),
            ...(visualizationData?.connectionData || []).map(i => i.target)
          ])).sort().indexOf(item.source);

          const targetIndex = Array.from(new Set([
            ...(visualizationData?.connectionData || []).map(i => i.source),
            ...(visualizationData?.connectionData || []).map(i => i.target)
          ])).sort().indexOf(item.target);

          return {
            coords: [[srcIndex, targetIndex], [targetIndex, srcIndex]],
            value: item.value,
            source: item.source,
            target: item.target
          };
        })
      }
    ]
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Threat Hunting
      </Typography>
      <Typography variant="body1" paragraph>
        This page displays security events and traffic patterns for threat analysis.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* View toggle buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Button
            variant={view === 'dashboard' ? 'contained' : 'outlined'}
            startIcon={<DashboardIcon />}
            onClick={() => setView('dashboard')}
            sx={{ mr: 2 }}
          >
            Dashboard
          </Button>
          <Button
            variant={view === 'events' ? 'contained' : 'outlined'}
            startIcon={<TableViewIcon />}
            onClick={() => setView('events')}
          >
            Events
          </Button>
        </Box>

        {/* Search and filter controls could go here */}
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Dashboard View */}
          {view === 'dashboard' && visualizationData && (
            <Paper sx={{ mb: 4, p: 2 }}>
              <Tabs
                value={activeTab}
                onChange={(e, newValue) => setActiveTab(newValue)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ mb: 2 }}
              >
                <Tab label="Overview" />
                <Tab label="Countries" />
                <Tab label="Services & Apps" />
                <Tab label="Timeline" />
                <Tab label="Connection Map" />
              </Tabs>

              {/* Overview Tab */}
              {activeTab === 0 && (
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <ReactECharts option={actionChartOption} style={{ height: '350px' }} />
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <ReactECharts option={directionChartOption} style={{ height: '350px' }} />
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              )}

              {/* Countries Tab */}
              {activeTab === 1 && (
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <ReactECharts option={srcCountryChartOption} style={{ height: '500px' }} />
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <ReactECharts option={dstCountryChartOption} style={{ height: '500px' }} />
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              )}

              {/* Services & Apps Tab */}
              {activeTab === 2 && (
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <ReactECharts option={serviceChartOption} style={{ height: '500px' }} />
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <ReactECharts option={appCategoryChartOption} style={{ height: '500px' }} />
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              )}

              {/* Timeline Tab */}
              {activeTab === 3 && (
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Card>
                      <CardContent>
                        <ReactECharts option={timelineChartOption} style={{ height: '400px' }} />
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              )}

// In the Connection Map Tab section:
              {activeTab === 4 && (
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Card>
                      <CardContent>
                        {visualizationData?.connectionData && visualizationData.connectionData.length > 0 ? (
                          <WorldConnectionMap connectionData={visualizationData.connectionData} />
                        ) : (
                          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '600px' }}>
                            <Typography variant="body1">
                              No connection data available or coordinates for countries not defined.
                            </Typography>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Add fallback ECharts map if needed */}
                  {visualizationData?.connectionData && visualizationData.connectionData.length > 0 &&
                    !visualizationData.connectionData.some(conn => conn.srcLongitude && conn.dstLongitude) && (
                      <Grid item xs={12} mt={3}>
                        <Card>
                          <CardContent>
                            <Typography variant="h6" gutterBottom>Alternative Connection Visualization</Typography>
                            <ReactECharts option={connectionMapOption} style={{ height: '600px' }} />
                          </CardContent>
                        </Card>
                      </Grid>
                    )}
                </Grid>
              )}
            </Paper>
          )}

          {/* Events View (Table) */}
          {view === 'events' && (
            <>
              {logs.length === 0 ? (
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="h6">No threat events found</Typography>
                  <Typography variant="body2" color="textSecondary">
                    There are currently no threat events to display.
                  </Typography>
                </Paper>
              ) : (
                <>
                  <TableContainer component={Paper} sx={{ mb: 3 }}>
                    <Table sx={{ minWidth: 650 }} aria-label="threat events table">
                      <TableHead>
                        <TableRow>
                          <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Timestamp</TableCell>
                          <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Agent Name</TableCell>
                          <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Action</TableCell>
                          <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Source</TableCell>
                          <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Destination</TableCell>
                          <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Application</TableCell>
                          <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Message</TableCell>
                          <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {logs.map((log) => (
                          <TableRow key={log._id || log.id || Math.random().toString()} hover>
                            <TableCell>{formatTimestamp(log.timestamp)}</TableCell>
                            <TableCell>{log.agent?.name || 'Unknown'}</TableCell>
                            <TableCell>
                              <Chip
                                label={log.traffic?.action || 'N/A'}
                                color={getActionColor(log.traffic?.action)}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              {log.network?.srcIp !== 'N/A' ? log.network.srcIp : 'N/A'}
                              {log.traffic?.srcCountry !== 'N/A' && ` (${log.traffic.srcCountry})`}
                            </TableCell>
                            <TableCell>
                              {log.network?.destIp !== 'N/A' ? log.network.destIp : 'N/A'}
                              {log.traffic?.dstCountry !== 'N/A' && ` (${log.traffic.dstCountry})`}
                            </TableCell>
                            <TableCell>
                              {log.traffic?.app !== 'N/A' ? log.traffic.app : 'N/A'}
                              {log.traffic?.appcat !== 'N/A' && ` (${log.traffic.appcat})`}
                            </TableCell>
                            <TableCell>{log.traffic?.msg || 'N/A'}</TableCell>
                            <TableCell>
                              <Link
                                component="button"
                                variant="body2"
                                onClick={() => handleViewDetails(log)}
                                sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                              >
                                View Details
                              </Link>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {/* Pagination for logs table */}
                  <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                    <Pagination
                      count={totalPages}
                      page={page}
                      onChange={(event, value) => setPage(value)}
                      color="primary"
                    />
                  </Box>
                </>
              )}
            </>
          )}

          {/* Log Details Dialog */}
          <Dialog
            open={selectedLog !== null}
            onClose={() => setSelectedLog(null)}
            fullWidth
            maxWidth="md"
          >
            {selectedLog && (
              <>
                <DialogTitle>
                  Log Details
                  <IconButton
                    aria-label="close"
                    onClick={() => setSelectedLog(null)}
                    sx={{
                      position: 'absolute',
                      right: 8,
                      top: 8,
                      color: (theme) => theme.palette.grey[500],
                    }}
                  >
                    <CloseIcon />
                  </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Timestamp: {formatTimestamp(selectedLog.timestamp)}
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2">Agent Information</Typography>
                        <Typography>Name: {selectedLog.agent?.name || 'N/A'}</Typography>
                        <Typography>ID: {selectedLog.agent?.id || 'N/A'}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2">Action</Typography>
                        <Chip
                          label={selectedLog.traffic?.action || 'N/A'}
                          color={getActionColor(selectedLog.traffic?.action)}
                        />
                      </Grid>
                    </Grid>
                  </Box>

                  {/* Structured Log View Component */}
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    Structured Log Data
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f9f9f9' }}>
                    <StructuredLogView log={selectedLog} />
                  </Paper>

                  {/* Raw Log Section */}
                  <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                    Raw Log
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f9f9f9', overflowX: 'auto' }}>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {JSON.stringify(selectedLog.rawLog || selectedLog, null, 2)}
                    </pre>
                  </Paper>
                </DialogContent>
              </>
            )}
          </Dialog>
        </>
      )}
    </Box>
  );
};

export default ThreatHunting;