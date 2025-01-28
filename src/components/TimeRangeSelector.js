import React from 'react';
import { 
  Box, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem,
  Button,
  Stack
} from '@mui/material';
import { Stop } from '@mui/icons-material';

const TimeRangeSelector = ({ 
  timeRange, 
  setTimeRange, 
  updateInterval, 
  setUpdateInterval,
  isUpdating,
  setIsUpdating
}) => {
  const timeRanges = [
    { value: 300, label: '5 minutes' },
    { value: 900, label: '15 minutes' },
    { value: 1800, label: '30 minutes' },
    { value: 3600, label: '1 hour' },
    { value: 7200, label: '2 hours' },
    { value: 14400, label: '4 hours' },
    { value: 28800, label: '8 hours' },
    { value: 86400, label: '24 hours' }
  ];

  const updateIntervals = [
    { value: 5000, label: '5 seconds' },
    { value: 10000, label: '10 seconds' },
    { value: 30000, label: '30 seconds' },
    { value: 60000, label: '1 minute' },
    { value: 300000, label: '5 minutes' }
  ];

  return (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 3 }}>
      <Stack direction="row" spacing={2} sx={{ width: '100%' }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Time Range</InputLabel>
          <Select
            value={timeRange}
            label="Time Range"
            onChange={(e) => setTimeRange(e.target.value)}
          >
            {timeRanges.map((range) => (
              <MenuItem key={range.value} value={range.value}>
                {range.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Update Interval</InputLabel>
          <Select
            value={updateInterval}
            label="Update Interval"
            onChange={(e) => setUpdateInterval(e.target.value)}
            disabled={!isUpdating}
          >
            {updateIntervals.map((interval) => (
              <MenuItem key={interval.value} value={interval.value}>
                {interval.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          variant={isUpdating ? "contained" : "outlined"}
          color={isUpdating ? "error" : "primary"}
          onClick={() => setIsUpdating(!isUpdating)}
          startIcon={isUpdating && <Stop />}
        >
          {isUpdating ? "Stop Updates" : "Start Updates"}
        </Button>
      </Stack>
    </Box>
  );
};

export default TimeRangeSelector;