import React, { useState, useEffect, useCallback } from 'react';
import {Box,Typography,Table,TableBody,TableCell,TableContainer,TableHead,TableRow,Paper,
        Alert,TextField,InputAdornment,CircularProgress,Link,Dialog,DialogTitle,DialogContent,
        IconButton,Chip,Pagination,FormControl,InputLabel,Select,MenuItem,Grid
    } from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import CloseIcon from '@mui/icons-material/Close';
import ComplianceIcon from '@mui/icons-material/VerifiedUser';
import axios from 'axios';
import { parseLogMessage } from '../utils/normalizeLogs';
import SessionLogView from '../components/SessionLogView';
import { API_URL } from '../config';
import { useTheme } from '@mui/material/styles';
import Skeleton from '@mui/material/Skeleton';


const SessionLogs = () => {
    const [logs, setLogs] = useState([]);
    const [filteredLogs, setFilteredLogs] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedLog, setSelectedLog] = useState(null);
    const theme = useTheme();
    
    // Pagination states
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [displayedLogs, setDisplayedLogs] = useState([]);

    const getRuleLevelColor = (level) => {
        const numLevel = parseInt(level);
        if (numLevel >= 12) return "error";
        if (numLevel >= 8) return "warning";
        if (numLevel >= 4) return "info";
        return "success";
    };

    const fetchSessionLogs = useCallback(async (search) => {
        try {
            setLoading(true);
            setError(null);

            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Authentication token not found');
            }

            const response = await axios.get(
                `${API_URL}/api/logs/session${search ? `?search=${encodeURIComponent(search)}` : ''}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            // Parse each log with parseLogMessage
            const parsedLogs = response.data
                .map(log => ({
                    ...log,
                    parsed: parseLogMessage(log)
                }))
                .filter(log => log.parsed !== null);

            setLogs(parsedLogs);
            setFilteredLogs(parsedLogs);
            setTotalPages(Math.ceil(parsedLogs.length / rowsPerPage));
            setPage(1); // Reset to first page when new data is loaded
        } catch (error) {
            console.error('Error fetching session logs:', error);
            setError(error.response?.data?.message || error.message || 'Failed to fetch session logs');
            setLogs([]);
            setFilteredLogs([]);
            setTotalPages(0);
        } finally {
            setLoading(false);
        }
    }, [rowsPerPage]);

    // Client-side filtering
    useEffect(() => {
        if (searchTerm.trim() === '') {
            setFilteredLogs(logs);
            setTotalPages(Math.ceil(logs.length / rowsPerPage));
        } else {
            const lowerSearchTerm = searchTerm.toLowerCase();
            const filtered = logs.filter(log => {
                const parsedLog = log.parsed;
                if (!parsedLog) return false;
                
                // Search in raw log message if available
                if (parsedLog.rawData?.message?.toLowerCase().includes(lowerSearchTerm)) return true;
                // Search in agent name
                if (parsedLog.agent?.name?.toLowerCase().includes(lowerSearchTerm)) return true;
                
                // Search in rule description
                if (parsedLog.rule?.description?.toLowerCase().includes(lowerSearchTerm)) return true;
                
                // Search in compliance standards
                const complianceTypes = [
                    parsedLog.rule?.hipaa?.join(' ') || '',
                    parsedLog.rule?.gdpr?.join(' ') || '',
                    parsedLog.rule?.nist_800_53?.join(' ') || '',
                    parsedLog.rule?.pci_dss?.join(' ') || '',
                    parsedLog.rule?.tsc?.join(' ') || '',
                    parsedLog.rule?.gpg13?.join(' ') || ''
                ].join(' ').toLowerCase();
                
                if (complianceTypes.includes(lowerSearchTerm)) return true;
                
                
                return false;
            });
            
            setFilteredLogs(filtered);
            setTotalPages(Math.ceil(filtered.length / rowsPerPage));
            setPage(1); // Reset to first page when filter changes
        }
    }, [searchTerm, logs, rowsPerPage]);

    // Update displayed logs when page, rowsPerPage or filteredLogs change
    useEffect(() => {
        const startIndex = (page - 1) * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;
        setDisplayedLogs(filteredLogs.slice(startIndex, endIndex));
    }, [page, rowsPerPage, filteredLogs]);

    // Fetch initial data
    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            fetchSessionLogs(searchTerm);
        }, 500);

        return () => clearTimeout(debounceTimer);
    }, [fetchSessionLogs,searchTerm]);

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

    const handleViewDetails = (log) => {
        // Use the same parsing logic as LogDetails.js
        const parsedLog = parseLogMessage(log);
        setSelectedLog(parsedLog);
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(1); // Reset to first page when changing rows per page
    };



    return (
        <Box p={4}>
            <Typography variant="h4" gutterBottom sx={{ color: '#2196f3', mb: 3 }}>
                Compliance Monitoring
                <Typography variant="subtitle1" sx={{ color: 'text.secondary', mt: 1 }}>
                    Tracking Security Standards Compliance
                </Typography>
            </Typography>

            <TextField
                fullWidth
                margin="normal"
                variant="outlined"
                placeholder="Search logs by agent, description, or compliance standard..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            {loading ? <CircularProgress size={20} /> : <SearchIcon />}
                        </InputAdornment>
                    ),
                }}
                sx={{ mb: 3 }}
            />

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            <Alert
                icon={<ComplianceIcon />}
                severity="info"
                sx={{ mb: 3 }}
            >
                {loading ? (
        <Box display="flex" alignItems="center">
            <CircularProgress size={20} sx={{ mr: 1 }} /> Loading compliance logs...
        </Box>
    ) : (
        `${filteredLogs.length} compliance-related logs found`
    )}
            </Alert>

            <TableContainer component={Paper} sx={{ maxHeight: 'calc(100vh - 400px)' }}>
                <Table stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell style={{ fontWeight: 'bold', backgroundColor: theme.palette.mode === 'dark' ? '#353536' : '#f5f5f5' }}>Timestamp</TableCell>
                            <TableCell style={{ fontWeight: 'bold', backgroundColor: theme.palette.mode === 'dark' ? '#353536' : '#f5f5f5' }}>Agent Name</TableCell>
                            <TableCell style={{ fontWeight: 'bold', backgroundColor: theme.palette.mode === 'dark' ? '#353536' : '#f5f5f5' }}>Rule Level</TableCell>
                            <TableCell style={{ fontWeight: 'bold', backgroundColor: theme.palette.mode === 'dark' ? '#353536' : '#f5f5f5' }}>Description</TableCell>
                            <TableCell style={{ fontWeight: 'bold', backgroundColor: theme.palette.mode === 'dark' ? '#353536' : '#f5f5f5' }}>Compliance</TableCell>
                            <TableCell style={{ fontWeight: 'bold', backgroundColor: theme.palette.mode === 'dark' ? '#353536' : '#f5f5f5' }}>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
    {loading ? (
        // Show loading skeletons for the table
        [...Array(rowsPerPage)].map((_, index) => (
            <TableRow key={`skeleton-${index}`}>
                <TableCell><Skeleton /></TableCell>
                <TableCell><Skeleton /></TableCell>
                <TableCell><Skeleton width={60} /></TableCell>
                <TableCell><Skeleton /></TableCell>
                <TableCell><Skeleton width={120} /></TableCell>
                <TableCell><Skeleton width={80} /></TableCell>
            </TableRow>
        ))
    ) : (
        displayedLogs.map((log) => {
            const parsedLog = log.parsed;
            const rule = parsedLog.rule || {};

            const complianceTypes = [
                rule.hipaa?.length && 'HIPAA',
                rule.gdpr?.length && 'GDPR',
                rule.nist_800_53?.length && 'NIST',
                rule.pci_dss?.length && 'PCI DSS',
                rule.tsc?.length && 'TSC',
                rule.gpg13?.length && 'GPG13'
            ].filter(Boolean);

            return (
                <TableRow key={log._id} hover>
                    <TableCell>{formatTimestamp(parsedLog.timestamp)}</TableCell>
                    <TableCell>{parsedLog.agent.name}</TableCell>
                    <TableCell>
                        <Chip 
                            label={rule.level} 
                            size="small"
                            color={getRuleLevelColor(rule.level)}
                        />
                    </TableCell>
                    <TableCell>{rule.description}</TableCell>
                    <TableCell>
                        <Box display="flex" gap={0.5} flexWrap="wrap">
                            {complianceTypes.map((type) => (
                                <Chip
                                    key={type}
                                    label={type}
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                />
                            ))}
                        </Box>
                    </TableCell>
                    <TableCell>
                        <Link
                            component="button"
                            variant="body2"
                            onClick={() => handleViewDetails(log)}
                            sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                        >
                            View Details
                        </Link>
                    </TableCell>
                </TableRow>
            );
        })
    )}
</TableBody>
                </Table>
            </TableContainer>

            {/* Pagination Controls */}
<Grid container spacing={2} alignItems="center" sx={{ mt: 2 }}>
    <Grid item xs={12} sm={6} md={4}>
        <FormControl variant="outlined" size="small" fullWidth>
            <InputLabel id="rows-per-page-label">Rows per page</InputLabel>
            <Select
                labelId="rows-per-page-label"
                value={rowsPerPage}
                onChange={handleChangeRowsPerPage}
                label="Rows per page"
                disabled={loading}
            >
                <MenuItem value={10}>10</MenuItem>
                <MenuItem value={25}>25</MenuItem>
                <MenuItem value={50}>50</MenuItem>
                <MenuItem value={100}>100</MenuItem>
            </Select>
        </FormControl>
    </Grid>
    <Grid item xs={12} sm={6} md={8} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        {loading ? (
            <Skeleton variant="rectangular" width={300} height={36} />
        ) : (
            <Pagination 
                count={totalPages} 
                page={page} 
                onChange={handleChangePage} 
                color="primary"
                showFirstButton
                showLastButton
            />
        )}
    </Grid>
</Grid>

            <Dialog
                open={Boolean(selectedLog)}
                onClose={() => setSelectedLog(null)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle sx={{
                    backgroundColor: '#f5f5f5',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <Typography variant="h6">Log Details</Typography>
                    <IconButton
                        aria-label="close"
                        onClick={() => setSelectedLog(null)}
                        size="small"
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <SessionLogView data={selectedLog} />
                </DialogContent>
            </Dialog>
        </Box>
    );
};

export default SessionLogs;