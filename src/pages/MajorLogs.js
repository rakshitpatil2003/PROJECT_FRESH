import React, { useState, useEffect } from 'react';
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
  Chip
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import CloseIcon from '@mui/icons-material/Close';
import axios from 'axios';
import { parseLogMessage, StructuredLogView } from '../utils/normalizeLogs';
import { API_URL } from '../config';

const MajorLogs = () => {
  const [logs, setLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    const fetchMajorLogs = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/api/logs/major`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setLogs(response.data);
      } catch (error) {
        console.error('Error fetching major logs:', error);
        setError('Failed to fetch major logs. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchMajorLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (!searchTerm) return true;
    
    const searchStr = searchTerm.toLowerCase();
    const parsedLog = parseLogMessage(log);
    
    return (
      parsedLog.agent.name.toLowerCase().includes(searchStr) ||
      parsedLog.rule.level.toString().includes(searchStr) ||
      parsedLog.rule.description.toLowerCase().includes(searchStr) ||
      parsedLog.network.srcIp.toLowerCase().includes(searchStr) ||
      (parsedLog.network.destIp && parsedLog.network.destIp.toLowerCase().includes(searchStr))
    );
  });

  const formatTimestamp = (timestamp) => {
    try {
      return new Date(timestamp).toLocaleString();
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'Invalid Date';
    }
  };

  const getRuleLevelColor = (level) => {
    const numLevel = parseInt(level);
    if (numLevel >= 15) return 'error';
    if (numLevel >= 13) return 'warning';
    return 'info';
  };

  if (loading) {
    return (
      <Box p={4} display="flex" justifyContent="center" alignItems="center">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={4}>
      <Typography variant="h4" gutterBottom sx={{ color: '#f44336' }}>
        Major Logs Analysis (Rule Level ≥ 12)
      </Typography>

      <TextField
        fullWidth
        margin="normal"
        variant="outlined"
        placeholder="Search major logs..."
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

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Alert severity="info" sx={{ mb: 3 }}>
        Showing {filteredLogs.length} major logs out of {logs.length} total major logs
      </Alert>

      <TableContainer component={Paper} sx={{ maxHeight: 'calc(100vh - 300px)' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell style={{ fontWeight: 'bold', backgroundColor: '#ffebee' }}>Timestamp</TableCell>
              <TableCell style={{ fontWeight: 'bold', backgroundColor: '#ffebee' }}>Agent Name</TableCell>
              <TableCell style={{ fontWeight: 'bold', backgroundColor: '#ffebee' }}>Rule Level</TableCell>
              <TableCell style={{ fontWeight: 'bold', backgroundColor: '#ffebee' }}>Source IP</TableCell>
              <TableCell style={{ fontWeight: 'bold', backgroundColor: '#ffebee' }}>Description</TableCell>
              <TableCell style={{ fontWeight: 'bold', backgroundColor: '#ffebee' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredLogs.map((log, index) => {
              const parsedLog = parseLogMessage(log);
              return (
                <TableRow key={index} hover>
                  <TableCell>{formatTimestamp(parsedLog.timestamp)}</TableCell>
                  <TableCell>{parsedLog.agent.name}</TableCell>
                  <TableCell>
                    <Chip 
                      label={parsedLog.rule.level} 
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
                      onClick={() => setSelectedLog(parsedLog)}
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

      <Dialog
        open={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Major Log Details
          <IconButton
            aria-label="close"
            onClick={() => setSelectedLog(null)}
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

export default MajorLogs;