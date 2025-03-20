// src/components/WorldMap.js
import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import 'echarts-gl';

const WorldMap = ({ logs, countryConnections = [] }) => {
  const chartRef = useRef(null);

  const countryCoordinates = {
    'United States': [-95.7129, 37.0902],
    'China': [104.1954, 35.8617],
    'Russia': [105.3188, 61.5240],
    'Germany': [10.4515, 51.1657],
    'United Kingdom': [-3.4359, 55.3781],
    'France': [2.2137, 46.2276],
    'Japan': [138.2529, 36.2048],
    'India': [78.9629, 20.5937],
    'Brazil': [-51.9253, -14.2350],
    'Canada': [-106.3468, 56.1304],
    'Australia': [133.7751, -25.2744],
    'Italy': [12.5674, 41.8719],
    'South Korea': [127.7669, 35.9078],
    'Spain': [-3.7492, 40.4637],
    'Mexico': [-102.5528, 23.6345],
    'Reserved': [78.0000, 20.0000],
    // Add more countries as needed
  };

  useEffect(() => {
    if (!chartRef.current) return;

    const chart = echarts.init(chartRef.current);

    // Filter and transform log data for visualization
    // Process IP-level connections (existing logic)
  const ipConnections = Array.isArray(logs) ? logs
  .filter(log => {
    const hasSrcLocation = log.srcLocation?.latitude && log.srcLocation?.longitude;
    const hasDestLocation = log.destLocation?.latitude && log.destLocation?.longitude;
    return hasSrcLocation && hasDestLocation;
  })
  .map(log => ({
    coords: [
      [log.srcLocation.longitude, log.srcLocation.latitude],
      [log.destLocation.longitude, log.destLocation.latitude]
    ],
    value: 1,
    sourceIP: log.srcIp,
    targetIP: log.destIp
  })) : [];

// Process country-level connections
const countryLines = countryConnections.map(conn => {
  const srcCoords = countryCoordinates[conn.source] || [0, 0];
  const destCoords = countryCoordinates[conn.target] || [0, 0];
  
  return {
    coords: [
      [srcCoords[0], srcCoords[1]],
      [destCoords[0], destCoords[1]]
    ],
    value: conn.value,
    sourceCountry: conn.source,
    targetCountry: conn.target,
    lineStyle: {
      width: Math.min(Math.max(Math.log(conn.value) * 2, 1), 5), // Scale line width based on value
      color: conn.value > 10 ? '#ff5722' : '#0098d9' // Higher traffic gets different color
    }
  };
});

// Combine all connections for visualization
const allConnections = [...ipConnections, ...countryLines];

// Create unique points for all locations
const locationPoints = new Set();
allConnections.forEach(conn => {
  conn.coords.forEach(coord => {
    locationPoints.add(JSON.stringify(coord));
  });
});

const points = Array.from(locationPoints).map(point => {
  const [lng, lat] = JSON.parse(point);
  return {
    value: [lng, lat, 1],
    symbolSize: 5
  };
});

// Add country name labels
const countryLabels = Object.entries(countryCoordinates).map(([name, coords]) => ({
  name,
  value: [...coords, 1],
  country: name
}));

    const option = {
      backgroundColor: '#000',
      globe: {
        environment: '#000',
        baseTexture: '/textures/world.topo.bathy.200401.jpg',
        heightTexture: '/textures/world.topo.bathy.200401.jpg',
        displacementScale: 0.04,
        shading: 'realistic',
        realisticMaterial: {
          roughness: 0.9,
        },
        postEffect: {
          enable: true,
          bloom: {
            enable: true
          }
        },
        light: {
          main: {
            intensity: 2,
            shadow: true
          },
          ambient: {
            intensity: 0.3
          }
        },
        viewControl: {
          autoRotate: true,
          autoRotateSpeed: 1,
          distance: 200
        }
      },
      series: [
        // Points for locations
        {
          type: 'scatter3D',
          coordinateSystem: 'globe',
          blendMode: 'lighter',
          symbolSize: 2,
          itemStyle: {
            color: '#4fc3f7',
            opacity: 1
          },
          data: points
        },
        // Country labels
        {
          type: 'scatter3D',
          coordinateSystem: 'globe',
          blendMode: 'lighter',
          symbolSize: 0, // Hide the point
          label: {
            show: true,
            formatter: (params) => params.data.country,
            position: 'right',
            textStyle: {
              color: '#fff',
              fontSize: 12,
              backgroundColor: 'rgba(0,0,0,0.5)',
              padding: [3, 5]
            }
          },
          data: countryLabels
        },
        // Lines for connections
        {
          type: 'lines3D',
          coordinateSystem: 'globe',
          effect: {
            show: true,
            period: 2,
            trailWidth: 2,
            trailLength: 0.2,
            trailOpacity: 0.4,
            trailColor: '#0098d9'
          },
          lineStyle: {
            width: 1,
            color: '#0098d9',
            opacity: 0.1
          },
          data: allConnections
        }
      ],
      tooltip: {
        show: true,
        formatter: (params) => {
          if (params.data.sourceCountry && params.data.targetCountry) {
            return `${params.data.sourceCountry} → ${params.data.targetCountry}<br/>Events: ${params.data.value}`;
          } else if (params.data.sourceIP && params.data.targetIP) {
            return `${params.data.sourceIP} → ${params.data.targetIP}`;
          } else if (params.data.country) {
            return params.data.country;
          }
          return '';
        }
      }
    };

    chart.setOption(option);

    const handleResize = () => {
      chart.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      chart.dispose();
      window.removeEventListener('resize', handleResize);
    };
  }, [logs]);

  return (
    <div
      ref={chartRef}
      style={{
        width: '100%',
        height: '400px',
        marginBottom: '20px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        backgroundColor: '#000'
      }}
    />
  );
};

export default WorldMap;