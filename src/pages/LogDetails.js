import React, { useState, useEffect, useCallback, useRef } from 'react';
import { debounce } from 'lodash';
import {
  Box, Typography, Paper, Alert, TextField, InputAdornment, CircularProgress, Dialog, DialogTitle, DialogContent, IconButton, FormControl, InputLabel, Select, MenuItem, Grid
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import CloseIcon from '@mui/icons-material/Close';
import PauseIcon from '@mui/icons-material/Pause';
import { DataGrid } from '@mui/x-data-grid';
import { API_URL } from '../config';
import { parseLogMessage, StructuredLogView } from '../utils/normalizeLogs';
import { useTheme } from '@mui/material/styles';
import { Chip } from '@mui/material';

const LogDetails = () => {
  const [logs, setLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0); // DataGrid uses 0-based indexing
  const [pageSize, setPageSize] = useState(100);
  const [totalRows, setTotalRows] = useState(0);
  const [selectedLog, setSelectedLog] = useState(null);
  const [logType, setLogType] = useState('all');
  const [refreshInterval, setRefreshInterval] = useState('paused');
  const refreshTimerRef = useRef(null);

  const theme = useTheme();

  const getRuleLevelColor = (level) => {
    const numLevel = parseInt(level);
    if (numLevel >= 17) return 'error';
    if (numLevel >= 12) return 'error';
    if (numLevel >= 8) return 'warning';
    if (numLevel >= 4) return 'info';
    return 'success';
  };

  const getRuleLevelLabel = (level) => {
    const numLevel = parseInt(level);
    if (numLevel >= 17) return 'Severe';
    if (numLevel >= 12) return 'Critical';
    if (numLevel >= 8) return 'High';
    if (numLevel >= 4) return 'Medium';
    return 'Low';
  };

  const formatTimestamp = (timestamp) => {
    try {
      if (typeof timestamp === 'number') {
        return new Date(timestamp * 1000).toLocaleString();
      }
      return new Date(timestamp).toLocaleString();
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'Invalid Date';
    }
  };

  const fetchLogs = useCallback(async (currentPage, pageLimit, search, type) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      // Converting to 1-indexed for the API
      const apiPage = currentPage + 1;
      const response = await fetch(
        `${API_URL}/api/logs?page=${apiPage}&limit=${pageLimit}&search=${search}&logType=${type}&ruleLevel=all`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }

      const data = await response.json();
      // Add id field for DataGrid
      const logsWithIds = (data.logs || []).map((log, index) => {
        const parsedLog = parseLogMessage(log);
        return {
          ...log,
          id: index + (currentPage * pageLimit),
          // Add extracted fields for DataGrid filtering
          extractedTimestamp: formatTimestamp(parsedLog.timestamp),
          extractedAgentName: parsedLog.agent.name,
          extractedRuleLevel: parsedLog.rule.level,
          extractedSrcIp: parsedLog.network.srcIp,
          extractedDescription: parsedLog.rule.description
        };
      });
      setLogs(logsWithIds);
      setTotalRows(data.pagination?.total || 0);
    } catch (error) {
      console.error('Error fetching logs:', error);
      setError('Failed to fetch logs. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  const debouncedSearch = useCallback(
    debounce((searchValue, logTypeValue) => {
      setPage(0);
      fetchLogs(0, pageSize, searchValue, logTypeValue);
    }, 500),
    [fetchLogs, pageSize]
  );

  useEffect(() => {
    debouncedSearch(searchTerm, logType);
  }, [searchTerm, logType, debouncedSearch]);

  // Set up auto-refresh mechanism
  useEffect(() => {
    if (refreshInterval !== 'paused') {
      let milliseconds;
      switch (refreshInterval) {
        case '10s': milliseconds = 10000; break;
        case '20s': milliseconds = 20000; break;
        case '1m': milliseconds = 60000; break;
        case '5m': milliseconds = 300000; break;
        default: milliseconds = null;
      }

      if (milliseconds) {
        refreshTimerRef.current = setInterval(() => {
          // Always fetch the current page with current filters
          fetchLogs(page, pageSize, searchTerm, logType);
        }, milliseconds);
      }
    }

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [refreshInterval, fetchLogs, page, pageSize, searchTerm, logType]);

  // Fetch logs on initial load to show most recent logs
  useEffect(() => {
    fetchLogs(0, pageSize, searchTerm, logType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePageChange = (newPage) => {
    setPage(newPage);
    fetchLogs(newPage, pageSize, searchTerm, logType);
  };

  const handlePageSizeChange = (newPageSize) => {
    setPageSize(newPageSize);
    setPage(0);
    fetchLogs(0, newPageSize, searchTerm, logType);
  };

  const handleLogTypeChange = (event) => {
    setLogType(event.target.value);
  };

  const handleRefreshIntervalChange = (event, newInterval) => {
    if (newInterval !== null) {
      setRefreshInterval(newInterval);
    }
  };

  const handleClickOpen = (params) => {
    try {
      // Safety check for params
      if (!params) {
        console.error('No params provided to handleClickOpen');
        return;
      }

      // Get the ID either directly from params or from params.row
      const logId = params.id || (params.row && params.row.id);

      if (logId === undefined || logId === null) {
        console.error('Could not determine log ID from params', params);
        return;
      }

      const log = logs.find(log => log.id === logId);

      if (!log) {
        console.error(`Log with ID ${logId} not found`);
        return;
      }

      const parsedLog = parseLogMessage(log);

      if (!parsedLog) {
        console.error('Failed to parse log', log);
        return;
      }

      setSelectedLog(parsedLog);
    } catch (error) {
      console.error('Error in handleClickOpen:', error);
    }
  };

  const handleClose = () => {
    setSelectedLog(null);
  };

  // DataGrid column definitions
  const columns = [
    {
      field: 'timestamp',
      headerName: 'Timestamp',
      flex: 1.5,
      filterable: true,
      renderCell: (params) => {
        const parsedLog = parseLogMessage(params.row);
        return formatTimestamp(parsedLog.timestamp);
      }
    },
    // In your columns definition for agent column
    {
      field: 'agent',
      headerName: 'Agent Name',
      flex: 1,
      filterable: true,
      valueGetter: (params) => {
        try {
          const parsedLog = parseLogMessage(params.row);
          return parsedLog?.agent?.name || 'Unknown';
        } catch (error) {
          console.error('Error parsing agent name:', error);
          return 'Unknown';
        }
      },
      renderCell: (params) => {
        try {
          const parsedLog = parseLogMessage(params.row);
          return parsedLog?.agent?.name || 'Unknown';
        } catch (error) {
          console.error('Error rendering agent name:', error);
          return 'Unknown';
        }
      }
    },
    {
      field: 'ruleLevel',
      headerName: 'Rule Level',
      flex: 1,
      filterable: true,
      valueGetter: (params) => {
        try {
          if (!params || !params.row) return 'Unknown';
          const parsedLog = parseLogMessage(params.row);
          if (!parsedLog || !parsedLog.rule) return 'Unknown';
          return `${parsedLog.rule.level || 0} - ${getRuleLevelLabel(parsedLog.rule.level || 0)}`;
        } catch (error) {
          console.error('Error getting rule level value:', error);
          return 'Unknown';
        }
      },
      renderCell: (params) => {
        try {
          if (!params || !params.row) return 'Unknown';
          const parsedLog = parseLogMessage(params.row);
          if (!parsedLog || !parsedLog.rule) return 'Unknown';
          const level = parsedLog.rule.level || 0;

          return (
            <Chip
              label={`${level} - ${getRuleLevelLabel(level)}`}
              color={getRuleLevelColor(level)}
              size="small"
              sx={{
                height: '24px',
                backgroundColor: theme.palette[getRuleLevelColor(level)].main,
                color: theme.palette[getRuleLevelColor(level)].contrastText
              }}
            />
          );
        } catch (error) {
          console.error('Error rendering rule level:', error);
          return 'Unknown';
        }
      }
    },
    {
      field: 'srcIp',
      headerName: 'Source IP',
      filterable: true,
      flex: 1,
      renderCell: (params) => {
        const parsedLog = parseLogMessage(params.row);
        return parsedLog.network.srcIp;
      }
    },
    {
      field: 'description',
      headerName: 'Description',
      filterable: true,
      flex: 2,
      renderCell: (params) => {
        const parsedLog = parseLogMessage(params.row);
        return parsedLog.rule.description;
      }
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 0.7,
      sortable: false,
      renderCell: (params) => (
        <Box
          component="span"
          sx={{
            textDecoration: 'underline',
            color: theme.palette.primary.main,
            cursor: 'pointer'
          }}
          onClick={(event) => {
            event.stopPropagation();
            handleClickOpen(params);
          }}
        >
          View Details
        </Box>
      )
    }
  ];

  if (loading && !logs.length) {
    return (
      <Box p={4} display="flex" justifyContent="center" alignItems="center">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={4}>
      <Typography variant="h4" gutterBottom>
        Log Details
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <FormControl variant="outlined" fullWidth>
            <InputLabel id="log-type-label">Log Type</InputLabel>
            <Select
              labelId="log-type-label"
              value={logType}
              onChange={handleLogTypeChange}
              label="Log Type"
            >
              <MenuItem value="all">All Logs</MenuItem>
              <MenuItem value="fortigate">Fortigate Logs</MenuItem>
              <MenuItem value="other">Suricata/Sysmon Logs</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={3}>
          <FormControl fullWidth>
            <InputLabel id="refresh-interval-label">Auto Refresh</InputLabel>
            <Select
              labelId="refresh-interval-label"
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(e.target.value)}
              label="Auto Refresh"
            >
              <MenuItem value="paused">
                <Box display="flex" alignItems="center">
                  <PauseIcon fontSize="small" sx={{ mr: 1 }} />
                  Update Paused
                </Box>
              </MenuItem>
              <MenuItem value="10s">Every 10 seconds</MenuItem>
              <MenuItem value="20s">Every 20 seconds</MenuItem>
              <MenuItem value="1m">Every 1 minute</MenuItem>
              <MenuItem value="5m">Every 5 minutes</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
      </Grid>

      <Paper sx={{ height: 'calc(100vh - 300px)', width: '100%' }}>
        <DataGrid
          rows={logs}
          columns={columns}
          pagination
          paginationMode="server"
          rowCount={totalRows}
          page={page}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          rowsPerPageOptions={[25, 50, 100]}
          disableSelectionOnClick
          loading={loading}
          filterMode="server"
          disableColumnFilter={false}
          // In your onFilterModelChange handler
          onFilterModelChange={(newFilterModel) => {
            // Check if newFilterModel and items exist before accessing
            if (newFilterModel && newFilterModel.items && newFilterModel.items.length > 0) {
              const filterItem = newFilterModel.items[0];
              // Only update if we have a valid filter
              if (filterItem && filterItem.value) {
                setSearchTerm(filterItem.value);
              }
            } else if (searchTerm) {
              // Clear search when filters are reset
              setSearchTerm('');
            }
          }}
          onRowClick={(params, event) => {
            // Only open dialog if not clicking on the action link
            if (!event.target.closest('.MuiDataGrid-cell:last-child')) {
              handleClickOpen(params);
            }
          }}
          sx={{
            '& .MuiDataGrid-cell': {
              cursor: 'pointer'
            }
          }}
        />
      </Paper>

      <Dialog
        open={Boolean(selectedLog)}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Log Details
          <IconButton
            aria-label="close"
            onClick={handleClose}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedLog ? (
            <StructuredLogView data={selectedLog} />
          ) : (
            <Typography>No log details available</Typography>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default LogDetails;