import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Typography, Box, Paper, Grid, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Button, Dialog, DialogContent,
  DialogTitle, IconButton, Chip, Tooltip,
  List, ListItem, ListItemText, Divider, LinearProgress, TextField,
  TablePagination, Avatar, Badge
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import FolderIcon from '@mui/icons-material/Folder';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import TimelineIcon from '@mui/icons-material/Timeline';
import BarChartIcon from '@mui/icons-material/BarChart';
import { StructuredLogView, parseLogMessage } from '../utils/normalizeLogs';
import { API_URL } from '../config';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { Cell } from 'recharts';

const FIM = () => {
  // State variables
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [parsedLog, setParsedLog] = useState(null);
  const [activeFilter, setActiveFilter] = useState('');
  const [eventCounts, setEventCounts] = useState({ added: 0, modified: 0, deleted: 0 });
  const [uniqueDescriptions, setUniqueDescriptions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [timeData, setTimeData] = useState([]);
  
  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5
      }
    }
  };

  // Fetch all logs from the API
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/logs/fim`, {
        params: {
          limit: 10000
        }
      });
      
      const fetchedLogs = response.data.logs;
      setLogs(fetchedLogs);
      
      // Calculate counts and prepare visualizations
      calculateEventCounts(fetchedLogs);
      prepareTimeData(fetchedLogs);
      
      // Apply any active filters
      const activeSearchTerm = activeFilter ? `"${activeFilter}` : searchTerm;
      applyFilters(fetchedLogs, activeFilter, activeSearchTerm);
      
    } catch (error) {
      console.error('Error fetching FIM logs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Prepare time series data for the timeline chart
  const prepareTimeData = (logsData) => {
    const timeMap = {};
    
    logsData.forEach(log => {
      const date = new Date(log.timestamp);
      const hour = date.getHours();
      const dayHour = `${date.getDate()}-${hour}`;
      
      if (!timeMap[dayHour]) {
        timeMap[dayHour] = { name: `${hour}:00`, added: 0, modified: 0, deleted: 0 };
      }
      
      const eventType = getSyscheckEvent(log).toLowerCase();
      if (['added', 'modified', 'deleted'].includes(eventType)) {
        timeMap[dayHour][eventType]++;
      }
    });
    
    setTimeData(Object.values(timeMap));
  };

  // Handle page change
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Calculate event counts from all logs
  const calculateEventCounts = (logsData) => {
    const counts = { added: 0, modified: 0, deleted: 0 };
    const descriptions = {};
    
    logsData.forEach(log => {
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
        descriptions[description] = (descriptions[description] || 0) + 1;
      }
    });
    
    // Convert descriptions to array and sort by count
    const sortedDescriptions = Object.entries(descriptions)
      .sort((a, b) => b[1] - a[1])
      .map(([desc, count]) => ({ desc, count }));
    
    setEventCounts(counts);
    setUniqueDescriptions(sortedDescriptions);
  };

  // Apply filters to the already fetched logs
  const applyFilters = (logsData, eventFilter, search) => {
    let filtered = logsData;

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = logsData.filter(log => {
        const logString = JSON.stringify(log).toLowerCase();
        return logString.includes(searchLower);
      });
    }
    
    setPage(0);
    setFilteredLogs(filtered);
  };

  // Initial fetch
  useEffect(() => {
    fetchLogs();
  }, []);

  // Apply filters when activeFilter or searchTerm change
  useEffect(() => {
    if (logs.length > 0) {
      const activeSearchTerm = activeFilter ? `"${activeFilter}` : searchTerm;
      applyFilters(logs, activeFilter, activeSearchTerm);
    }
  }, [activeFilter, searchTerm, logs]);

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
    if (activeFilter === filter) {
      setActiveFilter('');
    } else {
      setActiveFilter(filter);
    }
  };

  // Handle search change
  const handleSearchChange = (event) => {
    if (activeFilter && event.target.value) {
      setActiveFilter('');
    }
    setSearchTerm(event.target.value);
  };

  // Execute client-side search
  const handleSearchExecute = () => {
    const activeSearchTerm = activeFilter ? `"${activeFilter}` : searchTerm;
    applyFilters(logs, activeFilter, activeSearchTerm);
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
    if (log.rawLog && log.rawLog.message) {
      const message = log.rawLog.message.toLowerCase();
      if (message.includes('added')) return 'added';
      if (message.includes('modified')) return 'modified';
      if (message.includes('deleted')) return 'deleted';
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
              <motion.div variants={itemVariants}>
                <Paper 
                  elevation={activeFilter === event.type ? 6 : 3}
                  sx={{ 
                    p: 2, 
                    cursor: 'pointer',
                    borderLeft: `6px solid ${event.color}`,
                    background: `linear-gradient(to right, ${event.color}10, transparent)`,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-3px)',
                      boxShadow: `0 6px 12px ${event.color}30`
                    }
                  }}
                  onClick={() => handleFilterClick(event.type)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Avatar sx={{ 
                      bgcolor: `${event.color}20`,
                      color: event.color,
                      mr: 2
                    }}>
                      {event.icon}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" component="div">
                        {event.label}
                      </Typography>
                      <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                        {count}
                        <Typography variant="caption" component="span" sx={{ ml: 1, color: 'text.secondary' }}>
                          ({percentage}%)
                        </Typography>
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ mt: 2, mb: 1 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={percentage} 
                      sx={{ 
                        height: 8, 
                        borderRadius: 2,
                        bgcolor: '#f5f5f5',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: event.color,
                          borderRadius: 2
                        }
                      }}
                    />
                  </Box>
                </Paper>
              </motion.div>
            </Grid>
          );
        })}
      </Grid>
    );
  };

  // Render timeline chart
  const renderTimelineChart = () => (
    <Paper elevation={3} sx={{ p: 2, mt: 3, mb: 3, borderRadius: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <TimelineIcon color="primary" sx={{ mr: 1 }} />
        <Typography variant="h6">Event Timeline</Typography>
      </Box>
      <Box sx={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={timeData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" stroke="#888" />
            <YAxis stroke="#888" />
            <ChartTooltip 
              contentStyle={{
                background: 'rgba(255, 255, 255, 0.95)',
                border: 'none',
                borderRadius: 8,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="added" 
              stroke="#4caf50" 
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
            <Line 
              type="monotone" 
              dataKey="modified" 
              stroke="#2196f3" 
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
            <Line 
              type="monotone" 
              dataKey="deleted" 
              stroke="#f44336" 
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );

  // Render description bar chart
  const renderDescriptionChart = () => (
    <Paper elevation={3} sx={{ p: 2, mt: 3, mb: 3, borderRadius: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <BarChartIcon color="primary" sx={{ mr: 1 }} />
        <Typography variant="h6">Rule Type Distribution</Typography>
      </Box>
      <Box sx={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={uniqueDescriptions.slice(0, 10)}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis type="number" stroke="#888" />
            <YAxis 
              dataKey="desc" 
              type="category" 
              width={150} 
              stroke="#888"
              tick={{ fontSize: 12 }}
            />
            <ChartTooltip 
              contentStyle={{
                background: 'rgba(255, 255, 255, 0.95)',
                border: 'none',
                borderRadius: 8,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
            />
            <Bar 
              dataKey="count" 
              fill="#8884d8" 
              radius={[0, 4, 4, 0]}
              animationDuration={1500}
            >
              {uniqueDescriptions.slice(0, 10).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={`hsl(${index * 36}, 70%, 60%)`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );

  return (
    <Box sx={{ p: 3 }}>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <Paper 
          elevation={3} 
          sx={{ 
            p: 3, 
            mb: 3,
            borderRadius: 4,
            background: 'linear-gradient(145deg, #ffffff, #f5f5f5)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            border: '1px solid rgba(255,255,255,0.3)'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <FolderIcon color="primary" sx={{ mr: 1, fontSize: 32 }} />
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'medium' }}>
              File Integrity Monitoring
            </Typography>
          </Box>
          <Typography variant="body1" color="text.secondary" paragraph>
            Real-time monitoring of file system changes with detailed analytics and visualization.
          </Typography>
          
          {/* Event Visualization - acts as filters */}
          <Box sx={{ mt: 3, mb: 4 }}>
            {renderEventStats()}
            {activeFilter && (
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button 
                  variant="outlined" 
                  size="small"
                  onClick={() => handleFilterClick('')}
                  sx={{
                    borderRadius: 20,
                    textTransform: 'none',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                >
                  Clear Filter
                </Button>
              </Box>
            )}
          </Box>
          
          {/* Timeline Chart */}
          {timeData.length > 0 && renderTimelineChart()}
          
          {/* Search Box */}
          <Paper 
            elevation={0} 
            sx={{ 
              p: 2, 
              mb: 3, 
              mt: 3,
              borderRadius: 4,
              background: 'rgba(245, 245, 245, 0.7)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(0,0,0,0.05)'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <TextField
                label="Search in logs"
                variant="outlined"
                size="small"
                fullWidth
                value={searchTerm}
                onChange={handleSearchChange}
                sx={{ mr: 1 }}
                placeholder="Search for events, paths, etc."
                InputProps={{
                  sx: {
                    borderRadius: 4,
                    background: 'rgba(255,255,255,0.8)'
                  }
                }}
              />
              <Button 
                variant="contained" 
                color="primary"
                startIcon={<SearchIcon />}
                onClick={handleSearchExecute}
                sx={{
                  borderRadius: 4,
                  px: 3,
                  textTransform: 'none',
                  boxShadow: '0 4px 12px rgba(63, 81, 181, 0.2)',
                  '&:hover': {
                    boxShadow: '0 6px 16px rgba(63, 81, 181, 0.3)'
                  }
                }}
              >
                Search
              </Button>
            </Box>
          </Paper>
          
          {/* Description Chart */}
          {uniqueDescriptions.length > 0 && renderDescriptionChart()}
        </Paper>

        {/* Logs Table */}
        <motion.div variants={itemVariants}>
          <Paper 
            elevation={3} 
            sx={{ 
              borderRadius: 4,
              overflow: 'hidden',
              background: 'linear-gradient(145deg, #ffffff, #f5f5f5)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              border: '1px solid rgba(255,255,255,0.3)'
            }}
          >
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              p: 2,
              background: 'linear-gradient(to right, #3f51b5, #2196f3)',
              color: 'white'
            }}>
              <Typography variant="subtitle1">
                {loading ? 'Loading logs...' : `Showing ${filteredLogs.length} logs`}
              </Typography>
              <Badge 
                badgeContent={filteredLogs.length} 
                color="secondary"
                sx={{
                  '& .MuiBadge-badge': {
                    right: 30,
                    top: 10,
                    fontSize: '0.8rem',
                    padding: '0 4px',
                    height: 20,
                    minWidth: 22,
                    borderRadius: 13
                  }
                }}
              />
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ background: 'rgba(0,0,0,0.02)' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>Timestamp</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Agent</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Event</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>File Path</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Rule Level</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
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
                  ) : filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography variant="body2">No logs found</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((log) => {
                        const parsedLogData = parseLogMessage(log);
                        const eventType = parsedLogData?.syscheck?.event || getSyscheckEvent(log);
                        const filePath = parsedLogData?.syscheck?.path || getSyscheckPath(log);
                        
                        return (
                          <TableRow 
                            key={log._id || log.uniqueIdentifier} 
                            hover
                            sx={{
                              '&:nth-of-type(even)': {
                                background: 'rgba(0,0,0,0.02)'
                              },
                              '&:last-child td': {
                                borderBottom: 0
                              }
                            }}
                          >
                            <TableCell>{formatTimestamp(log.timestamp)}</TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Avatar sx={{ 
                                  width: 24, 
                                  height: 24, 
                                  mr: 1,
                                  bgcolor: 'primary.main',
                                  color: 'white',
                                  fontSize: 12
                                }}>
                                  {log.agent?.name?.charAt(0) || 'A'}
                                </Avatar>
                                {log.agent?.name || 'N/A'}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={eventType}
                                size="small"
                                sx={{ 
                                  bgcolor: `${getEventColor(eventType)}15`,
                                  color: getEventColor(eventType),
                                  fontWeight: 'bold',
                                  borderRadius: 1
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Tooltip title={filePath}>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <InsertDriveFileIcon sx={{ 
                                    color: 'text.secondary', 
                                    mr: 1,
                                    fontSize: 16
                                  }} />
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
                                </Box>
                              </Tooltip>
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={log.rule?.level || 'N/A'}
                                size="small"
                                sx={{ 
                                  bgcolor: log.rule?.level >= 10 ? '#ffebee' : '#e8f5e9',
                                  color: log.rule?.level >= 10 ? '#c62828' : '#2e7d32',
                                  fontWeight: 'bold'
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Button 
                                size="small" 
                                variant="outlined" 
                                color="primary"
                                onClick={() => handleViewLog(log)}
                                sx={{
                                  borderRadius: 2,
                                  textTransform: 'none'
                                }}
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
            {/* Pagination */}
            {!loading && filteredLogs.length > 0 && (
              <TablePagination
                rowsPerPageOptions={[5, 10, 25, 50]}
                component="div"
                count={filteredLogs.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                sx={{
                  borderTop: '1px solid rgba(0,0,0,0.05)',
                  '& .MuiTablePagination-toolbar': {
                    padding: '0 16px'
                  }
                }}
              />
            )}
          </Paper>
        </motion.div>

        {/* Log Details Dialog */}
        <Dialog 
          open={openDialog} 
          onClose={handleCloseDialog} 
          maxWidth="lg" 
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 4,
              background: 'linear-gradient(145deg, #ffffff, #f5f5f5)',
              boxShadow: '0 16px 48px rgba(0,0,0,0.2)'
            }
          }}
        >
          <DialogTitle sx={{ 
            pb: 1,
            background: 'linear-gradient(to right, #3f51b5, #2196f3)',
            color: 'white'
          }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <InsertDriveFileIcon sx={{ mr: 1 }} />
                <Typography variant="h6">File Integrity Monitoring Log Details</Typography>
              </Box>
              <IconButton 
                edge="end" 
                color="inherit" 
                onClick={handleCloseDialog} 
                aria-label="close"
                sx={{
                  '&:hover': {
                    background: 'rgba(255,255,255,0.2)'
                  }
                }}
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent dividers sx={{ background: 'rgba(245, 245, 245, 0.7)' }}>
            {parsedLog && <StructuredLogView data={parsedLog} />}
          </DialogContent>
        </Dialog>
      </motion.div>
    </Box>
  );
};

export default FIM;