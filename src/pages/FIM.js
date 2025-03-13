import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Box,
    Typography,
    Paper,
    Table,
    TableContainer,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    Chip,
    Grid,
    Link,
    Dialog,
    DialogTitle,
    DialogContent,
    IconButton,
    CircularProgress,
    Pagination,
    Alert,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    InputAdornment
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';

// Define API URL from environment or default
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const FIM = () => {
    // State variables
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedLog, setSelectedLog] = useState(null);
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [eventFilter, setEventFilter] = useState(''); // Filter by event type
    const [pathFilter, setPathFilter] = useState(''); // Filter by file path
    const [searchQuery, setSearchQuery] = useState(''); // General search
    const [eventCounts, setEventCounts] = useState({
        added: 0,
        modified: 0,
        deleted: 0
    });

    // Fetch logs from API
    useEffect(() => {
        const fetchFIMLogs = async () => {
            try {
                setLoading(true);

                // Fetch paginated logs for the table with filters
                const response = await axios.get(`${API_URL}/api/logs/fim`, {
                    params: {
                        page: page,
                        limit: rowsPerPage,
                        event: eventFilter,
                        path: pathFilter,
                        search: searchQuery
                    }
                });

                setLogs(response.data.logs || []);
                // Calculate total pages based on response
                setTotalPages(Math.ceil(response.data.totalLogs / rowsPerPage) || 1);
                // Set event counts for summary
                setEventCounts(response.data.eventCounts || {
                    added: 0,
                    modified: 0,
                    deleted: 0
                });

                setError(null);
            } catch (err) {
                console.error('Error fetching FIM logs:', err);
                setError('Failed to fetch File Integrity Monitoring logs. Please try again.');
                setLogs([]);
            } finally {
                setLoading(false);
            }
        };

        fetchFIMLogs();
    }, [page, rowsPerPage, eventFilter, pathFilter, searchQuery]);

    // Handler for viewing log details
    const handleViewDetails = (log) => {
        setSelectedLog(log);
    };

    // Format timestamp to be more readable
    const formatTimestamp = (timestamp) => {
        if (!timestamp) return 'N/A';
        try {
            const date = new Date(timestamp);
            return date.toLocaleString();
        } catch (e) {
            return timestamp;
        }
    };

    // Get color for event type
    const getEventColor = (event) => {
        if (!event) return 'default';

        const eventLower = String(event).toLowerCase();
        if (eventLower === 'added') return 'success';
        if (eventLower === 'modified') return 'warning';
        if (eventLower === 'deleted') return 'error';
        return 'default';
    };

    // Handle search input changes with debounce
    const handleSearchChange = (event) => {
        setSearchQuery(event.target.value);
        setPage(1); // Reset to first page when searching
    };

    // Handle path filter changes
    const handlePathFilterChange = (event) => {
        setPathFilter(event.target.value);
        setPage(1); // Reset to first page when changing filter
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                File Integrity Monitoring
            </Typography>

            {/* Event counts summary */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={4}>
                    <Paper
                        sx={{
                            p: 2,
                            textAlign: 'center',
                            backgroundColor: '#e8f5e9',
                            borderLeft: '4px solid #4caf50'
                        }}
                    >
                        <Typography variant="h6">Added Files</Typography>
                        <Typography variant="h4">{eventCounts.added}</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Paper
                        sx={{
                            p: 2,
                            textAlign: 'center',
                            backgroundColor: '#fff8e1',
                            borderLeft: '4px solid #ff9800'
                        }}
                    >
                        <Typography variant="h6">Modified Files</Typography>
                        <Typography variant="h4">{eventCounts.modified}</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Paper
                        sx={{
                            p: 2,
                            textAlign: 'center',
                            backgroundColor: '#ffebee',
                            borderLeft: '4px solid #f44336'
                        }}
                    >
                        <Typography variant="h6">Deleted Files</Typography>
                        <Typography variant="h4">{eventCounts.deleted}</Typography>
                    </Paper>
                </Grid>
            </Grid>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {/* Filter controls */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={4}>
                    <FormControl variant="outlined" size="small" fullWidth>
                        <InputLabel id="event-filter-label">Filter by Event</InputLabel>
                        <Select
                            labelId="event-filter-label"
                            value={eventFilter}
                            onChange={(e) => {
                                setEventFilter(e.target.value);
                                setPage(1); // Reset to first page when changing filter
                            }}
                            label="Filter by Event"
                        >
                            <MenuItem value="">All Events</MenuItem>
                            <MenuItem value="added">Added</MenuItem>
                            <MenuItem value="modified">Modified</MenuItem>
                            <MenuItem value="deleted">Deleted</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                    <TextField
                        fullWidth
                        size="small"
                        label="Filter by Path"
                        value={pathFilter}
                        onChange={handlePathFilterChange}
                        placeholder="e.g. /users/downloads"
                    />
                </Grid>
                <Grid item xs={12} md={4}>
                    <TextField
                        fullWidth
                        size="small"
                        label="Search"
                        value={searchQuery}
                        onChange={handleSearchChange}
                        placeholder="Search in logs..."
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon />
                                </InputAdornment>
                            ),
                        }}
                    />
                </Grid>
            </Grid>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <>
                    {logs.length === 0 ? (
                        <Paper sx={{ p: 3, textAlign: 'center' }}>
                            <Typography variant="h6">No FIM logs found</Typography>
                            <Typography variant="body2" color="textSecondary">
                                There are currently no file integrity monitoring logs that match your filter criteria.
                            </Typography>
                        </Paper>
                    ) : (
                        <>
                            <TableContainer component={Paper} sx={{ mb: 3 }}>
                                <Table sx={{ minWidth: 650 }} aria-label="file integrity monitoring logs table">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Timestamp</TableCell>
                                            <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Event</TableCell>
                                            <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Path</TableCell>
                                            <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Agent</TableCell>
                                            <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Rule Level</TableCell>
                                            <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {logs.map((log) => (
                                            <TableRow key={log._id || log.id || Math.random().toString()} hover>
                                                <TableCell>{formatTimestamp(log.timestamp)}</TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={log.event || 'Unknown'}
                                                        color={getEventColor(log.event)}
                                                        size="small"
                                                    />
                                                </TableCell>
                                                <TableCell sx={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {log.path || 'N/A'}
                                                </TableCell>
                                                <TableCell>{log.agent || 'Unknown'}</TableCell>
                                                <TableCell>{log.ruleLevel || 'N/A'}</TableCell>
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
                                        ))}
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
                                            onChange={(e) => {
                                                setRowsPerPage(parseInt(e.target.value, 10));
                                                setPage(1); // Reset to first page when changing rows per page
                                            }}
                                            label="Rows per page"
                                        >
                                            <MenuItem value={10}>10</MenuItem>
                                            <MenuItem value={25}>25</MenuItem>
                                            <MenuItem value={50}>50</MenuItem>
                                            <MenuItem value={100}>100</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} sm={6} md={8} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <Pagination
                                        count={totalPages}
                                        page={page}
                                        onChange={(e, newPage) => setPage(newPage)}
                                        color="primary"
                                        showFirstButton
                                        showLastButton
                                    />
                                </Grid>
                            </Grid>

                            {/* Log Details Dialog */}
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
                                    <Typography variant="h6">FIM Log Details</Typography>
                                    <IconButton
                                        aria-label="close"
                                        onClick={() => setSelectedLog(null)}
                                        size="small"
                                    >
                                        <CloseIcon />
                                    </IconButton>
                                </DialogTitle>
                                <DialogContent>
                                    {selectedLog && (
                                        <Box sx={{ mt: 2 }}>
                                            {/* FIM-specific details */}
                                            <Box sx={{ mb: 3 }}>
                                                <Typography variant="h6" gutterBottom>
                                                    File Information
                                                </Typography>

                                                <Grid container spacing={2}>
                                                    <Grid item xs={12} sm={6}>
                                                        <Typography variant="subtitle2">Event:</Typography>
                                                        <Chip
                                                            label={selectedLog.event || 'Unknown'}
                                                            color={getEventColor(selectedLog.event)}
                                                            size="small"
                                                            sx={{ mb: 1 }}
                                                        />
                                                    </Grid>
                                                    <Grid item xs={12} sm={6}>
                                                        <Typography variant="subtitle2">Rule Level:</Typography>
                                                        <Typography variant="body2" sx={{ mb: 1 }}>
                                                            {selectedLog.ruleLevel || 'N/A'}
                                                        </Typography>
                                                    </Grid>
                                                    <Grid item xs={12}>
                                                        <Typography variant="subtitle2">Path:</Typography>
                                                        <Typography variant="body2" sx={{ mb: 1 }}>
                                                            {selectedLog.path || 'N/A'}
                                                        </Typography>
                                                    </Grid>
                                                    <Grid item xs={12} sm={6}>
                                                        <Typography variant="subtitle2">Agent:</Typography>
                                                        <Typography variant="body2" sx={{ mb: 1 }}>
                                                            {selectedLog.agent || 'N/A'}
                                                        </Typography>
                                                    </Grid>
                                                    <Grid item xs={12} sm={6}>
                                                        <Typography variant="subtitle2">Mode:</Typography>
                                                        <Typography variant="body2" sx={{ mb: 1 }}>
                                                            {selectedLog.mode || 'N/A'}
                                                        </Typography>
                                                    </Grid>
                                                    <Grid item xs={12} sm={6}>
                                                        <Typography variant="subtitle2">Size Before:</Typography>
                                                        <Typography variant="body2" sx={{ mb: 1 }}>
                                                            {selectedLog.sizeBefore ? `${selectedLog.sizeBefore} bytes` : 'N/A'}
                                                        </Typography>
                                                    </Grid>
                                                    <Grid item xs={12} sm={6}>
                                                        <Typography variant="subtitle2">Size After:</Typography>
                                                        <Typography variant="body2" sx={{ mb: 1 }}>
                                                            {selectedLog.sizeAfter ? `${selectedLog.sizeAfter} bytes` : 'N/A'}
                                                        </Typography>
                                                    </Grid>
                                                    <Grid item xs={12}>
                                                        <Typography variant="subtitle2">Rule Description:</Typography>
                                                        <Typography variant="body2" sx={{ mb: 1 }}>
                                                            {selectedLog.ruleDescription || 'N/A'}
                                                        </Typography>
                                                    </Grid>
                                                </Grid>

                                                {/* File Hash Information */}
                                                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                                                    File Hash Information
                                                </Typography>
                                                <Grid container spacing={2}>
                                                    {selectedLog.hashBefore?.md5 && (
                                                        <>
                                                            <Grid item xs={12}>
                                                                <Typography variant="subtitle2">MD5 Before:</Typography>
                                                                <Typography variant="body2" sx={{ mb: 1, fontFamily: 'monospace' }}>
                                                                    {selectedLog.hashBefore.md5}
                                                                </Typography>
                                                            </Grid>
                                                            <Grid item xs={12}>
                                                                <Typography variant="subtitle2">SHA1 Before:</Typography>
                                                                <Typography variant="body2" sx={{ mb: 1, fontFamily: 'monospace' }}>
                                                                    {selectedLog.hashBefore.sha1 || 'N/A'}
                                                                </Typography>
                                                            </Grid>
                                                            <Grid item xs={12}>
                                                                <Typography variant="subtitle2">SHA256 Before:</Typography>
                                                                <Typography variant="body2" sx={{ mb: 1, fontFamily: 'monospace' }}>
                                                                    {selectedLog.hashBefore.sha256 || 'N/A'}
                                                                </Typography>
                                                            </Grid>
                                                        </>
                                                    )}

                                                    {selectedLog.hashAfter?.md5 && (
                                                        <>
                                                            <Grid item xs={12}>
                                                                <Typography variant="subtitle2">MD5 After:</Typography>
                                                                <Typography variant="body2" sx={{ mb: 1, fontFamily: 'monospace' }}>
                                                                    {selectedLog.hashAfter.md5}
                                                                </Typography>
                                                            </Grid>
                                                            <Grid item xs={12}>
                                                                <Typography variant="subtitle2">SHA1 After:</Typography>
                                                                <Typography variant="body2" sx={{ mb: 1, fontFamily: 'monospace' }}>
                                                                    {selectedLog.hashAfter.sha1 || 'N/A'}
                                                                </Typography>
                                                            </Grid>
                                                            <Grid item xs={12}>
                                                                <Typography variant="subtitle2">SHA256 After:</Typography>
                                                                <Typography variant="body2" sx={{ mb: 1, fontFamily: 'monospace' }}>
                                                                    {selectedLog.hashAfter.sha256 || 'N/A'}
                                                                </Typography>
                                                            </Grid>
                                                        </>
                                                    )}
                                                </Grid>

                                                {/* File Permissions */}
                                                {selectedLog.rawSyscheck?.win_perm_after && (
                                                    <>
                                                        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                                                            File Permissions
                                                        </Typography>
                                                        <TableContainer component={Paper} sx={{ mb: 2 }}>
                                                            <Table size="small">
                                                                <TableHead>
                                                                    <TableRow>
                                                                        <TableCell>User/Group</TableCell>
                                                                        <TableCell>Permissions</TableCell>
                                                                    </TableRow>
                                                                </TableHead>
                                                                <TableBody>
                                                                    {Array.isArray(selectedLog.rawSyscheck.win_perm_after) ?
                                                                        selectedLog.rawSyscheck.win_perm_after.map((perm, idx) => (
                                                                            <TableRow key={idx}>
                                                                                <TableCell>{perm.name || 'Unknown'}</TableCell>
                                                                                <TableCell>
                                                                                    {Array.isArray(perm.allowed) ? perm.allowed.join(', ') : 'N/A'}
                                                                                </TableCell>
                                                                            </TableRow>
                                                                        )) : (
                                                                            <TableRow>
                                                                                <TableCell colSpan={2}>No permission information available</TableCell>
                                                                            </TableRow>
                                                                        )
                                                                    }
                                                                </TableBody>
                                                            </Table>
                                                        </TableContainer>
                                                    </>
                                                )}

                                                {/* File Attributes */}
                                                {selectedLog.rawSyscheck?.attrs_after && (
                                                    <>
                                                        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                                                            File Attributes
                                                        </Typography>
                                                        <Paper sx={{ p: 2, backgroundColor: '#f8f8f8' }}>
                                                            {Array.isArray(selectedLog.rawSyscheck.attrs_after) ?
                                                                selectedLog.rawSyscheck.attrs_after.map((attr, idx) => (
                                                                    <Chip
                                                                        key={idx}
                                                                        label={attr}
                                                                        size="small"
                                                                        sx={{ m: 0.5 }}
                                                                    />
                                                                )) : (
                                                                    <Typography>No attribute information available</Typography>
                                                                )
                                                            }
                                                        </Paper>
                                                    </>
                                                )}
                                            </Box>

                                            {/* Display full log for debugging */}
                                            <Typography variant="h6" gutterBottom>
                                                Raw Log Data
                                            </Typography>
                                            <Paper
                                                elevation={1}
                                                sx={{
                                                    p: 2,
                                                    maxHeight: '300px',
                                                    overflow: 'auto',
                                                    backgroundColor: '#f8f8f8',
                                                    fontFamily: 'monospace'
                                                }}
                                            >
                                                <pre>{JSON.stringify(selectedLog.rawLog || selectedLog, null, 2)}</pre>
                                            </Paper>
                                        </Box>
                                    )}
                                </DialogContent>
                            </Dialog>
                        </>
                    )}
                </>
            )}
        </Box>
    );
};

export default FIM;