import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, CircularProgress, Link, Dialog, DialogTitle, DialogContent, 
  IconButton, Chip, Tabs, Tab, useTheme
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import CloseIcon from '@mui/icons-material/Close';
import axios from 'axios';
import { parseLogMessage } from '../utils/normalizeLogs';
import { StructuredLogView } from '../utils/normalizeLogs';
import { API_URL } from '../config';
import Lottie from 'react-lottie';
import animationData from '../assets/siri-animation.json'; // You'll need to download this file
import FeatureAccess from '../components/FeatureAccess';

const SentinelAI = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showResponse, setShowResponse] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [totalLogs, setTotalLogs] = useState(0);
  const theme = useTheme();
  
  // Animation options
  const defaultOptions = {
    loop: true,
    autoplay: true,
    animationData: animationData,
    rendererSettings: {
      preserveAspectRatio: 'xMidYMid slice'
    }
  };

  const fetchSentinelAILogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await axios.get(
        `${API_URL}/api/logs/sentinel-ai?page=${page}&pageSize=${rowsPerPage}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          withCredentials: true
        }
      );

      if (response.data && response.data.logs) {
        setLogs(response.data.logs);
        setTotalLogs(response.data.total);
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (error) {
      console.error('Error fetching Sentinel AI logs:', error);
      setError(error.response?.data?.message || error.message || 'Failed to fetch Sentinel AI logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage]);

  useEffect(() => {
    fetchSentinelAILogs();
  }, [fetchSentinelAILogs]);

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (newRowsPerPage) => {
    setRowsPerPage(newRowsPerPage);
    setPage(0);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleViewResponse = (log) => {
    setSelectedLog(log);
    setShowResponse(false);
    
    // Start animation, then show response
    setTimeout(() => {
      setShowResponse(true);
    }, 2000); // 2 seconds for animation
  };

  const closeDialog = () => {
    setSelectedLog(null);
    setShowResponse(false);
  };

  const getRuleLevelSeverity = (level) => {
    const numLevel = parseInt(level);
    if (numLevel >= 15) return 'Critical';
    if (numLevel >= 13) return 'High';
    if (numLevel >= 12) return 'Major';
    return 'Normal';
  };

  const getRuleLevelColor = (level) => {
    const numLevel = parseInt(level);
    if (numLevel >= 15) return '#d32f2f'; // Red
    if (numLevel >= 13) return '#f57c00'; // Orange
    if (numLevel >= 12) return '#ed6c02'; // Light Orange
    return '#1976d2'; // Blue (default)
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

  const columns = [
    {
      field: 'timestamp',
      headerName: 'Timestamp',
      flex: 1.5,
      renderCell: (params) => formatTimestamp(params.value)
    },
    {
      field: 'agentName',
      headerName: 'Agent Name',
      flex: 1
    },
    {
      field: 'ruleLevel',
      headerName: 'Rule Level',
      flex: 0.7,
      renderCell: (params) => (
        <Typography sx={{ color: getRuleLevelColor(params.value), fontWeight: 'bold' }}>
          {params.value}
        </Typography>
      )
    },
    {
      field: 'severity',
      headerName: 'Severity',
      flex: 1,
      renderCell: (params) => (
        <Chip
          label={getRuleLevelSeverity(params.row.ruleLevel)}
          sx={{
            backgroundColor: getRuleLevelColor(params.row.ruleLevel),
            color: 'white',
            fontWeight: 'bold'
          }}
          size="small"
        />
      )
    },
    {
      field: 'description',
      headerName: 'Description',
      flex: 2
    },
    {
      field: 'sentinelAI',
      headerName: 'Sentinel AI',
      flex: 1,
      renderCell: (params) => (
        <Link
          component="button"
          onClick={() => handleViewResponse(params.row.fullLog)}
        >
          View Analysis
        </Link>
      )
    }
  ];

  return (
    <FeatureAccess featureId="sentinel-ai" featureName="Sentinel AI">
      {loading && !logs.length ? (
        <Box
          p={4}
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="70vh"
        >
          <Box sx={{ width: '200px', height: '200px' }}>
            <Lottie options={defaultOptions} />
          </Box>
          <Typography variant="body1" sx={{ mt: 2 }}>
            Loading Sentinel AI logs...
          </Typography>
        </Box>
      ) : (
        <Box sx={{ p: 3 }}>
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h5" gutterBottom>
              Sentinel AI Logs
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              Displaying logs with AI analysis of security events
            </Typography>

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
              <Tabs 
                value={activeTab} 
                onChange={handleTabChange} 
                aria-label="log view tabs"
              >
                <Tab label="Events" />
                <Tab label="Table View" />
              </Tabs>
            </Box>

            {activeTab === 0 && (
              <Paper elevation={1} sx={{ p: 2 }}>
                {logs.length === 0 && !loading ? (
                  <Typography variant="body1" sx={{ textAlign: 'center', py: 4 }}>
                    No Sentinel AI logs found.
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {logs.map((log, index) => {
                      const parsedLog = parseLogMessage(log);
                      return (
                        <Paper 
                          key={index} 
                          elevation={2} 
                          sx={{ 
                            p: 2, 
                            borderLeft: `4px solid ${getRuleLevelColor(parsedLog.rule.level)}` 
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="subtitle2">
                              {formatTimestamp(parsedLog.timestamp)}
                            </Typography>
                            <Chip
                              label={getRuleLevelSeverity(parsedLog.rule.level)}
                              size="small"
                              sx={{
                                backgroundColor: getRuleLevelColor(parsedLog.rule.level),
                                color: 'white'
                              }}
                            />
                          </Box>
                          <Typography variant="body1" gutterBottom>
                            {parsedLog.rule.description}
                          </Typography>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                            <Typography variant="body2" color="textSecondary">
                              Agent: {parsedLog.agent.name}
                            </Typography>
                            <Link
                              component="button"
                              onClick={() => handleViewResponse(parsedLog)}
                              underline="hover"
                            >
                              View AI Analysis
                            </Link>
                          </Box>
                        </Paper>
                      );
                    })}
                  </Box>
                )}
              </Paper>
            )}

            {activeTab === 1 && (
              <Paper elevation={2} sx={{ mb: 3 }}>
                <Box sx={{
                  height: 650,
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden'
                }}>
                  <DataGrid
                    rows={logs.map((log, index) => {
                      const parsedLog = parseLogMessage(log);
                      return {
                        id: index,
                        timestamp: parsedLog.timestamp,
                        agentName: parsedLog.agent.name,
                        ruleLevel: parsedLog.rule.level,
                        description: parsedLog.rule.description,
                        fullLog: parsedLog
                      };
                    })}
                    columns={columns}
                    pageSize={rowsPerPage}
                    rowsPerPageOptions={[10, 25, 50, 100]}
                    onPageSizeChange={handleRowsPerPageChange}
                    pagination
                    paginationMode="server"
                    rowCount={totalLogs}
                    page={page}
                    onPageChange={handlePageChange}
                    disableSelectionOnClick
                    loading={loading}
                    density="standard"
                    sx={{
                      '& .MuiDataGrid-cell:hover': {
                        color: 'primary.main',
                      },
                      '& .MuiDataGrid-main': {
                        overflow: 'auto !important'
                      },
                      '& .MuiDataGrid-footerContainer': {
                        borderTop: '1px solid rgba(224, 224, 224, 1)',
                      },
                      flex: 1,
                      boxSizing: 'border-box',
                    }}
                  />
                </Box>
              </Paper>
            )}

            {/* ChatGPT Response Dialog */}
            <Dialog
              open={Boolean(selectedLog)}
              onClose={closeDialog}
              maxWidth="md"
              fullWidth
            >
              <DialogTitle sx={{
                backgroundColor: theme.palette.mode === 'dark' ? '#1e1e2f' : '#e6f7ff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <Typography variant="h6">Sentinel AI Analysis</Typography>
                <IconButton
                  aria-label="close"
                  onClick={closeDialog}
                  size="small"
                >
                  <CloseIcon />
                </IconButton>
              </DialogTitle>
              <DialogContent sx={{ mt: 2, minHeight: '300px' }}>
                {!showResponse ? (
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    height: '200px' 
                  }}>
                    <Lottie options={defaultOptions} height={200} width={200} />
                  </Box>
                ) : (
                  <Box sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>AI Analysis Results:</Typography>
                    <Box 
                      sx={{ 
                        border: '1px solid #e0e0e0', 
                        borderRadius: 1, 
                        p: 2, 
                        backgroundColor: theme.palette.mode === 'dark' ? '#121212' : '#f9f9f9',
                        my: 2,
                        fontSize: '0.9rem',
                        fontFamily: 'monospace'
                      }}
                    >
                      <TypewriterEffect 
                        text={selectedLog?.data?.YARA?.AI_response || 'No AI analysis available'} 
                      />
                    </Box>
                    <Typography variant="subtitle2" gutterBottom>Log Details:</Typography>
                    <StructuredLogView data={selectedLog} />
                  </Box>
                )}
              </DialogContent>
            </Dialog>
          </Paper>
        </Box>
      )}
    </FeatureAccess>
  );
};

// Component for typewriter effect
const TypewriterEffect = ({ text }) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex]);
        setCurrentIndex(currentIndex + 1);
      }, 10); // Speed of typing
      return () => clearTimeout(timer);
    }
  }, [currentIndex, text]);

  return <div>{displayText}</div>;
};

export default SentinelAI;