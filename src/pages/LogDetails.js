import React, { useState, useEffect, useCallback } from 'react';
import { debounce } from 'lodash';
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
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import CloseIcon from '@mui/icons-material/Close';
import { API_URL } from '../config';
import { parseLogMessage, StructuredLogView } from '../utils/normalizeLogs';
import { useTheme } from '@mui/material/styles';

const LogDetails = () => {
  const [logs, setLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedLog, setSelectedLog] = useState(null);
  const [logType, setLogType] = useState('all'); // New state for log type filter
  const [ruleLevel, setRuleLevel] = useState('all'); // New state for rule level filter

  const theme = useTheme();

  const getRuleLevelColor = (level) => {
    const numLevel = parseInt(level);
    if (numLevel >= 17) return 'error'; // Added new severity level
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

  const fetchLogs = useCallback(async (currentPage, search, type, level) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_URL}/api/logs?page=${currentPage}&limit=100&search=${search}&logType=${type}&ruleLevel=${level}`,
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
      setLogs(data.logs || []);
      setTotalPages(data.pagination.pages);
    } catch (error) {
      console.error('Error fetching logs:', error);
      setError('Failed to fetch logs. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  const debouncedSearch = useCallback(
    debounce((searchValue, logTypeValue, ruleLevelValue) => {
      setPage(1);
      fetchLogs(1, searchValue, logTypeValue, ruleLevelValue);
    }, 500),
    [fetchLogs]
  );

  useEffect(() => {
    debouncedSearch(searchTerm, logType, ruleLevel);
  }, [searchTerm, logType, ruleLevel, debouncedSearch]);

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
    fetchLogs(newPage, searchTerm, logType, ruleLevel);
  };

  const handleLogTypeChange = (event) => {
    setLogType(event.target.value);
  };

  const handleRuleLevelChange = (event) => {
    setRuleLevel(event.target.value);
  };

  const handleClickOpen = (log) => {
    const parsedLog = parseLogMessage(log);
    setSelectedLog(parsedLog);
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
          <FormControl variant="outlined" fullWidth>
            <InputLabel id="rule-level-label">Rule Level</InputLabel>
            <Select
              labelId="rule-level-label"
              value={ruleLevel}
              onChange={handleRuleLevelChange}
              label="Rule Level"
            >
              <MenuItem value="all">All Levels</MenuItem>
              <MenuItem value="low">Low (1-3)</MenuItem>
              <MenuItem value="medium">Medium (4-7)</MenuItem>
              <MenuItem value="high">High (8-11)</MenuItem>
              <MenuItem value="critical">Critical (12-16)</MenuItem>
              <MenuItem value="severe">Severe (17+)</MenuItem>
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

      <TableContainer component={Paper} sx={{ maxHeight: 'calc(100vh - 300px)' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell style={{ fontWeight: 'bold', backgroundColor: theme.palette.mode === 'dark' ? '#353536' : '#f5f5f5' }}>Timestamp</TableCell>
              <TableCell style={{ fontWeight: 'bold', backgroundColor: theme.palette.mode === 'dark' ? '#353536' : '#f5f5f5' }}>Agent Name</TableCell>
              <TableCell style={{ fontWeight: 'bold', backgroundColor: theme.palette.mode === 'dark' ? '#353536' : '#f5f5f5' }}>Rule Level</TableCell>
              <TableCell style={{ fontWeight: 'bold', backgroundColor: theme.palette.mode === 'dark' ? '#353536' : '#f5f5f5' }}>Source IP</TableCell>
              <TableCell style={{ fontWeight: 'bold', backgroundColor: theme.palette.mode === 'dark' ? '#353536' : '#f5f5f5' }}>Description</TableCell>
              <TableCell style={{ fontWeight: 'bold', backgroundColor: theme.palette.mode === 'dark' ? '#353536' : '#f5f5f5' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map((log, index) => {
              const parsedLog = parseLogMessage(log);
              return (
                <TableRow key={index} hover>
                  <TableCell>{formatTimestamp(parsedLog.timestamp)}</TableCell>
                  <TableCell>{parsedLog.agent.name}</TableCell>
                  <TableCell>
                    <Chip 
                      label={`${parsedLog.rule.level} - ${getRuleLevelLabel(parsedLog.rule.level)}`}
                      color={getRuleLevelColor(parsedLog.rule.level)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{parsedLog.network.srcIp}</TableCell>
                  <TableCell>{parsedLog.rule.description}</TableCell>
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
              );
            })}
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
          <StructuredLogView data={selectedLog} />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default LogDetails;