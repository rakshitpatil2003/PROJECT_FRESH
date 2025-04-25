import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, Paper, CircularProgress, Link, Dialog, DialogTitle, DialogContent,
  IconButton, Chip, Tabs, Tab, useTheme, Button, Grid, Card, CardContent, Divider,
  TextField, InputAdornment, FormControl, InputLabel, Select, MenuItem
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
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import DateRangeIcon from '@mui/icons-material/DateRange';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import axios from 'axios';
import { parseLogMessage } from '../utils/normalizeLogs';
import { StructuredLogView } from '../utils/normalizeLogs';
import { API_URL } from '../config';
import Lottie from 'react-lottie';
import animationData from '../assets/siri-animation.json';
import FeatureAccess from '../components/FeatureAccess';

// Time range options
const TimeRangeOptions = [
  { value: '12h', label: 'Last 12 Hours' },
  { value: '24h', label: 'Last 24 Hours' },
  { value: '3d', label: 'Last 3 Days' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' }
];

const SentinelAI = () => {
  const [logs, setLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [viewType, setViewType] = useState(null); // 'ai' or 'ml'
  const [showResponse, setShowResponse] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10000);
  const [totalLogs, setTotalLogs] = useState(0);
  const [timeRange, setTimeRange] = useState('7d'); // Default to 7 days
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const theme = useTheme();

  // Enhanced function to extract AI response from different paths
  const getAIResponse = (log) => {
    if (!log) return 'No AI analysis available';

    // Try all possible locations where AI_response might be
    let aiResponse = null;

    // Direct field
    if (log.AI_response) {
      aiResponse = log.AI_response;
    }
    // In data field
    else if (log.data && log.data.AI_response) {
      aiResponse = log.data.AI_response;
    }
    // In extracted field
    else if (log.extracted && log.extracted.aiResponse) {
      aiResponse = log.extracted.aiResponse;
    }
    // In YARA data
    else if (log.data && log.data.YARA && log.data.YARA.AI_response) {
      aiResponse = log.data.YARA.AI_response;
    }
    // Try to extract from rawLog.message if it's a string containing AI_response
    else if (log.rawLog && log.rawLog.message && typeof log.rawLog.message === 'string') {
      try {
        // Parse the message if it's a JSON string
        const parsedMessage = JSON.parse(log.rawLog.message);
        if (parsedMessage.AI_response) {
          aiResponse = parsedMessage.AI_response;
        }
      } catch (e) {
        // Try regex extraction if JSON parsing fails
        const match = /\"AI_response\":\"(.*?)\"/.exec(log.rawLog.message);
        if (match && match[1]) {
          aiResponse = match[1].replace(/\\\\n/g, '\n').replace(/\\\"/g, '"');
        }
      }
    }

    return aiResponse || 'No AI analysis available';
  };

  // Function to extract ML data
  // Helper function to extract ML data consistently from any log
  const getMLData = (log) => {
    if (!log) return null;

    // First check if extracted.mlData exists (this is from the endpoint)
    if (log.extracted && log.extracted.mlData) {
      return log.extracted.mlData;
    }

    // Then try data.ai_ml_logs
    if (log.data && log.data.ai_ml_logs) {
      return log.data.ai_ml_logs;
    }

    // Then try direct ai_ml_logs
    if (log.ai_ml_logs) {
      return log.ai_ml_logs;
    }

    // If message is a string, try to extract from it
    if (log.rawLog && log.rawLog.message && typeof log.rawLog.message === 'string') {
      try {
        // Try to parse JSON
        const parsedMessage = JSON.parse(log.rawLog.message);
        if (parsedMessage.ai_ml_logs) {
          return parsedMessage.ai_ml_logs;
        }
      } catch (e) {
        // If parsing fails, try regex extraction
        const mlRegex = /"ai_ml_logs"\s*:\s*({[\s\S]*?})\s*,/;
        const mlMatch = log.rawLog.message.match(mlRegex);

        if (mlMatch && mlMatch[1]) {
          try {
            return JSON.parse(mlMatch[1]);
          } catch (e) {
            console.log('Could not parse extracted ai_ml_logs JSON');
          }
        }
      }
    }

    return null;
  };

  // Add this function to your component
  const extractMLData = (log) => {
    try {
      // If the log has already processed data, use it
      if (log.extracted && log.extracted.mlData) {
        return log.extracted.mlData;
      }

      // If the data is directly available in the log
      if (log.data && log.data.ai_ml_logs) {
        return log.data.ai_ml_logs;
      }

      // If the data is directly on the log object
      if (log.ai_ml_logs) {
        return log.ai_ml_logs;
      }

      // If we need to extract from rawLog.message
      if (log.rawLog && log.rawLog.message) {
        if (typeof log.rawLog.message === 'string') {
          // Try to find ai_ml_logs in the JSON string
          const match = /"ai_ml_logs"\s*:\s*({[\s\S]*?})[,}]/i.exec(log.rawLog.message);
          if (match && match[1]) {
            try {
              // This regex handles the common issue of extracting nested JSON from a string
              // We add brackets to ensure it's valid JSON
              const mlDataStr = '{' + match[1].replace(/^{|}$/g, '') + '}';
              const mlData = JSON.parse(mlDataStr);
              return mlData;
            } catch (e) {
              console.error('Error parsing extracted ML data:', e);

              // Fall back to regex extraction of individual fields
              const anomalyScore = /"anomaly_score"\s*:\s*(\d+)/i.exec(log.rawLog.message);
              const anomalyReason = /"anomaly_reason"\s*:\s*"([^"]*)"/i.exec(log.rawLog.message);
              const originalSource = /"original_source"\s*:\s*"([^"]*)"/i.exec(log.rawLog.message);

              return {
                anomaly_score: anomalyScore ? parseInt(anomalyScore[1]) : 0,
                anomaly_reason: anomalyReason ? anomalyReason[1] : 'Unknown reason',
                original_source: originalSource ? originalSource[1] : 'Unknown source'
              };
            }
          }
        } else if (typeof log.rawLog.message === 'object') {
          // If rawLog.message is already an object, check if it has ai_ml_logs
          if (log.rawLog.message.ai_ml_logs) {
            return log.rawLog.message.ai_ml_logs;
          }
        }
      }

      return {
        anomaly_score: 0,
        anomaly_reason: 'No ML data found',
        original_source: 'Unknown'
      };
    } catch (error) {
      console.error('Error extracting ML data:', error);
      return {
        anomaly_score: 0,
        anomaly_reason: 'Error extracting ML data',
        original_source: 'Error'
      };
    }
  };

  const getMappedMLLogs = () => {
    return logs.map((log, index) => {
      const parsedLog = parseLogMessage(log);
      const mlData = extractMLData(log);

      return {
        id: index,
        timestamp: parsedLog.timestamp,
        agentName: parsedLog.agent ? parsedLog.agent.name : 'Unknown',
        source: mlData.original_source || 'N/A',
        anomalyScore: mlData.anomaly_score || 0,
        reason: mlData.anomaly_reason || 'Unknown reason',
        fullLog: parsedLog
      };
    });
  };

  // For AI tab data
  const getMappedAILogs = () => {
    return logs.map((log, index) => {
      const parsedLog = parseLogMessage(log);
      return {
        id: index,
        timestamp: parsedLog.timestamp,
        agentName: parsedLog.agent ? parsedLog.agent.name : 'Unknown',
        ruleLevel: parsedLog.rule ? parsedLog.rule.level : 0,
        description: parsedLog.rule ? parsedLog.rule.description : '',
        fullLog: parsedLog
      };
    });
  };

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

      // Use the exact parameter names from your original endpoint
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
        console.log(`Received logs:`, response.data.logs);
        setLogs(response.data.logs);
        setTotalLogs(response.data.total || response.data.logs.length);
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (error) {
      console.error(`Error fetching Sentinel ${activeTab === 0 ? 'AI' : 'ML'} logs:`, error);
      setError(error.response?.data?.message || error.message || 'Failed to fetch logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, activeTab]);

  useEffect(() => {
    fetchSentinelAILogs();
  }, [fetchSentinelAILogs, refreshTrigger]);

  // Handle refresh button click
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Handle time range change
  const handleTimeRangeChange = (event) => {
    setTimeRange(event.target.value);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (newRowsPerPage) => {
    setRowsPerPage(newRowsPerPage);
    setPage(0);
  };

  const handleTabChange = (event, newValue) => {
    console.log(`Switching from tab ${activeTab} to tab ${newValue}`);

    // First clear logs to prevent any visual mixing
    setLogs([]);

    // Then update the active tab state
    setActiveTab(newValue);

    // Reset pagination
    setPage(0);

    // Force a refresh to fetch the correct logs for this tab
    setRefreshTrigger(prev => prev + 1);

    // Start loading state immediately
    setLoading(true);
  };

  const handleViewResponse = (log, type) => {
    console.log(`Viewing ${type} response for log:`, log);

    // If we're viewing ML data, make sure the ML data is available in the log
    if (type === 'ml') {
      // Check if we need to copy ML data from the extracted field
      if (log.extracted && log.extracted.mlData && !log.ai_ml_logs) {
        log.ai_ml_logs = log.extracted.mlData;
      }
    } else if (type === 'ai') {
      // For AI logs, ensure AI response is accessible
      if (log.extracted && log.extracted.aiResponse && !log.AI_response) {
        log.AI_response = log.extracted.aiResponse;
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
      field: 'actions',
      headerName: 'Actions',
      flex: 0.8,
      sortable: false,
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
          return params.row.fullLog?.extracted?.mlData?.original_source || 
                 params.row.fullLog?.data?.ai_ml_logs?.original_source || 'N/A';
        } catch (error) {
          return 'N/A';
        }
      }
    },
    {
      field: 'anomalyScore',
      headerName: 'Anomaly Score',
      flex: 0.7,
      valueGetter: (params) => {
        try {
          return params.row.fullLog?.extracted?.mlData?.anomaly_score || 
                 params.row.fullLog?.data?.ai_ml_logs?.anomaly_score || 0;
        } catch (error) {
          return 0;
        }
      },
      renderCell: (params) => {
        const score = params.value;
        return (
          <Typography sx={{ fontWeight: 'bold' }}>
            {score}
          </Typography>
        );
      }
    },
    {
      field: 'severity',
      headerName: 'Severity',
      flex: 0.8,
      renderCell: (params) => {
        try {
          const score = params.row.fullLog?.extracted?.mlData?.anomaly_score || 
                        params.row.fullLog?.data?.ai_ml_logs?.anomaly_score || 0;
          return (
            <Chip
              label={getAnomalySeverity(score)}
              sx={{
                backgroundColor: getAnomalyScoreColor(score),
                color: 'white',
                fontWeight: 'bold'
              }}
              size="small"
            />
          );
        } catch (error) {
          return (
            <Chip
              label="Low"
              sx={{
                backgroundColor: getAnomalyScoreColor(0),
                color: 'white',
                fontWeight: 'bold'
              }}
              size="small"
            />
          );
        }
      }
    },
    {
      field: 'reason',
      headerName: 'Reason',
      flex: 2,
      valueGetter: (params) => {
        try {
          return params.row.fullLog?.extracted?.mlData?.anomaly_reason || 
                 params.row.fullLog?.data?.ai_ml_logs?.anomaly_reason || 'Unknown reason';
        } catch (error) {
          return 'Unknown reason';
        }
      }
    },
    {
      field: 'mlAnalysis',
      headerName: 'ML Analysis',
      flex: 0.8,
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
    const mlData = extractMLData(selectedLog);

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
      <Box p={4}>
        <Typography variant="h4" gutterBottom sx={{ color: '#3366FF', mb: 3 }}>
          Sentinel AI Analysis
          <Typography variant="subtitle1" sx={{ color: 'text.secondary', mt: 1 }}>
            Advanced threat detection and analysis powered by AI
          </Typography>
        </Typography>

        {/* Controls Panel */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {/* Time Range Selector */}
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth variant="outlined" size="small">
              <InputLabel id="time-range-label">Time Range</InputLabel>
              <Select
                labelId="time-range-label"
                value={timeRange}
                onChange={handleTimeRangeChange}
                label="Time Range"
                startAdornment={<DateRangeIcon sx={{ mr: 1, color: 'action.active' }} />}
              >
                {TimeRangeOptions.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Search Box */}
          <Grid item xs={12} sm={7} md={8}>
            <TextField
              fullWidth
              size="small"
              variant="outlined"
              placeholder="Search logs by agent, description, or IP address..."
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

          {/* Refresh Button */}
          <Grid item xs={12} sm={2} md={1}>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              onClick={handleRefresh}
              sx={{ height: '40px' }}
              disabled={loading}
            >
              <RefreshIcon />
            </Button>
          </Grid>
        </Grid>

        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          sx={{ mb: 3 }}
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

        {/* DataGrid for logs */}
        <Paper elevation={2} sx={{ mb: 3 }}>
          <Box sx={{
            height: 650,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <DataGrid
              rows={activeTab === 0 ? getMappedAILogs() : getMappedMLLogs()}
              columns={activeTab === 0 ? aiColumns : mlColumns}
              pageSize={rowsPerPage}
              rowsPerPageOptions={[50, 100, 500, 1000]}
              onPageSizeChange={(newPageSize) => setRowsPerPage(newPageSize)}
              pagination
              disableSelectionOnClick
              loading={loading}
              density="standard"
              initialState={{
                pagination: {
                  pageSize: 1000,
                },
              }}
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

        {/* Log Details Dialog */}
        <Dialog
          open={Boolean(selectedLog)}
          onClose={closeDialog}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{
            backgroundColor: viewType === 'ai' ? '#e3f2fd' : '#f3e5f5', // Blue for AI, Purple for ML
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <Typography variant="h6">
              {viewType === 'ai' ? 'AI Analysis Results' : 'ML Analysis Results'}
            </Typography>
            <IconButton
              aria-label="close"
              onClick={closeDialog}
              size="small"
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ mt: 2 }}>
            {!showResponse ? (
              <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                height="200px"
              >
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
                        fontFamily: 'monospace',
                        whiteSpace: 'pre-wrap',
                        maxHeight: '400px',
                        overflow: 'auto'
                      }}
                    >
                      <TypewriterEffect text={getAIResponse(selectedLog)} />
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