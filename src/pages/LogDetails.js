import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  TextField,
  InputAdornment,
  CircularProgress,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import CloseIcon from '@mui/icons-material/Close';
import TimeRangeSelector from '../components/TimeRangeSelector';

const LogDetails = () => {
  const [logs, setLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState(3600);
  const [updateInterval, setUpdateInterval] = useState(10000);
  const [isUpdating, setIsUpdating] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/logs?range=${timeRange}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }

      const data = await response.json();
      setLogs(data.logsWithGeolocation || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
      setError('Failed to fetch logs. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchLogs();
    let intervalId;

    if (isUpdating) {
      intervalId = setInterval(fetchLogs, updateInterval);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [timeRange, updateInterval, isUpdating, fetchLogs]);

  const filteredLogs = logs.filter((log) => {
    const searchStr = searchTerm.toLowerCase();
    const searchableFields = [
      log.agent?.name,
      String(log.rule?.level),
      JSON.stringify(log.rawLog)
    ].join(' ').toLowerCase();
    return searchableFields.includes(searchStr);
  });

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

  const handleClickOpen = (log) => {
    setSelectedLog(log);
  };

  const handleClose = () => {
    setSelectedLog(null);
  };

  if (loading) {
    return (
      <Box p={4} display="flex" justifyContent="center" alignItems="center">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={4}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box p={4}>
      <Typography variant="h4" gutterBottom>
        Detailed Log Analysis
      </Typography>

      <TimeRangeSelector
        timeRange={timeRange}
        setTimeRange={setTimeRange}
        updateInterval={updateInterval}
        setUpdateInterval={setUpdateInterval}
        isUpdating={isUpdating}
        setIsUpdating={setIsUpdating}
      />

      <TextField
        fullWidth
        margin="normal"
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
        sx={{ mb: 3 }}
      />

      <TableContainer component={Paper} sx={{ maxHeight: 'calc(100vh - 300px)' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Timestamp</TableCell>
              <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Agent Name</TableCell>
              <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Rule Level</TableCell>
              <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Message</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredLogs.map((log, index) => (
              <TableRow key={index} hover>
                <TableCell>{formatTimestamp(log.timestamp)}</TableCell>
                <TableCell>{log.agent?.name || 'N/A'}</TableCell>
                <TableCell>{log.rule?.level || 'N/A'}</TableCell>
                <TableCell>
                  <Link
                    component="button"
                    variant="body2"
                    onClick={() => handleClickOpen(log)}
                    sx={{ textAlign: 'left', cursor: 'pointer' }}
                  >
                    View Details
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

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
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {selectedLog ? JSON.stringify(selectedLog.rawLog, null, 2) : ''}
          </pre>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default LogDetails;