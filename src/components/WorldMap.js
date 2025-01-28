// src/components/WorldMap.js
import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import 'echarts-gl';

const WorldMap = ({ logs }) => {
  const chartRef = useRef(null);

  useEffect(() => {
    if (!chartRef.current || !Array.isArray(logs)) return;

    const chart = echarts.init(chartRef.current);

    // Filter and transform log data for visualization
    const connections = logs
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
      }));

    // Create unique points for all locations
    const locationPoints = new Set();
    connections.forEach(conn => {
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
          data: connections
        }
      ]
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