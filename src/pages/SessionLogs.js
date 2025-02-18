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
    Chip
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import CloseIcon from '@mui/icons-material/Close';
import ComplianceIcon from '@mui/icons-material/VerifiedUser';
import axios from 'axios';
import { parseLogMessage, StructuredLogView } from '../utils/normalizeLogs';
import SessionLogView from '../components/SessionLogView';
import { API_URL } from '../config';

const SessionLogs = () => {
    const [logs, setLogs] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedLog, setSelectedLog] = useState(null);

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
        } catch (error) {
            console.error('Error fetching session logs:', error);
            setError(error.response?.data?.message || error.message || 'Failed to fetch session logs');
            setLogs([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            fetchSessionLogs(searchTerm);
        }, 500);

        return () => clearTimeout(debounceTimer);
    }, [searchTerm, fetchSessionLogs]);

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

    if (loading && !logs.length) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
                <CircularProgress />
            </Box>
        );
    }

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
                            <SearchIcon />
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
                {logs.length} compliance-related logs found
            </Alert>

            <TableContainer component={Paper} sx={{ maxHeight: 'calc(100vh - 300px)' }}>
                <Table stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Timestamp</TableCell>
                            <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Agent Name</TableCell>
                            <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Rule Level</TableCell>
                            <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Description</TableCell>
                            <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Compliance</TableCell>
                            <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {logs.map((log) => {
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