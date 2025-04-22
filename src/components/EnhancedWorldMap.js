import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, IconButton, Dialog, Card, CardContent, CircularProgress, Grid, useTheme } from '@mui/material';
import * as am4core from "@amcharts/amcharts4/core";
import * as am4maps from "@amcharts/amcharts4/maps";
import am4geodata_worldLow from "@amcharts/amcharts4-geodata/worldLow";
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import CloseIcon from '@mui/icons-material/Close';
import { parseLogMessage } from '../utils/normalizeLogs';
import { API_URL } from '../config';

// Country coordinates mapping for mapping IP locations
const countryCoordinates = {
  "United States": { latitude: 39.7837304, longitude: -100.4458825 }, "India": { latitude: 20.5937, longitude: 78.9629 },
  "Germany": { latitude: 51.1657, longitude: 10.4515 }, "France": { latitude: 46.6034, longitude: 1.8883 }, "Netherlands": { latitude: 52.1326, longitude: 5.2913 },
  "Singapore": { latitude: 1.3521, longitude: 103.8198 }, "Japan": { latitude: 36.2048, longitude: 138.2529 }, "Luxembourg": { latitude: 49.8153, longitude: 6.1296 },
  "Reserved": { latitude: -5.0000, longitude: 73.5000 }, "China": { latitude: 35.8617, longitude: 104.1954 }, "United Kingdom": { latitude: 55.3781, longitude: -3.4360 },
  "Canada": { latitude: 56.1304, longitude: -106.3468 }, "Australia": { latitude: -25.2744, longitude: 133.7751 }, "Brazil": { latitude: -14.2350, longitude: -51.9253 },
  "Russian Federation": { latitude: 61.5240, longitude: 105.3188 }, "South Korea": { latitude: 35.9078, longitude: 127.7669 }, "Italy": { latitude: 41.8719, longitude: 12.5674 },
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
  "Iran, Islamic Republic of": { latitude: 32.4279, longitude: 53.688 }, "Iraq": { latitude: 33.2232, longitude: 43.6793 }, "Ireland": { latitude: 53.4129, longitude: -8.2439 },
  "Israel": { latitude: 31.0461, longitude: 34.8516 }, "Jamaica": { latitude: 18.1096, longitude: -77.2975 }, "Jordan": { latitude: 30.5852, longitude: 36.2384 },
  "Kazakhstan": { latitude: 48.0196, longitude: 66.9237 }, "Kuwait": { latitude: 29.3117, longitude: 47.4818 }, "Latvia": { latitude: 56.8796, longitude: 24.6032 },
  "Lebanon": { latitude: 33.8547, longitude: 35.8623 }, "Lithuania": { latitude: 55.1694, longitude: 23.8813 }, "Madagascar": { latitude: -18.7669, longitude: 46.8691 },
  "Malaysia": { latitude: 4.2105, longitude: 101.9758 }, "Malta": { latitude: 35.9375, longitude: 14.3754 }, "Nepal": { latitude: 28.3949, longitude: 84.124 },
  "New Zealand": { latitude: -40.9006, longitude: 174.886 }, "Norway": { latitude: 60.472, longitude: 8.4689 }, "Pakistan": { latitude: 30.3753, longitude: 69.3451 },
  "Philippines": { latitude: 12.8797, longitude: 121.774 }, "Poland": { latitude: 51.9194, longitude: 19.1451 }, "Portugal": { latitude: 39.3999, longitude: -8.2245 },
  "Sweden": { latitude: 60.1282, longitude: 18.6435 }, "Switzerland": { latitude: 46.8182, longitude: 8.2275 }, "Thailand": { latitude: 15.870, longitude: 100.9925 },
  "Vietnam": { latitude: 14.0583, longitude: 108.2772 }, "United Arab Emirates": { latitude: 23.4241, longitude: 53.8478 }, "Taiwan": { latitude: 23.6978, longitude: 120.9605 },
  "Turkey": { latitude: 38.9637, longitude: 35.2433 }, "Ukraine": { latitude: 48.3794, longitude: 31.1656 }, "Sri Lanka": { latitude: 7.8731, longitude: 80.7718 }
};

