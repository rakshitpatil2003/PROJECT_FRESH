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
  Chip,
  Tooltip
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import CloseIcon from '@mui/icons-material/Close';
import WarningIcon from '@mui/icons-material/Warning';
import axios from 'axios';
import { parseLogMessage } from '../utils/normalizeLogs';
import { API_URL } from '../config';
import SessionLogView from '../components/SessionLogView';

const MajorLogs = () => {
  const [logs, setLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchMajorLogs = useCallback(async (search) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
  
      const response = await axios.get(
        `${API_URL}/api/logs/major${search ? `?search=${encodeURIComponent(search)}` : ''}`,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          withCredentials: true
        }
      );
  
      if (!Array.isArray(response.data)) {
        throw new Error('Invalid response format from server');
      }
  
      // Enhanced validation to ensure we catch all logs >= 12
      const validLogs = response.data.filter(log => {
        const ruleLevel = parseInt(log.rule?.level);
        const isValidLevel = !isNaN(ruleLevel) && ruleLevel >= 12;
        if (!isValidLevel) {
          console.warn(`Filtered out log with invalid level: ${log.rule?.level}`);
        }
        return isValidLevel;
      });
  
      // Sort by level (descending) and then by timestamp
      const sortedLogs = validLogs.sort((a, b) => {
        const levelA = parseInt(a.rule?.level) || 0;
        const levelB = parseInt(b.rule?.level) || 0;
        if (levelB !== levelA) {
          return levelB - levelA;
        }
        return new Date(b.timestamp) - new Date(a.timestamp);
      });
  
      setLogs(sortedLogs);
      
    } catch (error) {
      console.error('Error fetching major logs:', error);
      setError(error.response?.data?.message || error.message || 'Failed to fetch major logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchMajorLogs(searchTerm);
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, fetchMajorLogs]);

  const getRuleLevelColor = (level) => {
    const numLevel = parseInt(level);
    if (numLevel >= 15) return '#d32f2f'; // Red
    if (numLevel >= 13) return '#f57c00'; // Orange
    if (numLevel >= 12) return '#ed6c02'; // Light Orange
    return '#1976d2'; // Blue (default)
  };

  const getRuleLevelSeverity = (level) => {
    const numLevel = parseInt(level);
    if (numLevel >= 15) return 'Critical';
    if (numLevel >= 13) return 'High';
    if (numLevel >= 12) return 'Major';
    return 'Normal';
  };

  const formatTimestamp = (timestamp) => {
    try {
      return new Date(timestamp).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'Invalid Date';
    }
  };

  if (loading && !logs.length) {
    return (
      <Box 
        p={4} 
        display="flex" 
        flexDirection="column" 
        alignItems="center"
        justifyContent="center" 
        minHeight="50vh"
      >
        <CircularProgress size={40} />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading major logs...
        </Typography>
      </Box>
    );
  }

  return (
    <Box p={4}>
      <Typography variant="h4" gutterBottom sx={{ color: '#d32f2f', mb: 3 }}>
        Major Logs Analysis
        <Typography variant="subtitle1" sx={{ color: 'text.secondary', mt: 1 }}>
          Showing logs with rule level ≥ 12
        </Typography>
      </Typography>

      <TextField
        fullWidth
        margin="normal"
        variant="outlined"
        placeholder="Search by agent name, description, rule level..."
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

      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          action={
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={() => setError(null)}
            >
              <CloseIcon fontSize="inherit" />
            </IconButton>
          }
        >
          {error}
        </Alert>
      )}

      <Alert 
        severity={logs.length > 0 ? "warning" : "info"} 
        sx={{ mb: 3 }}
        icon={logs.length > 0 ? <WarningIcon /> : undefined}
      >
        {logs.length > 0 
          ? `Found ${logs.length} major security logs that require attention`
          : 'No major logs found for the specified criteria'}
      </Alert>

      <TableContainer component={Paper} sx={{ maxHeight: 'calc(100vh - 300px)' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell style={{ fontWeight: 'bold', backgroundColor: '#ffebee' }}>Timestamp</TableCell>
              <TableCell style={{ fontWeight: 'bold', backgroundColor: '#ffebee' }}>Agent Name</TableCell>
              <TableCell style={{ fontWeight: 'bold', backgroundColor: '#ffebee' }}>Rule Level</TableCell>
              <TableCell style={{ fontWeight: 'bold', backgroundColor: '#ffebee' }}>Severity</TableCell>
              <TableCell style={{ fontWeight: 'bold', backgroundColor: '#ffebee' }}>Description</TableCell>
              <TableCell style={{ fontWeight: 'bold', backgroundColor: '#ffebee' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map((log) => {
              const parsedLog = parseLogMessage(log);
              return (
                <TableRow 
                  key={log.uniqueIdentifier || log._id} 
                  hover
                  sx={{
                    '&:nth-of-type(odd)': {
                      backgroundColor: 'rgba(0, 0, 0, 0.02)',
                    },
                  }}
                >
                  <TableCell>{formatTimestamp(parsedLog.timestamp)}</TableCell>
                  <TableCell>{parsedLog.agent.name}</TableCell>
                  <TableCell>
                    <Typography sx={{ color: getRuleLevelColor(parsedLog.rule.level), fontWeight: 'bold' }}>
                      {parsedLog.rule.level}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={getRuleLevelSeverity(parsedLog.rule.level)}
                      sx={{ 
                        backgroundColor: getRuleLevelColor(parsedLog.rule.level),
                        color: 'white',
                        fontWeight: 'bold'
                      }}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip title={parsedLog.rule.description}>
                      <span>
                        {parsedLog.rule.description.length > 100
                          ? `${parsedLog.rule.description.substring(0, 100)}...`
                          : parsedLog.rule.description}
                      </span>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Link
                      component="button"
                      variant="body2"
                      onClick={() => setSelectedLog(parsedLog)}
                      sx={{ 
                        textDecoration: 'none',
                        '&:hover': {
                          textDecoration: 'underline'
                        }
                      }}
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

      <Dialog
        open={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ 
          backgroundColor: '#ffebee', 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Typography variant="h6">Major Log Details</Typography>
          <IconButton
            aria-label="close"
            onClick={() => setSelectedLog(null)}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <SessionLogView data={selectedLog} />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default MajorLogs;