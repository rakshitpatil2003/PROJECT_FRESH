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
  IconButton,
  Pagination,
  debounce
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import CloseIcon from '@mui/icons-material/Close';
import { API_URL } from '../config';

const LogDetails = () => {
  const [logs, setLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = useCallback(async (currentPage, search) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_URL}/api/logs?page=${currentPage}&limit=1000&search=${search}`,
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
      setLogs(data.logsWithGeolocation || []);
      setTotalPages(data.pagination.pages);
    } catch (error) {
      console.error('Error fetching logs:', error);
      setError('Failed to fetch logs. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((searchValue) => {
      setPage(1);
      fetchLogs(1, searchValue);
    }, 500),
    []
  );

  useEffect(() => {
    debouncedSearch(searchTerm);
  }, [searchTerm, debouncedSearch]);

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
    fetchLogs(newPage, searchTerm);
  };

  const formatTimestamp = (timestamp) => {
    try {
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
              <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Details</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map((log, index) => (
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

      {totalPages > 1 && (
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
          <Pagination 
            count={totalPages} 
            page={page} 
            onChange={handlePageChange} 
            color="primary" 
          />
        </Box>
      )}

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