import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, CircularProgress, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TablePagination, Chip, Grid, Card, CardContent,
  IconButton, Divider, Dialog, DialogTitle, DialogContent
} from '@mui/material';
import axios from 'axios';
import { API_URL } from '../config';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { StructuredLogView, parseLogMessage } from '../utils/normalizeLogs';

const Configuration = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalRows, setTotalRows] = useState(0);
  const [selectedLog, setSelectedLog] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [parsedLog, setParsedLog] = useState(null);
  const [scaPolicies, setScaPolicies] = useState({});
  const [scaResults, setScaResults] = useState({ pass: 0, fail: 0, unknown: 0 });

  // Format timestamp to Indian format (Asia/Kolkata)
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';

    // Create date with time zone conversion
    const date = new Date(timestamp);

    // Format for Indian timezone (IST, UTC+5:30)
    const options = {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    };

    return new Intl.DateTimeFormat('en-IN', options).format(date);
  };

  const fetchConfigurationLogs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/logs/configuration`, {
        params: {
          page,
          pageSize
        }
      });

      // Process logs to ensure all fields are properly extracted
      const processedLogs = response.data.logs.map(log => {
        // Parse rawLog.message if it's a string
        let parsedMessage = null;
        if (log.rawLog?.message && typeof log.rawLog.message === 'string') {
          try {
            parsedMessage = JSON.parse(log.rawLog.message);
          } catch (e) {
            console.error('Error parsing rawLog.message:', e);
          }
        }

        return {
          ...log,
          id: log._id,
          // Ensure agent name is extracted properly
          agent: {
            name: log.agent?.name ||
              (parsedMessage?.agent?.name) ||
              (log.rawLog?.message?.agent?.name) ||
              'Unknown'
          },
          // Ensure rule details are extracted properly
          rule: {
            level: log.rule?.level ||
              (parsedMessage?.rule?.level) ||
              (log.rawLog?.message?.rule?.level) ||
              '0',
            description: log.rule?.description ||
              (parsedMessage?.rule?.description) ||
              (log.rawLog?.message?.rule?.description) ||
              'No description'
          },
          // Extract location
          location: log.location ||
            (parsedMessage?.location) ||
            (log.rawLog?.location) ||
            'Unknown',
          // Preserve the original data for detail view
          rawLog: log.rawLog
        };
      });

      setLogs(processedLogs);
      setTotalRows(response.data.total);

      // Process SCA data for visualization
      const policies = {};
      let results = { pass: 0, fail: 0, unknown: 0 };

      processedLogs.forEach(log => {
        const scaData = extractScaData(log);
        if (scaData) {
          // Count policies
          if (scaData.policy) {
            policies[scaData.policy] = (policies[scaData.policy] || 0) + 1;
          }

          // Count results
          if (scaData.check?.result) {
            const result = scaData.check.result.toLowerCase();
            if (result === 'passed' || result === 'pass') {
              results.pass++;
            } else if (result === 'failed' || result === 'fail') {
              results.fail++;
            } else {
              results.unknown++;
            }
          }
        }
      });

      setScaPolicies(policies);
      setScaResults(results);

    } catch (error) {
      console.error('Error fetching configuration logs:', error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    fetchConfigurationLogs();
  }, [fetchConfigurationLogs]);

  const handleRefresh = () => {
    fetchConfigurationLogs();
  };

  const handleViewLog = (log) => {
    setSelectedLog(log);
    const normalized = parseLogMessage(log);
    setParsedLog(normalized);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedLog(null);
  };

  const extractScaData = (log) => {
    try {
      // Try to get from data field directly
      if (log.data?.sca) {
        return log.data.sca;
      }

      // Try to parse from rawLog.message if it's a string
      if (typeof log.rawLog?.message === 'string') {
        try {
          const parsed = JSON.parse(log.rawLog.message);
          if (parsed?.data?.sca) {
            return parsed.data.sca;
          }
          return null;
        } catch {
          return null;
        }
      }
      // Try to access from rawLog.message if it's an object
      else if (log.rawLog?.message?.data?.sca) {
        return log.rawLog.message.data.sca;
      }

      return null;
    } catch (error) {
      console.error('Error extracting SCA data:', error);
      return null;
    }
  };

  const extractGroups = (rawLog) => {
    try {
      if (typeof rawLog?.message === 'string') {
        try {
          const parsed = JSON.parse(rawLog.message);
          return parsed?.rule?.groups || [];
        } catch {
          return [];
        }
      } else if (rawLog?.message?.rule?.groups) {
        return rawLog.message.rule.groups;
      } else if (rawLog?.rule?.groups) {
        return rawLog.rule.groups;
      }
      return [];
    } catch (error) {
      return [];
    }
  };

  return (
    <Box sx={{ width: '100%', padding: 2 }}>
      <Paper sx={{ width: '100%', padding: 3, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Security Configuration Assessment
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card variant="outlined" sx={{ mb: 3, p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" component="h3">
                  SCA Logs
                </Typography>
                <Button
                  variant="contained"
                  onClick={handleRefresh}
                  startIcon={<RefreshIcon />}
                >
                  Refresh
                </Button>
              </Box>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" component="h3" gutterBottom>
                  Configuration Assessment Logs
                </Typography>
                <Box style={{ width: '100%', overflow: 'auto' }}>
                  {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 4 }}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    <TableContainer sx={{ maxHeight: 400 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell>Timestamp</TableCell>
                            <TableCell>Agent</TableCell>
                            <TableCell>Level</TableCell>
                            <TableCell>Description</TableCell>
                            <TableCell>Location</TableCell>
                            <TableCell>Security Groups</TableCell>
                            <TableCell>Action</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {logs.length > 0 ? (
                            logs.map((log) => (
                              <TableRow key={log.id}>
                                <TableCell>{formatTimestamp(log.timestamp)}</TableCell>
                                <TableCell>{log.agent?.name || 'Unknown'}</TableCell>
                                <TableCell>
                                  <Chip
                                    label={log.rule?.level || '0'}
                                    size="small"
                                    color={
                                      parseInt(log.rule?.level) >= 10 ? "error" :
                                        parseInt(log.rule?.level) >= 7 ? "warning" :
                                          "default"
                                    }
                                  />
                                </TableCell>
                                <TableCell sx={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {log.rule?.description || 'No description'}
                                </TableCell>
                                <TableCell>{log.location || 'Unknown'}</TableCell>
                                <TableCell>{extractGroups(log.rawLog).join(', ')}</TableCell>
                                <TableCell>
                                  {extractScaData(log)?.check?.result && (
                                    <Chip
                                      label={extractScaData(log).check.result}
                                      size="small"
                                      color={
                                        extractScaData(log).check.result.toLowerCase() === 'passed' ? 'success' :
                                          extractScaData(log).check.result.toLowerCase() === 'failed' ? 'error' :
                                            'default'
                                      }
                                      sx={{ mr: 1 }}
                                    />
                                  )}
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={() => handleViewLog(log)}
                                  >
                                    <VisibilityIcon fontSize="small" />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={7} align="center">
                                No configuration logs found
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                      <TablePagination
                        component="div"
                        count={totalRows}
                        page={page}
                        onPageChange={(event, newPage) => setPage(newPage)}
                        rowsPerPage={pageSize}
                        onRowsPerPageChange={(event) => setPageSize(parseInt(event.target.value, 10))}
                        rowsPerPageOptions={[10, 25, 50, 100]}
                      />
                    </TableContainer>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" component="h3" gutterBottom>
                  SCA Policies
                </Typography>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, mb: 2 }}>
                    <CircularProgress size={30} />
                  </Box>
                ) : (
                  <Box>
                    {Object.keys(scaPolicies).length > 0 ? (
                      <TableContainer sx={{ maxHeight: 200 }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Policy</TableCell>
                              <TableCell align="right">Count</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {Object.entries(scaPolicies).map(([policy, count]) => (
                              <TableRow key={policy}>
                                <TableCell>{policy}</TableCell>
                                <TableCell align="right">{count}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No policy data available
                      </Typography>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" component="h3" gutterBottom>
                  SCA Check Results
                </Typography>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, mb: 2 }}>
                    <CircularProgress size={30} />
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', justifyContent: 'space-around', pt: 2 }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Chip
                        label={`Passed: ${scaResults.pass}`}
                        color="success"
                        sx={{ minWidth: 100, mb: 1 }}
                      />
                    </Box>
                    <Box sx={{ textAlign: 'center' }}>
                      <Chip
                        label={`Failed: ${scaResults.fail}`}
                        color="error"
                        sx={{ minWidth: 100, mb: 1 }}
                      />
                    </Box>
                    <Box sx={{ textAlign: 'center' }}>
                      <Chip
                        label={`Unknown: ${scaResults.unknown}`}
                        color="default"
                        sx={{ minWidth: 100, mb: 1 }}
                      />
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
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
            <Typography variant="h6">Configuration Log Details</Typography>
            <IconButton edge="end" color="inherit" onClick={handleCloseDialog} aria-label="close">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedLog && parsedLog && <StructuredLogView data={parsedLog} />}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default Configuration;