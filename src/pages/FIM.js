import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Typography, Box, Paper, Grid, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, TablePagination, Button, Dialog, DialogContent,
  DialogTitle, IconButton, Chip, Card, CardContent, Tooltip,
  List, ListItem, ListItemText, Divider, LinearProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { StructuredLogView, parseLogMessage } from '../utils/normalizeLogs';

const FIM = () => {
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  
  // State variables
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalLogs, setTotalLogs] = useState(0);
  const [selectedLog, setSelectedLog] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [parsedLog, setParsedLog] = useState(null);
  const [activeFilter, setActiveFilter] = useState('');
  const [eventCounts, setEventCounts] = useState({ added: 0, modified: 0, deleted: 0 });
  const [uniqueDescriptions, setUniqueDescriptions] = useState([]);

  // Fetch logs from the API
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/logs/fim`, {
        params: {
          page: page + 1,
          limit: rowsPerPage,
          event: activeFilter
        }
      });
      
      const fetchedLogs = response.data.logs;
      setLogs(fetchedLogs);
      setTotalLogs(response.data.totalLogs);
      
      // Calculate event counts
      const counts = { added: 0, modified: 0, deleted: 0 };
      const descriptions = new Set();
      
      fetchedLogs.forEach(log => {
        const parsedLogData = parseLogMessage(log);
        const eventType = parsedLogData?.syscheck?.event || getSyscheckEvent(log);
        if (eventType && counts[eventType.toLowerCase()] !== undefined) {
          counts[eventType.toLowerCase()]++;
        }
        
        // Extract rule descriptions
        const description = parsedLogData?.rule?.description || 
                         (log.rule && log.rule.description) || 
                         (log.rawLog && log.rawLog.rule && log.rawLog.rule.description);
        if (description && description !== 'No description') {
          descriptions.add(description);
        }
      });
      
      setEventCounts(counts);
      setUniqueDescriptions([...descriptions]);
    } catch (error) {
      console.error('Error fetching FIM logs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and when filters change
  useEffect(() => {
    fetchLogs();
  }, [page, rowsPerPage, activeFilter]);

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

  // Handle filter click
  const handleFilterClick = (filter) => {
    setActiveFilter(activeFilter === filter ? '' : filter);
    setPage(0);
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

  // Extract syscheck event from log
  const getSyscheckEvent = (log) => {
    if (log.syscheck && log.syscheck.event) {
      return log.syscheck.event;
    }
    if (log.rawLog && log.rawLog.syscheck && log.rawLog.syscheck.event) {
      return log.rawLog.syscheck.event;
    }
    if (log.data && log.data.syscheck && log.data.syscheck.event) {
      return log.data.syscheck.event;
    }
    if (log.message && log.message.syscheck && log.message.syscheck.event) {
      return log.message.syscheck.event;
    }
    return 'unknown';
  };

  // Extract syscheck path from log
  const getSyscheckPath = (log) => {
    if (log.syscheck && log.syscheck.path) {
      return log.syscheck.path;
    }
    if (log.rawLog && log.rawLog.syscheck && log.rawLog.syscheck.path) {
      return log.rawLog.syscheck.path;
    }
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

  // Calculate percentage for visualization
  const calculatePercentage = (count) => {
    const total = eventCounts.added + eventCounts.modified + eventCounts.deleted;
    return total ? Math.round((count / total) * 100) : 0;
  };

  // Render event stats cards
  const renderEventStats = () => {
    const eventTypes = [
      { type: 'added', label: 'Added', icon: <PlaylistAddCheckIcon />, color: '#4caf50' },
      { type: 'modified', label: 'Modified', icon: <EditIcon />, color: '#2196f3' },
      { type: 'deleted', label: 'Deleted', icon: <DeleteIcon />, color: '#f44336' }
    ];

    return (
      <Grid container spacing={3}>
        {eventTypes.map((event) => {
          const count = eventCounts[event.type];
          const percentage = calculatePercentage(count);
          
          return (
            <Grid item xs={12} md={4} key={event.type}>
              <Paper 
                elevation={activeFilter === event.type ? 3 : 1}
                sx={{ 
                  p: 2, 
                  cursor: 'pointer',
                  border: activeFilter === event.type ? `2px solid ${event.color}` : 'none',
                  transition: 'all 0.3s ease'
                }}
                onClick={() => handleFilterClick(event.type)}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Box sx={{ 
                    p: 1, 
                    borderRadius: '50%', 
                    bgcolor: `${event.color}15`,
                    color: event.color,
                    mr: 1
                  }}>
                    {event.icon}
                  </Box>
                  <Typography variant="h6" component="div">
                    {event.label}
                  </Typography>
                </Box>
                <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                  {count}
                </Typography>
                <Box sx={{ mt: 2, mb: 1 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={percentage} 
                    sx={{ 
                      height: 8, 
                      borderRadius: 2,
                      bgcolor: '#f5f5f5',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: event.color
                      }
                    }}
                  />
                </Box>
                <Typography variant="caption" component="div" color="text.secondary">
                  {percentage}% of total
                </Typography>
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    );
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
        
        {/* Event Visualization - acts as filters */}
        <Box sx={{ mt: 3, mb: 4 }}>
          {renderEventStats()}
          {activeFilter && (
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button 
                variant="outlined" 
                size="small"
                onClick={() => setActiveFilter('')}
              >
                Clear Filter
              </Button>
            </Box>
          )}
        </Box>
        
        {/* Common Rule Descriptions Card */}
        {uniqueDescriptions.length > 0 && (
          <Paper elevation={1} sx={{ p: 2, mt: 3, mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Detected Rule Types
            </Typography>
            <List dense>
              {uniqueDescriptions.slice(0, 5).map((desc, index) => (
                <React.Fragment key={index}>
                  <ListItem>
                    <ListItemText 
                      primary={desc}
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                  {index < uniqueDescriptions.slice(0, 5).length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
            {uniqueDescriptions.length > 5 && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {uniqueDescriptions.length - 5} more rule descriptions...
              </Typography>
            )}
          </Paper>
        )}
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
                    <Box sx={{ width: '100%', mt: 2, mb: 2 }}>
                      <LinearProgress />
                    </Box>
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
                        <Tooltip title={filePath}>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              maxWidth: 250, 
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            {filePath}
                          </Typography>
                        </Tooltip>
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