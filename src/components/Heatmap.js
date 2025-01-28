// src/components/Heatmap.js
import React from 'react';
import { ResponsiveHeatMap } from '@nivo/heatmap';

const Heatmap = ({ data }) => {
  return (
    <div style={{ height: '400px' }}>
      <ResponsiveHeatMap
        data={data}
        keys={['count']}
        indexBy="time"
        margin={{ top: 50, right: 90, bottom: 60, left: 90 }}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: -45,
          legend: 'Time',
          legendPosition: 'middle',
          legendOffset: 60
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: 'Log Level',
          legendPosition: 'middle',
          legendOffset: -72
        }}
        colors={{
          type: 'sequential',
          scheme: 'reds'
        }}
      />
    </div>
  );
};

export default Heatmap;