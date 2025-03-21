import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Typography, Box, Paper, Grid, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, TablePagination, Button, Dialog, DialogContent,
  DialogTitle, IconButton, TextField, MenuItem, InputAdornment, Chip
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import FilterListIcon from '@mui/icons-material/FilterList';
import { StructuredLogView, parseLogMessage } from '../utils/normalizeLogs';

const FIM = () => {
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  
  // State variables
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalLogs, setTotalLogs] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [eventFilter, setEventFilter] = useState('');
  const [pathFilter, setPathFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [parsedLog, setParsedLog] = useState(null);

  // Event type options for filtering
  const eventTypes = [
    { value: '', label: 'All Events' },
    { value: 'added', label: 'Added' },
    { value: 'modified', label: 'Modified' },
    { value: 'deleted', label: 'Deleted' }
  ];

  // Fetch logs from the API
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/logs/fim`, {
        params: {
          page: page + 1,
          limit: rowsPerPage,
          search: searchTerm,
          event: eventFilter,
          path: pathFilter
        }
      });
      
      setLogs(response.data.logs);
      setTotalLogs(response.data.totalLogs);
    } catch (error) {
      console.error('Error fetching FIM logs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and when filters change
  useEffect(() => {
    fetchLogs();
  }, [page, rowsPerPage, searchTerm, eventFilter, pathFilter]);

  // Handle page change
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Open log details dialog
  const handleViewLog = (log) => {
    setSelectedLog(log);
    const normalized = parseLogMessage(log);
    setParsedLog(normalized);
    setOpenDialog(true);
  };

  // Close log details dialog
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedLog(null);
  };

  // Get event type chip color
  const getEventColor = (event) => {
    if (!event) return '#9e9e9e';
    
    switch(event.toLowerCase()) {
      case 'added':
        return '#4caf50';
      case 'modified':
        return '#2196f3';
      case 'deleted':
        return '#f44336';
      default:
        return '#9e9e9e';
    }
  };

  // Extract syscheck event from log - ensuring we get the correct event value
  const getSyscheckEvent = (log) => {
    if (log.syscheck && log.syscheck.event) {
      return log.syscheck.event;
    }
    if (log.rawLog && log.rawLog.syscheck && log.rawLog.syscheck.event) {
      return log.rawLog.syscheck.event;
    }
    // Additional paths to check
    if (log.data && log.data.syscheck && log.data.syscheck.event) {
      return log.data.syscheck.event;
    }
    if (log.message && log.message.syscheck && log.message.syscheck.event) {
      return log.message.syscheck.event;
    }
    return 'unknown';
  };

  // Extract syscheck path from log - ensuring we get the correct path value
  const getSyscheckPath = (log) => {
    if (log.syscheck && log.syscheck.path) {
      return log.syscheck.path;
    }
    if (log.rawLog && log.rawLog.syscheck && log.rawLog.syscheck.path) {
      return log.rawLog.syscheck.path;
    }
    // Additional paths to check
    if (log.data && log.data.syscheck && log.data.syscheck.path) {
      return log.data.syscheck.path;
    }
    if (log.message && log.message.syscheck && log.message.syscheck.path) {
      return log.message.syscheck.path;
    }
    return 'N/A';
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch (e) {
      return timestamp;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 'medium' }}>
          File Integrity Monitoring (FIM)
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Monitor file creation, modification, and deletion events captured by syscheck.
        </Typography>
        
        {/* Search and Filters */}
        <Grid container spacing={2} sx={{ mt: 2 }}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              variant="outlined"
              size="small"
              label="Search"
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
          <Grid item xs={12} md={3}>
            <TextField
              select
              fullWidth
              variant="outlined"
              size="small"
              label="Event Type"
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <FilterListIcon />
                  </InputAdornment>
                ),
              }}
            >
              {eventTypes.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={5}>
            <TextField
              fullWidth
              variant="outlined"
              size="small"
              label="File Path"
              value={pathFilter}
              onChange={(e) => setPathFilter(e.target.value)}
              placeholder="Filter by file path"
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Logs Table */}
      <Paper elevation={1}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Timestamp</TableCell>
                <TableCell>Agent</TableCell>
                <TableCell>Event</TableCell>
                <TableCell>File Path</TableCell>
                <TableCell>Rule Level</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body2">Loading logs...</Typography>
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body2">No logs found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => {
                  // Parse log to ensure we get the correct data
                  const parsedLogData = parseLogMessage(log);
                  const eventType = parsedLogData?.syscheck?.event || getSyscheckEvent(log);
                  const filePath = parsedLogData?.syscheck?.path || getSyscheckPath(log);
                  
                  return (
                    <TableRow key={log._id || log.uniqueIdentifier} hover>
                      <TableCell>{formatTimestamp(log.timestamp)}</TableCell>
                      <TableCell>{log.agent?.name || 'N/A'}</TableCell>
                      <TableCell>
                        <Chip 
                          label={eventType}
                          size="small"
                          sx={{ 
                            bgcolor: `${getEventColor(eventType)}15`,
                            color: getEventColor(eventType),
                            fontWeight: 'bold'
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            maxWidth: 250, 
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                          title={filePath} // Add title for tooltip on hover
                        >
                          {filePath}
                        </Typography>
                      </TableCell>
                      <TableCell>{log.rule?.level || 'N/A'}</TableCell>
                      <TableCell>
                        <Button 
                          size="small" 
                          variant="text" 
                          color="primary"
                          onClick={() => handleViewLog(log)}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={totalLogs}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Log Details Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog} 
        maxWidth="lg" 
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">File Integrity Monitoring Log Details</Typography>
            <IconButton edge="end" color="inherit" onClick={handleCloseDialog} aria-label="close">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {parsedLog && <StructuredLogView data={parsedLog} />}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default FIM;