const EnhancedWorldMap = () => {
  // Refs for the chart containers
  const worldMapDivRef = useRef(null);
  const fullscreenWorldMapDivRef = useRef(null);
  
  // Refs for the chart instances
  const chartInstanceRef = useRef(null);
  const fullscreenChartInstanceRef = useRef(null);
  
  // Component state
  const [fullscreen, setFullscreen] = useState(false);
  const [connectionData, setConnectionData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mapRendered, setMapRendered] = useState(false);
  
  const theme = useTheme();

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    setFullscreen(!fullscreen);
  };

  // Fetch threat data from API
  useEffect(() => {
    let isMounted = true;
    
    const fetchThreatData = async () => {
      try {
        setLoading(true);
        
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Authentication token not found');
        }

        // Fetch all threat logs for visualization
        const response = await fetch(`${API_URL}/api/logs/threats?limit=0`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        
        // Only update state if component is still mounted
        if (isMounted) {
          // Process logs to create connection data
          processConnectionData(data.logs);
          setError(null);
        }
      } catch (err) {
        console.error('Error fetching threat data for world map:', err);
        if (isMounted) {
          setError('Failed to load map data');
          setConnectionData([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchThreatData();
    const interval = setInterval(fetchThreatData, 30000); // Update every 30 seconds
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Process the logs data to extract connection information
  const processConnectionData = (logs) => {
    if (!logs || logs.length === 0) {
      setConnectionData([]);
      return;
    }

    // Source and destination countries
    const srcCountryMap = {};
    const dstCountryMap = {};
    const srcDestPairs = {};

    // Process each log
    logs.forEach(log => {
      const parsedLog = parseLogMessage(log);
      
      // Process source country
      const srcCountry = parsedLog.traffic?.srcCountry || 'Unknown';
      if (srcCountry !== 'N/A' && srcCountry !== 'Unknown') {
        srcCountryMap[srcCountry] = (srcCountryMap[srcCountry] || 0) + 1;
      }

      // Process destination country
      const dstCountry = parsedLog.traffic?.dstCountry || 'Unknown';
      if (dstCountry !== 'N/A' && dstCountry !== 'Unknown') {
        dstCountryMap[dstCountry] = (dstCountryMap[dstCountry] || 0) + 1;
      }

      // Process source-destination pairs for connection visualization
      if (srcCountry !== 'N/A' && srcCountry !== 'Unknown' &&
          dstCountry !== 'N/A' && dstCountry !== 'Unknown' &&
          countryCoordinates[srcCountry] && countryCoordinates[dstCountry]) {
        const pairKey = `${srcCountry}->${dstCountry}`;
        srcDestPairs[pairKey] = (srcDestPairs[pairKey] || 0) + 1;
      }
    });

    // Create connection data for source -> destination visualization
    const connections = Object.entries(srcDestPairs)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50) // Take top 50 connections
      .map(([pair, value]) => {
        const [source, target] = pair.split('->');
        return {
          source, 
          target, 
          value, 
          srcLatitude: countryCoordinates[source]?.latitude || 0,
          srcLongitude: countryCoordinates[source]?.longitude || 0,
          dstLatitude: countryCoordinates[target]?.latitude || 0,
          dstLongitude: countryCoordinates[target]?.longitude || 0
        };
      })
      // Filter out connections without coordinates
      .filter(conn => {
        return conn.srcLatitude && conn.srcLongitude &&
               conn.dstLatitude && conn.dstLongitude;
      });

    setConnectionData(connections);
  };

  // Create and configure the map
  const createMap = (container) => {
    // Dispose of any existing chart first
    if (container === 'worldMapDiv' && chartInstanceRef.current) {
      chartInstanceRef.current.dispose();
      chartInstanceRef.current = null;
    } else if (container === 'fullscreenWorldMapDiv' && fullscreenChartInstanceRef.current) {
      fullscreenChartInstanceRef.current.dispose();
      fullscreenChartInstanceRef.current = null;
    }
    
    // Create map instance
    const chart = am4core.create(container, am4maps.MapChart);
    
    // Set initial zoom level and center position
    chart.homeZoomLevel = 1.2;
    chart.homeGeoPoint = { longitude: 10, latitude: 20 };
    chart.geodata = am4geodata_worldLow;
    chart.projection = new am4maps.projections.Miller();

    // Create map polygon series
    const polygonSeries = chart.series.push(new am4maps.MapPolygonSeries());
    polygonSeries.useGeodata = true;
    polygonSeries.mapPolygons.template.fill = am4core.color(
      theme.palette.mode === 'dark' ? "#3b3b3b" : "#e2e2e2"
    );
    polygonSeries.mapPolygons.template.stroke = am4core.color(
      theme.palette.mode === 'dark' ? "#555555" : "#ffffff"
    );
    polygonSeries.mapPolygons.template.strokeWidth = 0.5;

    // Configure country hover states
    polygonSeries.mapPolygons.template.tooltipText = "{name}";
    polygonSeries.mapPolygons.template.cursorOverStyle = am4core.MouseCursorStyle.pointer;

    // Add city markers for countries
    const citySeries = chart.series.push(new am4maps.MapImageSeries());
    citySeries.mapImages.template.nonScaling = false;

    const cityTemplate = citySeries.mapImages.template.createChild(am4core.Circle);
    cityTemplate.radius = 5;
    cityTemplate.fill = am4core.color("#3B82F6");
    cityTemplate.strokeWidth = 2;
    cityTemplate.stroke = am4core.color("#ffffff");

    // Add city tooltips
    citySeries.mapImages.template.tooltipText = "{title}";

    // Create a separate series for the server icon (Reserved location)
    const serverSeries = chart.series.push(new am4maps.MapImageSeries());
    serverSeries.mapImages.template.nonScaling = false;

    // Create a server icon
    const serverTemplate = serverSeries.mapImages.template.createChild(am4core.Container);

    // Create a rectangle for server body
    const serverBody = serverTemplate.createChild(am4core.RoundedRectangle);
    serverBody.width = 16;
    serverBody.height = 20;
    serverBody.cornerRadius(2, 2, 2, 2);
    serverBody.fill = am4core.color("#EF4444");
    serverBody.stroke = am4core.color("#9B1C1C");
    serverBody.strokeWidth = 1;

    // Add server details (lines representing server slots)
    for (let i = 1; i <= 3; i++) {
      const line = serverTemplate.createChild(am4core.Rectangle);
      line.width = 10;
      line.height = 1;
      line.fill = am4core.color("#ffffff");
      line.y = i * 4;
      line.x = 3;
    }

    serverSeries.mapImages.template.horizontalCenter = "middle";
    serverSeries.mapImages.template.verticalCenter = "middle";
    serverSeries.zIndex = 1000; // This will place server icons above all other elements
    serverSeries.mapImages.template.zIndex = 1000;
    serverTemplate.zIndex = 1000;
    
    // Center the server icon properly
    serverTemplate.horizontalCenter = "middle";
    serverTemplate.verticalCenter = "middle";

    // Add server tooltip
    serverSeries.mapImages.template.tooltipText = "{title} (Server)";

    // Set cities and server location based on connection data
    const cityData = [];
    const serverData = [];
    const uniqueCountries = new Set();

    if (connectionData && connectionData.length > 0) {
      connectionData.forEach(conn => {
        // Check if source country is "Reserved"
        if (conn.source === "Reserved" && conn.srcLongitude && conn.srcLatitude && !uniqueCountries.has(conn.source)) {
          serverData.push({
            title: conn.source,
            latitude: conn.srcLatitude,
            longitude: conn.srcLongitude
          });
          uniqueCountries.add(conn.source);
        }
        // Otherwise add to normal city data
        else if (conn.srcLongitude && conn.srcLatitude && !uniqueCountries.has(conn.source)) {
          cityData.push({
            title: conn.source,
            latitude: conn.srcLatitude,
            longitude: conn.srcLongitude
          });
          uniqueCountries.add(conn.source);
        }

        // Check if target country is "Reserved"
        if (conn.target === "Reserved" && conn.dstLongitude && conn.dstLatitude && !uniqueCountries.has(conn.target)) {
          serverData.push({
            title: conn.target,
            latitude: conn.dstLatitude,
            longitude: conn.dstLongitude
          });
          uniqueCountries.add(conn.target);
        }
        // Otherwise add to normal city data
        else if (conn.dstLongitude && conn.dstLatitude && !uniqueCountries.has(conn.target)) {
          cityData.push({
            title: conn.target,
            latitude: conn.dstLatitude,
            longitude: conn.dstLongitude
          });
          uniqueCountries.add(conn.target);
        }
      });
    }

    // Set property fields for both series
    citySeries.mapImages.template.propertyFields.latitude = "latitude";
    citySeries.mapImages.template.propertyFields.longitude = "longitude";
    serverSeries.mapImages.template.propertyFields.latitude = "latitude";
    serverSeries.mapImages.template.propertyFields.longitude = "longitude";

    // Set data for both series
    citySeries.data = cityData;
    serverSeries.data = serverData;

    // Create line series for different connection types
    const createLineSeries = (id, color, name) => {
      const series = chart.series.push(new am4maps.MapArcSeries());
      series.id = id;
      series.name = name;
      series.mapLines.template.line.strokeWidth = 2;
      series.mapLines.template.line.stroke = am4core.color(color);
      series.mapLines.template.line.strokeOpacity = 0.7;
      series.mapLines.template.line.nonScalingStroke = true;
      series.zIndex = 10;

      // Increase the hit area for the lines
      series.mapLines.template.interactive = true;
      series.mapLines.template.strokeWidth = 2;
      series.mapLines.template.interactionsEnabled = true;

      // Create a wider invisible stroke for better hover detection
      const hitArea = series.mapLines.template.createChild(am4core.Line);
      hitArea.strokeWidth = 20; // Much wider than the visible line
      hitArea.stroke = am4core.color("#000");
      hitArea.strokeOpacity = 0.0; // Completely transparent
      hitArea.interactiveChildren = false;
      hitArea.isMeasured = false;

      // Make sure the hit area follows the same path as the visible line
      series.mapLines.template.events.on("ready", (event) => {
        const line = event.target;
        const lineElement = line.line;
        const hitAreaElement = line.children.getIndex(0);

        if (lineElement && hitAreaElement) {
          hitAreaElement.path = lineElement.path;
        }
      });

      // Set a larger hit radius for interaction
      series.mapLines.template.interactiveChildren = true;
      series.mapLines.template.line.hitRadius = 30;
      series.mapLines.template.cursorOverStyle = am4core.MouseCursorStyle.pointer;

      // Add curved lines (arcs)
      series.mapLines.template.shortestDistance = false;
      series.mapLines.template.line.controlPointDistance = 0.3;

      // Ensure tooltips are visible and appear quickly
      series.tooltip.pointerOrientation = "vertical";
      series.tooltip.animationDuration = 150;
      series.tooltip.keepTargetHover = true;
      series.tooltip.background.strokeWidth = 0;
      series.tooltip.label.padding(10, 10, 10, 10);

      // Add line tooltips
      series.mapLines.template.tooltipText = "{from} → {to}: {value} event(s)";

      // Modify line thickness based on value
      series.mapLines.template.propertyFields.strokeWidth = "lineThickness";

      // Animation for each line
      series.mapLines.template.line.events.on("inited", (event) => {
        const line = event.target;
        // Set up the animation for each line
        line.strokeDasharray = 10;
        
        // Create animation
        const animation = line.animate(
          { property: "strokeDashoffset", from: 100, to: 0 },
          2000,
          am4core.ease.linear
        );

        // Make it repeat
        animation.events.on("animationended", () => {
          setTimeout(() => {
            animation.start();
          }, 500);
        });
      });

      // Add arrow to line
      const arrow = series.mapLines.template.arrow = new am4core.Triangle();
      arrow.position = 1;
      arrow.direction = "right";
      arrow.stroke = am4core.color(color);
      arrow.fill = am4core.color(color);
      arrow.width = 8;
      arrow.height = 8;

      return series;
    };

    // Create series for each connection type with appropriate colors
    const outgoingFromReservedSeries = createLineSeries("outgoingFromReserved", "#10B981", "Outgoing from Server");
    const incomingThreatSeries = createLineSeries("incomingThreat", "#EF4444", "Incoming Threat (<20 events)");
    const incomingNormalSeries = createLineSeries("incomingNormal", "#3B82F6", "Normal Incoming (≥20 events)");
    const externalSeries = createLineSeries("external", "#F59E0B", "External Connection");

    // Add lines based on connection data
    const outgoingData = [];
    const incomingThreatData = [];
    const incomingNormalData = [];
    const externalData = [];

    if (connectionData && connectionData.length > 0) {
      connectionData.forEach(conn => {
        if (conn.srcLongitude && conn.srcLatitude && conn.dstLongitude && conn.dstLatitude) {
          // Calculate line thickness based on logarithmic scale for better visualization
          const lineThickness = Math.max(1, Math.min(6, 1 + Math.log(conn.value)));

          const lineObject = {
            from: conn.source,
            to: conn.target,
            value: conn.value,
            lineThickness: lineThickness,
            multiGeoLine: [[
              { longitude: conn.srcLongitude, latitude: conn.srcLatitude },
              { longitude: conn.dstLongitude, latitude: conn.dstLatitude }
            ]]
          };

          // Determine which series to add this connection to
          if (conn.source === "Reserved") {
            // Outgoing traffic from Reserved (green lines)
            outgoingData.push(lineObject);
          } else if (conn.target === "Reserved") {
            if (conn.value < 20) {
              // Incoming traffic to Reserved with volume < 20 (red lines - threat)
              incomingThreatData.push(lineObject);
            } else {
              // Incoming traffic to Reserved with volume >= 20 (blue lines - normal)
              incomingNormalData.push(lineObject);
            }
          } else {
            // External connections (yellow lines)
            externalData.push(lineObject);
          }
        }
      });
    }

    // Set data for each series
    outgoingFromReservedSeries.data = outgoingData;
    incomingThreatSeries.data = incomingThreatData;
    incomingNormalSeries.data = incomingNormalData;
    externalSeries.data = externalData;

    // Add zoom control
    chart.zoomControl = new am4maps.ZoomControl();
    chart.zoomControl.slider.height = 100;

    // Create legend
    const legend = new am4maps.Legend();
    legend.parent = chart.chartContainer;
    legend.align = "bottom";
    legend.paddingBottom = 10;
    legend.fontSize = 12;
    legend.useDefaultMarker = true;

    // Make sure all series have proper names for the legend
    outgoingFromReservedSeries.name = "Outgoing from Server";
    incomingThreatSeries.name = "Incoming Threat (<20 events)";
    incomingNormalSeries.name = "Normal Incoming (≥20 events)";
    externalSeries.name = "External Connection";

    // Set colors for legend markers
    outgoingFromReservedSeries.fill = am4core.color("#10B981");
    incomingThreatSeries.fill = am4core.color("#EF4444");
    incomingNormalSeries.fill = am4core.color("#3B82F6");
    externalSeries.fill = am4core.color("#F59E0B");

    // Configure the legend data
    legend.data = [{
      name: "Outgoing from Server", 
      fill: "#10B981"
    }, {
      name: "Incoming Threat (<20 events)", 
      fill: "#EF4444"
    }, {
      name: "Normal Incoming (≥20 events)", 
      fill: "#3B82F6"
    }, {
      name: "External Connection", 
      fill: "#F59E0B"
    }];

    // Make the legend items toggleable and clickable
    legend.itemContainers.template.togglable = true;
    legend.itemContainers.template.clickable = true;
    legend.itemContainers.template.cursorOverStyle = am4core.MouseCursorStyle.pointer;

    // Map the legend items to the corresponding series
    chart.legend = legend;
    legend.parent = chart.chartContainer;

    // Set up click event handler for legend items
    legend.itemContainers.template.events.on("hit", function(ev) {
      const item = ev.target.dataItem.dataContext;
      
      // Toggle the corresponding series visibility
      if (item.name === "Outgoing from Server") {
        outgoingFromReservedSeries.hidden = !outgoingFromReservedSeries.hidden;
      }
      else if (item.name === "Incoming Threat (<20 events)") {
        incomingThreatSeries.hidden = !incomingThreatSeries.hidden;
      }
      else if (item.name === "Normal Incoming (≥20 events)") {
        incomingNormalSeries.hidden = !incomingNormalSeries.hidden;
      }
      else if (item.name === "External Connection") {
        externalSeries.hidden = !externalSeries.hidden;
      }
    });

    return chart;
  };

  // Handle main chart creation and cleanup
  useEffect(() => {
    // Only create the chart if we have data and we're not in loading state
    if (!loading && connectionData.length > 0 && worldMapDivRef.current) {
      // Create our map chart
      const chart = createMap('worldMapDiv');
      chartInstanceRef.current = chart;
      setMapRendered(true);
    }

    // Cleanup function
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose();
        chartInstanceRef.current = null;
      }
    };
  }, [loading, connectionData]);

  // Handle fullscreen chart creation
  useEffect(() => {
    if (fullscreen && connectionData.length > 0 && fullscreenWorldMapDivRef.current) {
      // Create the fullscreen chart after a short delay to ensure the DOM is ready
      const timer = setTimeout(() => {
        if (fullscreenWorldMapDivRef.current) {
          fullscreenChartInstanceRef.current = createMap('fullscreenWorldMapDiv');
        }
      }, 100);
      
      return () => {
        clearTimeout(timer);
        if (fullscreenChartInstanceRef.current) {
          fullscreenChartInstanceRef.current.dispose();
          fullscreenChartInstanceRef.current = null;
        }
      };
    }
  }, [fullscreen, connectionData]);

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
            <Typography variant="h6" fontWeight="medium">
              Global Network Traffic
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
          
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" height="350px">
              <CircularProgress />
              <Typography variant="body1" sx={{ ml: 2 }}>Loading traffic data...</Typography>
            </Box>
          ) : error ? (
            <Box display="flex" justifyContent="center" alignItems="center" height="350px">
              <Typography variant="body1" color="error">{error}</Typography>
            </Box>
          ) : connectionData.length === 0 ? (
            <Box display="flex" justifyContent="center" alignItems="center" height="350px">
              <Typography variant="body1">No network traffic data available</Typography>
            </Box>
          ) : (
            <Box 
              id="worldMapDiv" 
              ref={worldMapDivRef} 
              sx={{ 
                width: "100%", 
                height: "350px",
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)'
              }}
            />
          )}
          
          <Box
            sx={{
              mt: 2,
              p: 1,
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
              borderRadius: 1,
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', m: 0.5 }}>
              <Box sx={{ width: 12, height: 12, bgcolor: '#10B981', mr: 1, borderRadius: '50%' }}></Box>
              <Typography variant="caption">Outgoing</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', m: 0.5 }}>
              <Box sx={{ width: 12, height: 12, bgcolor: '#EF4444', mr: 1, borderRadius: '50%' }}></Box>
              <Typography variant="caption">Threats</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', m: 0.5 }}>
              <Box sx={{ width: 12, height: 12, bgcolor: '#3B82F6', mr: 1, borderRadius: '50%' }}></Box>
              <Typography variant="caption">Normal</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', m: 0.5 }}>
              <Box sx={{ width: 12, height: 12, bgcolor: '#F59E0B', mr: 1, borderRadius: '50%' }}></Box>
              <Typography variant="caption">External</Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Dialog 
        open={fullscreen} 
        onClose={toggleFullscreen} 
        fullWidth 
        maxWidth="xl"
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
            onClick={toggleFullscreen}
            sx={{ position: 'absolute', right: 8, top: 8, zIndex: 10 }}
          >
            <CloseIcon />
          </IconButton>
          <Typography variant="h5" align="center" mb={2} mt={1}>
            Global Network Traffic Map
          </Typography>
          
          <Box 
            id="fullscreenWorldMapDiv" 
            ref={fullscreenWorldMapDivRef} 
            sx={{ 
              width: "100%", 
              height: "calc(90vh - 100px)",
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)'
            }}
          />
        </Box>
      </Dialog>
    </>
  );
};

export default EnhancedWorldMap;