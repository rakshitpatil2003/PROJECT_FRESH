import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, CircularProgress, Link, Dialog, DialogTitle, DialogContent,
  IconButton, Chip, Tabs, Tab, useTheme, Button, Grid, Card, CardContent, Divider
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import CloseIcon from '@mui/icons-material/Close';
import WarningIcon from '@mui/icons-material/Warning';
import InsightsIcon from '@mui/icons-material/Insights';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PsychologyIcon from '@mui/icons-material/Psychology';
import SecurityIcon from '@mui/icons-material/Security';
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
  const [viewType, setViewType] = useState(null); // 'ai' or 'ml'
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

      // Determine which type of logs to fetch based on activeTab
      const logType = activeTab === 0 ? 'ai' : 'ml';

      const response = await axios.get(
        `${API_URL}/api/logs/sentinel-ai?page=${page}&pageSize=${rowsPerPage}&logType=${logType}`,
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
        console.log('Received Sentinel AI logs:', response.data.logs);

        // Debug first ML log
        if (logType === 'ml' && response.data.logs.length > 0) {
          const firstLog = response.data.logs[0];
          console.log('First ML log details:', {
            hasAiMlLogs: !!firstLog.ai_ml_logs,
            hasExtractedMlData: !!firstLog.extracted?.mlData,
            parsedLogHasAiMlLogs: !!(firstLog.parsed && firstLog.parsed.ai_ml_logs),
            fullLogHasAiMlLogs: !!(firstLog.fullLog && firstLog.fullLog.ai_ml_logs)
          });
        }
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
  }, [page, rowsPerPage, activeTab]);

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
    setPage(0); // Reset page when changing tabs
  };

  const handleViewResponse = (log, type) => {
    // If we're viewing ML data, make sure the ML data is available in the log
    if (type === 'ml') {
      // Check if we need to copy ML data from the extracted field
      if (log.extracted && log.extracted.mlData && !log.ai_ml_logs) {
        log.ai_ml_logs = log.extracted.mlData;
      }
    }
    
    setSelectedLog(log);
    setViewType(type); // 'ai' or 'ml'
    setShowResponse(false);
    
    // Start animation, then show response
    setTimeout(() => {
      setShowResponse(true);
    }, 2000); // 2 seconds for animation
  };

  const closeDialog = () => {
    setSelectedLog(null);
    setViewType(null);
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

  const getAnomalyScoreColor = (score) => {
    const numScore = parseInt(score);
    if (numScore >= 70) return '#d32f2f'; // Red
    if (numScore >= 50) return '#f57c00'; // Orange
    return '#1976d2'; // Blue (default)
  };

  const getAnomalySeverity = (score) => {
    const numScore = parseInt(score);
    if (numScore >= 70) return 'High';
    if (numScore >= 50) return 'Medium';
    return 'Low';
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

  // Columns for AI logs
  const aiColumns = [
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
          label={`${params.row.ruleLevel} - ${getRuleLevelSeverity(params.row.ruleLevel)}`}
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
          onClick={() => handleViewResponse(params.row.fullLog, 'ai')}
        >
          View Analysis
        </Link>
      )
    }
  ];

  // Columns for ML logs
  const mlColumns = [
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
      field: 'source',
      headerName: 'Source',
      flex: 1,
      valueGetter: (params) => {
        try {
          return params.row.fullLog?.data?.ai_ml_logs?.original_source || 'N/A';
        } catch (error) {
          return 'N/A';
        }
      }
    },
    {
      field: 'anomalyScore',
      headerName: 'Anomaly Score',
      flex: 1,
      valueGetter: (params) => {
        try {
          return params.row.fullLog?.data?.ai_ml_logs?.anomaly_score || 0;
        } catch (error) {
          return 0;
        }
      },
      renderCell: (params) => {
        const score = params.value;
        return (
          <Chip
            label={`${score} - ${getAnomalySeverity(score)}`}
            sx={{
              backgroundColor: getAnomalyScoreColor(score),
              color: 'white',
              fontWeight: 'bold'
            }}
            size="small"
          />
        );
      }
    },
    {
      field: 'reason',
      headerName: 'Reason',
      flex: 2,
      valueGetter: (params) => {
        try {
          return params.row.fullLog?.data?.ai_ml_logs?.anomaly_reason || 'Unknown reason';
        } catch (error) {
          return 'Unknown reason';
        }
      }
    },
    {
      field: 'mlAnalysis',
      headerName: 'ML Analysis',
      flex: 1,
      renderCell: (params) => (
        <Link
          component="button"
          onClick={() => handleViewResponse(params.row.fullLog, 'ml')}
        >
          View Details
        </Link>
      )
    }
  ];

  // Render Machine Learning Analysis Details
  const renderMLAnalysisDetails = () => {
    if (!selectedLog) {
      return <Typography>No ML analysis data available</Typography>;
    }

    // Try to access ML data from different possible locations
    const mlData = selectedLog.ai_ml_logs ||
      selectedLog.data?.ai_ml_logs ||
      selectedLog.extracted?.mlData;

    if (!mlData) {
      console.error('ML data not found in log:', selectedLog);
      return <Typography>ML analysis data could not be found in this log</Typography>;
    }

    return (
      <Box sx={{ mt: 2 }}>
        <Grid container spacing={3}>
          {/* Main Score Card */}
          <Grid item xs={12}>
            <Card elevation={3} sx={{
              background: `linear-gradient(120deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              color: 'white',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <Box
                sx={{
                  position: 'absolute',
                  top: '-20px',
                  right: '-20px',
                  fontSize: '140px',
                  opacity: 0.1,
                  color: 'white'
                }}
              >
                <AutoGraphIcon sx={{ fontSize: 'inherit' }} />
              </Box>
              <CardContent sx={{ position: 'relative', zIndex: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="h6">Anomaly Detection</Typography>
                  <Chip
                    label={mlData.anomaly_detected ? "ANOMALY DETECTED" : "Normal Activity"}
                    color={mlData.anomaly_detected ? "error" : "success"}
                    sx={{ fontWeight: 'bold' }}
                  />
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', mt: 3, gap: 2 }}>
                  <Box
                    sx={{
                      height: 100,
                      width: 100,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: `rgba(255,255,255,0.2)`,
                      border: '4px solid white'
                    }}
                  >
                    <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                      {mlData.anomaly_score}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
                      Anomaly Score: {getAnomalySeverity(mlData.anomaly_score)} Risk
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
                      {mlData.anomaly_reason}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Detail Cards */}
          <Grid item xs={12} md={6}>
            <Card elevation={2}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <PsychologyIcon color="primary" sx={{ mr: 1, fontSize: '1.8rem' }} />
                  <Typography variant="h6">Analysis Details</Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />

                <Typography variant="subtitle2" color="textSecondary">Analysis Method</Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>{mlData.log_analysis || 'N/A'}</Typography>

                <Typography variant="subtitle2" color="textSecondary">Analysis Timestamp</Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>{formatTimestamp(mlData.analysis_timestamp) || 'N/A'}</Typography>

                <Typography variant="subtitle2" color="textSecondary">Original Log ID</Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>{mlData.original_log_id || 'N/A'}</Typography>

                <Typography variant="subtitle2" color="textSecondary">Original Source</Typography>
                <Typography variant="body2">{mlData.original_source || 'N/A'}</Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card elevation={2}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <TrendingUpIcon color="primary" sx={{ mr: 1, fontSize: '1.8rem' }} />
                  <Typography variant="h6">Trend Analysis</Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />

                {mlData.trend_info ? (
                  <>
                    <Typography variant="subtitle2" color="textSecondary">Trend Status</Typography>
                    <Chip
                      label={mlData.trend_info.is_new_trend ? "New Trend Detected" : "Existing Pattern"}
                      color={mlData.trend_info.is_new_trend ? "warning" : "info"}
                      size="small"
                      sx={{ mb: 2 }}
                    />

                    <Typography variant="subtitle2" color="textSecondary">Explanation</Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>{mlData.trend_info.explanation || 'N/A'}</Typography>

                    <Typography variant="subtitle2" color="textSecondary">Similarity Score</Typography>
                    <Typography variant="body2">{mlData.trend_info.similarity_score !== undefined ? `${mlData.trend_info.similarity_score}%` : 'N/A'}</Typography>
                  </>
                ) : (
                  <Typography variant="body2">No trend information available</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Score Explanation */}
          {mlData.score_explanation && (
            <Grid item xs={12}>
              <Card elevation={2}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <AssessmentIcon color="primary" sx={{ mr: 1, fontSize: '1.8rem' }} />
                    <Typography variant="h6">Score Explanation</Typography>
                  </Box>
                  <Divider sx={{ mb: 2 }} />

                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="textSecondary">Model Used</Typography>
                      <Typography variant="body2" sx={{ mb: 2 }}>{mlData.score_explanation.model || 'N/A'}</Typography>

                      <Typography variant="subtitle2" color="textSecondary">Raw Score</Typography>
                      <Typography variant="body2" sx={{ mb: 2 }}>{mlData.score_explanation.raw_score || 'N/A'}</Typography>

                      <Typography variant="subtitle2" color="textSecondary">Normalized Score</Typography>
                      <Typography variant="body2" sx={{ mb: 2 }}>{mlData.score_explanation.normalized_score || 'N/A'}</Typography>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="textSecondary">Explanation</Typography>
                      <Typography variant="body2" sx={{ mb: 2 }}>{mlData.score_explanation.explanation || 'N/A'}</Typography>

                      {mlData.score_explanation.top_contributing_features && (
                        <>
                          <Typography variant="subtitle2" color="textSecondary">Top Contributing Factors</Typography>
                          {Object.entries(mlData.score_explanation.top_contributing_features).map(([key, value]) => (
                            <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                              <Typography variant="body2">{key}</Typography>
                              <Typography variant="body2" fontWeight="bold">{value.toFixed(2)}</Typography>
                            </Box>
                          ))}
                        </>
                      )}
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      </Box>
    );
  };

  if (loading && !logs.length) {
    return (
      <FeatureAccess featureId="sentinel-ai" featureName="Sentinel AI">
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
      </FeatureAccess>
    );
  }

  return (
    <FeatureAccess featureId="sentinel-ai" featureName="Sentinel AI">
      <Box sx={{ p: 3 }}>
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h5" gutterBottom>
            Sentinel AI Logs
          </Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            Advanced security analysis powered by AI and machine learning
          </Typography>

          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              aria-label="log view tabs"
              sx={{
                '& .MuiTab-root': {
                  minHeight: '48px',
                  fontWeight: 'bold'
                }
              }}
            >
              <Tab
                icon={<SecurityIcon />}
                iconPosition="start"
                label="Sentinel AI"
              />
              <Tab
                icon={<InsightsIcon />}
                iconPosition="start"
                label="Machine Learning"
              />
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
                          borderLeft: `4px solid ${getRuleLevelColor(parsedLog.rule.level)}`,
                          transition: 'all 0.2s',
                          '&:hover': {
                            boxShadow: 4,
                            transform: 'translateY(-2px)'
                          }
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="subtitle2">
                            {formatTimestamp(parsedLog.timestamp)}
                          </Typography>
                          <Chip
                            label={`${parsedLog.rule.level} - ${getRuleLevelSeverity(parsedLog.rule.level)}`}
                            size="small"
                            sx={{
                              backgroundColor: getRuleLevelColor(parsedLog.rule.level),
                              color: 'white',
                              fontWeight: 'bold'
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
                          <Button
                            variant="outlined"
                            size="small"
                            color="primary"
                            onClick={() => handleViewResponse(parsedLog, 'ai')}
                          >
                            View AI Analysis
                          </Button>
                        </Box>
                      </Paper>
                    );
                  })}
                </Box>
              )}
            </Paper>
          )}

          {activeTab === 1 && (
            <Paper elevation={1} sx={{ p: 2 }}>
              {logs.length === 0 && !loading ? (
                <Typography variant="body1" sx={{ textAlign: 'center', py: 4 }}>
                  No Machine Learning logs found.
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {logs.map((log, index) => {
                    const parsedLog = parseLogMessage(log);

                    // Access ML data from multiple possible locations
                    const mlData = parsedLog.ai_ml_logs ||
                      parsedLog.data?.ai_ml_logs ||
                      log.extracted?.mlData ||
                      {};

                    // Now get specific fields with fallbacks
                    const anomalyScore = mlData.anomaly_score || 0;
                    const anomalyReason = mlData.anomaly_reason || 'Anomaly detection result';
                    const source = mlData.original_source || 'Unknown';

                    return (
                      <Paper
                        key={index}
                        elevation={2}
                        sx={{
                          p: 2,
                          borderLeft: `4px solid ${getAnomalyScoreColor(anomalyScore)}`,
                          transition: 'all 0.2s',
                          '&:hover': {
                            boxShadow: 4,
                            transform: 'translateY(-2px)'
                          }
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="subtitle2">
                            {formatTimestamp(parsedLog.timestamp)}
                          </Typography>
                          <Chip
                            label={`${anomalyScore} - ${getAnomalySeverity(anomalyScore)}`}
                            size="small"
                            sx={{
                              backgroundColor: getAnomalyScoreColor(anomalyScore),
                              color: 'white',
                              fontWeight: 'bold'
                            }}
                          />
                        </Box>
                        <Typography variant="body1" gutterBottom>
                          {anomalyReason}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                          <Typography variant="body2" color="textSecondary">
                            Source: {source}
                          </Typography>
                          <Button
                            variant="outlined"
                            size="small"
                            color="primary"
                            onClick={() => handleViewResponse(parsedLog, 'ml')}
                          >
                            View ML Analysis
                          </Button>
                        </Box>
                      </Paper>
                    );
                  })}
                </Box>
              )}
            </Paper>
          )}

          {/* Dialog to show analysis */}
          <Dialog
            open={Boolean(selectedLog)}
            onClose={closeDialog}
            maxWidth="md"
            fullWidth
            sx={{
              '& .MuiDialog-paper': {
                borderRadius: 2,
                overflow: 'hidden'
              }
            }}
          >
            <DialogTitle sx={{
              backgroundColor: theme.palette.mode === 'dark' ? '#1e1e2f' : '#e6f7ff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <Typography variant="h6">
                {viewType === 'ai' ? 'Sentinel AI Analysis' : 'Machine Learning Analysis'}
              </Typography>
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
                  {viewType === 'ai' ? (
                    <>
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
                    </>
                  ) : (
                    <>
                      {renderMLAnalysisDetails()}
                      <Divider sx={{ my: 3 }} />
                      <Typography variant="subtitle2" gutterBottom>Log Details:</Typography>
                      <StructuredLogView data={selectedLog} />
                    </>
                  )}
                </Box>
              )}
            </DialogContent>
          </Dialog>
        </Paper>
      </Box>
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