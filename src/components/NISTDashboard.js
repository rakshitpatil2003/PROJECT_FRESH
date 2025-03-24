import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Typography,
    Paper,
    Grid,
    Alert,
    CircularProgress,
    Card,
    CardContent,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Link,
    TextField,
    InputAdornment,
    Dialog,
    DialogTitle,
    DialogContent,
    IconButton,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import CloseIcon from '@mui/icons-material/Close';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import axios from 'axios';
import TablePagination from '@mui/material/TablePagination';
import { parseLogMessage } from '../utils/normalizeLogs';
import SessionLogView from '../components/SessionLogView';
import { API_URL } from '../config';
import * as echarts from 'echarts';
import ExportPDF from '../components/ExportPDF';
import Skeleton from '@mui/material/Skeleton';

const NISTDashboard = () => {
    const [logs, setLogs] = useState([]);
    const [nistLogs, setNistLogs] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedLog, setSelectedLog] = useState(null);
    const [nistStats, setNistStats] = useState({
        totalCount: 0,
        uniqueNistControls: [],
        agentDistribution: {},
        timelineData: [],
        controlSeverity: {},
        controlFamilies: {},
    });
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Charts references
    const dashboardRef = React.useRef(null);
    const timelineChartRef = React.useRef(null);
    const agentDistributionChartRef = React.useRef(null);
    const controlDistributionChartRef = React.useRef(null);
    const severityDistributionChartRef = React.useRef(null);
    const familyDistributionChartRef = React.useRef(null);

    const getRuleLevelColor = (level) => {
        const numLevel = parseInt(level);
        if (numLevel >= 12) return "error";
        if (numLevel >= 8) return "warning";
        if (numLevel >= 4) return "info";
        return "success";
    };

    const processNistStats = useCallback((nistLogs) => {
        // Unique NIST controls
        const nistControls = new Set();

        // Agent distribution
        const agentDistribution = {};

        // Timeline data (group by day)
        const timelineMap = {};

        // Control severity
        const controlSeverity = {};

        // Control Families distribution
        const controlFamilies = {};

        nistLogs.forEach(log => {
            const parsedLog = log.parsed;
            const rule = parsedLog.rule || {};

            // Process NIST controls
            if (rule.nist_800_53 && rule.nist_800_53.length) {
                rule.nist_800_53.forEach(control => {
                    nistControls.add(control);

                    // Track control severity
                    if (!controlSeverity[control]) {
                        controlSeverity[control] = {
                            count: 0,
                            avgLevel: 0,
                            levels: []
                        };
                    }

                    controlSeverity[control].count++;
                    controlSeverity[control].levels.push(parseInt(rule.level));

                    // Track control family
                    const family = extractFamilyFromControl(control);
                    if (!controlFamilies[family]) {
                        controlFamilies[family] = 0;
                    }
                    controlFamilies[family]++;
                });
            }

            // Process agent distribution
            const agentName = parsedLog.agent?.name || 'Unknown';
            if (!agentDistribution[agentName]) {
                agentDistribution[agentName] = 0;
            }
            agentDistribution[agentName]++;

            // Process timeline data
            const timestamp = parsedLog.timestamp;

            const date = typeof timestamp === 'number'
                ? new Date(timestamp * 1000).toISOString().split('T')[0]
                : new Date(timestamp).toISOString().split('T')[0];


            if (!timelineMap[date]) {
                timelineMap[date] = 0;
            }
            timelineMap[date]++;
        });

        // Calculate average severity for each control
        Object.keys(controlSeverity).forEach(control => {
            const levels = controlSeverity[control].levels;
            controlSeverity[control].avgLevel = levels.reduce((sum, level) => sum + level, 0) / levels.length;
        });

        // Convert timeline map to array sorted by date
        const timelineData = Object.entries(timelineMap)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        setNistStats({
            totalCount: nistLogs.length,
            uniqueNistControls: Array.from(nistControls),
            agentDistribution,
            timelineData,
            controlSeverity,
            controlFamilies,
        });
    }, []);

    const fetchLogs = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Authentication token not found');
            }

            const response = await axios.get(
                `${API_URL}/api/logs/session`,
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

            // Filter NIST logs
            const nistFilteredLogs = parsedLogs.filter(log => {
                const parsedLog = log.parsed;
                return parsedLog?.rule?.nist_800_53 && parsedLog.rule.nist_800_53.length > 0;
            });

            setNistLogs(nistFilteredLogs);
            processNistStats(nistFilteredLogs);
        } catch (error) {
            console.error('Error fetching session logs:', error);
            setError(error.response?.data?.message || error.message || 'Failed to fetch session logs');
            setLogs([]);
            setNistLogs([]);
        } finally {
            setLoading(false);
        }
    }, [processNistStats]);

    const extractFamilyFromControl = (control) => {
        // NIST controls typically follow format like AC-1, AU-2, etc.
        // The letters before the hyphen represent the family
        if (!control) return 'Unknown';
        const familyCode = control.split('-')[0];

        // Map family codes to full names
        const familyNames = {
            'AC': 'Access Control',
            'AT': 'Awareness and Training',
            'AU': 'Audit and Accountability',
            'CA': 'Assessment, Authorization, and Monitoring',
            'CM': 'Configuration Management',
            'CP': 'Contingency Planning',
            'IA': 'Identification and Authentication',
            'IR': 'Incident Response',
            'MA': 'Maintenance',
            'MP': 'Media Protection',
            'PE': 'Physical and Environmental Protection',
            'PL': 'Planning',
            'PM': 'Program Management',
            'PS': 'Personnel Security',
            'RA': 'Risk Assessment',
            'SA': 'System and Services Acquisition',
            'SC': 'System and Communications Protection',
            'SI': 'System and Information Integrity'
        };

        return familyNames[familyCode] || `${familyCode} Family`;
    };



    // Initialize and update charts
    useEffect(() => {
        if (loading) return;

        // Timeline Chart
        if (timelineChartRef.current && nistStats.timelineData.length > 0) {
            const timelineChart = echarts.init(timelineChartRef.current);

            const option = {
                title: {
                    text: 'NIST 800-53 Events Timeline',
                    left: 'center'
                },
                tooltip: {
                    trigger: 'axis',
                    formatter: '{b}: {c} events'
                },
                xAxis: {
                    type: 'category',
                    data: nistStats.timelineData.map(item => item.date),
                    axisLabel: {
                        rotate: 45
                    }
                },
                yAxis: {
                    type: 'value',
                    name: 'Event Count'
                },
                series: [
                    {
                        data: nistStats.timelineData.map(item => item.count),
                        type: 'line',
                        smooth: true,
                        lineStyle: {
                            color: '#1976d2',
                            width: 3
                        },
                        symbol: 'circle',
                        symbolSize: 8,
                        itemStyle: {
                            color: '#1976d2'
                        },
                        areaStyle: {
                            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                { offset: 0, color: 'rgba(25, 118, 210, 0.8)' },
                                { offset: 1, color: 'rgba(25, 118, 210, 0.1)' }
                            ])
                        }
                    }
                ],
                grid: {
                    left: '5%',
                    right: '5%',
                    bottom: '15%',
                    containLabel: true
                }
            };

            timelineChart.setOption(option);

            const handleResize = () => {
                timelineChart.resize();
            };

            window.addEventListener('resize', handleResize);

            return () => {
                window.removeEventListener('resize', handleResize);
                timelineChart.dispose();
            };
        }
    }, [nistStats.timelineData, loading]);

    // Agent Distribution Chart
    useEffect(() => {
        if (loading || !agentDistributionChartRef.current) return;

        const agentChart = echarts.init(agentDistributionChartRef.current);

        const agentData = Object.entries(nistStats.agentDistribution)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        const option = {
            title: {
                text: 'NIST 800-53 Events by Agent',
                left: 'center'
            },
            tooltip: {
                trigger: 'item',
                formatter: '{b}: {c} ({d}%)'
            },
            legend: {
                type: 'scroll',
                orient: 'vertical',
                right: 10,
                top: 'middle',
                bottom: 20
            },
            series: [
                {
                    type: 'pie',
                    radius: ['40%', '70%'],
                    avoidLabelOverlap: false,
                    itemStyle: {
                        borderRadius: 10,
                        borderColor: '#fff',
                        borderWidth: 2
                    },
                    label: {
                        show: false,
                        position: 'center'
                    },
                    emphasis: {
                        label: {
                            show: true,
                            fontSize: '18',
                            fontWeight: 'bold'
                        }
                    },
                    labelLine: {
                        show: false
                    },
                    data: agentData
                }
            ]
        };

        agentChart.setOption(option);

        const handleResize = () => {
            agentChart.resize();
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            agentChart.dispose();
        };
    }, [nistStats.agentDistribution, loading]);

    // Control Distribution Chart
    useEffect(() => {
        if (loading || !controlDistributionChartRef.current) return;

        const controlChart = echarts.init(controlDistributionChartRef.current);

        const controlData = Object.entries(nistStats.controlSeverity)
            .map(([control, data]) => ({ control, count: data.count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10); // Top 10 controls

        const option = {
            title: {
                text: 'Top 10 NIST 800-53 Controls',
                left: 'center'
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'shadow'
                }
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                containLabel: true
            },
            xAxis: {
                type: 'value',
                name: 'Event Count'
            },
            yAxis: {
                type: 'category',
                data: controlData.map(item => item.control),
                axisLabel: {
                    interval: 0,
                    rotate: 0,
                    formatter: function (value) {
                        if (value.length > 15) {
                            return value.substring(0, 12) + '...';
                        }
                        return value;
                    }
                }
            },
            series: [
                {
                    name: 'Event Count',
                    type: 'bar',
                    barWidth: '60%',
                    data: controlData.map(item => item.count),
                    itemStyle: {
                        color: function (params) {
                            const colorList = [
                                '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de',
                                '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc', '#5470c6'
                            ];
                            return colorList[params.dataIndex % colorList.length];
                        }
                    }
                }
            ]
        };

        controlChart.setOption(option);

        const handleResize = () => {
            controlChart.resize();
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            controlChart.dispose();
        };
    }, [nistStats.controlSeverity, loading]);

    // Control Family Distribution Chart
    useEffect(() => {
        if (loading || !familyDistributionChartRef.current) return;

        const familyChart = echarts.init(familyDistributionChartRef.current);

        const familyData = Object.entries(nistStats.controlFamilies)
            .map(([family, count]) => ({ family, count }))
            .sort((a, b) => b.count - a.count);

        const option = {
            title: {
                text: 'NIST 800-53 Control Families',
                left: 'center'
            },
            tooltip: {
                trigger: 'item',
                formatter: '{b}: {c} events ({d}%)'
            },
            legend: {
                type: 'scroll',
                orient: 'vertical',
                right: 10,
                top: 'middle',
                bottom: 20,
                formatter: function (name) {
                    return name.length > 15 ? name.substring(0, 12) + '...' : name;
                }
            },
            series: [
                {
                    type: 'pie',
                    radius: '55%',
                    center: ['40%', '50%'],
                    data: familyData.map(item => ({
                        name: item.family,
                        value: item.count
                    })),
                    emphasis: {
                        itemStyle: {
                            shadowBlur: 10,
                            shadowOffsetX: 0,
                            shadowColor: 'rgba(0, 0, 0, 0.5)'
                        }
                    },
                    labelLine: {
                        length: 10,
                        length2: 10,
                        smooth: true
                    },
                    label: {
                        formatter: '{b}\n{c} ({d}%)'
                    }
                }
            ]
        };

        familyChart.setOption(option);

        const handleResize = () => {
            familyChart.resize();
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            familyChart.dispose();
        };
    }, [nistStats.controlFamilies, loading]);

    // Severity Distribution Chart
    useEffect(() => {
        if (loading || !severityDistributionChartRef.current) return;

        const severityChart = echarts.init(severityDistributionChartRef.current);

        // Group logs by severity level
        const severityDistribution = nistLogs.reduce((acc, log) => {
            const level = parseInt(log.parsed.rule?.level) || 0;
            if (!acc[level]) {
                acc[level] = 0;
            }
            acc[level]++;
            return acc;
        }, {});

        const severityData = Object.entries(severityDistribution)
            .map(([level, count]) => ({ level: parseInt(level), count }))
            .sort((a, b) => a.level - b.level);

        const option = {
            title: {
                text: 'Events by Severity Level',
                left: 'center'
            },
            tooltip: {
                trigger: 'item',
                formatter: 'Level {b}: {c} events ({d}%)'
            },
            series: [
                {
                    name: 'Severity Level',
                    type: 'pie',
                    radius: '50%',
                    data: severityData.map(item => ({
                        name: item.level.toString(),
                        value: item.count,
                        itemStyle: {
                            color: function getRuleLevelColor(level) {
                                if (level >= 12) return '#f44336'; // Red
                                if (level >= 8) return '#ff9800';  // Orange
                                if (level >= 4) return '#2196f3';  // Blue
                                return '#4caf50';                 // Green
                            }(item.level)
                        }
                    })),
                    emphasis: {
                        itemStyle: {
                            shadowBlur: 10,
                            shadowOffsetX: 0,
                            shadowColor: 'rgba(0, 0, 0, 0.5)'
                        }
                    },
                    label: {
                        formatter: 'Level {b}\n{c} ({d}%)'
                    }
                }
            ]
        };

        severityChart.setOption(option);

        const handleResize = () => {
            severityChart.resize();
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            severityChart.dispose();
        };
    }, [nistLogs, loading]);

    const getSeverityLabel = (level) => {
        const numLevel = parseInt(level);
        if (numLevel >= 12) return 'Critical';
        if (numLevel >= 8) return 'High';
        if (numLevel >= 4) return 'Medium';
        return 'Low';
    };

    // Format timestamp
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

    // Handle view log details
    const handleViewDetails = (log) => {
        const severity = getSeverityLabel(log.parsed.rule?.level);

        setSelectedLog({
            data: log.parsed,  // Pass the parsed log data directly as the 'data' prop
            severity: severity
        });
    };

    // Filter logs on search
    useEffect(() => {
        if (!searchTerm.trim()) {
            setNistLogs(logs.filter(log => {
                const parsedLog = log.parsed;
                return parsedLog?.rule?.nist_800_53 && parsedLog.rule.nist_800_53.length > 0;
            }));
            return;
        }

        const lowerSearchTerm = searchTerm.toLowerCase();
        const filtered = logs.filter(log => {
            const parsedLog = log.parsed;

            // Only include NIST logs
            if (!parsedLog?.rule?.nist_800_53 || parsedLog.rule.nist_800_53.length === 0) {
                return false;
            }

            // Search in agent name
            if (parsedLog.agent?.name?.toLowerCase().includes(lowerSearchTerm)) {
                return true;
            }

            // Search in rule description
            if (parsedLog.rule?.description?.toLowerCase().includes(lowerSearchTerm)) {
                return true;
            }

            // Search in NIST controls
            if (parsedLog.rule?.nist_800_53?.some(control =>
                control.toLowerCase().includes(lowerSearchTerm)
            )) {
                return true;
            }

            return false;
        });

        setNistLogs(filtered);
    }, [searchTerm, logs]);

    // Fetch logs on component mount
    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    return (
        <Box ref={dashboardRef} p={4}>
            <Typography variant="h4" gutterBottom sx={{ color: '#2196f3', mb: 2 }}>
                NIST 800-53 Compliance Dashboard
                <Typography variant="subtitle1" sx={{ color: 'text.secondary', mt: 1 }}>
                    National Institute of Standards and Technology Special Publication 800-53
                </Typography>
                <ExportPDF
                    fetchData={fetchLogs}
                    currentData={nistLogs}
                    dashboardRef={dashboardRef}
                />
            </Typography>

            <Alert
                icon={<VerifiedUserIcon />}
                severity="info"
                sx={{ mb: 3 }}
            >
                {loading ? (
                    <Box display="flex" alignItems="center">
                        <CircularProgress size={20} sx={{ mr: 1 }} /> Loading NIST 800-53 compliance data...
                    </Box>
                ) : (
                    `${nistLogs.length} NIST compliance events detected across ${nistStats.uniqueNistControls.length} unique NIST controls`
                )}
            </Alert>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {/* Key Metrics Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Total NIST Events
                            </Typography>
                            {loading ? (
                                <Skeleton variant="rectangular" width="100%" height={40} />
                            ) : (
                                <Typography variant="h4">
                                    {nistLogs.length}
                                </Typography>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Unique NIST Controls
                            </Typography>
                            {loading ? (
                                <Skeleton variant="rectangular" width="100%" height={40} />
                            ) : (
                                <Typography variant="h4">
                                    {nistStats.uniqueNistControls.length}
                                </Typography>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Control Families
                            </Typography>
                            {loading ? (
                                <Skeleton variant="rectangular" width="100%" height={40} />
                            ) : (
                                <Typography variant="h4">
                                    {Object.keys(nistStats.controlFamilies).length}
                                </Typography>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                High Severity (12+)
                            </Typography>
                            {loading ? (
                                <Skeleton variant="rectangular" width="100%" height={40} />
                            ) : (
                                <Typography variant="h4">
                                    {nistLogs.filter(log => parseInt(log.parsed.rule?.level) >= 12).length}
                                </Typography>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Charts */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12}>
                    <Paper sx={{ p: 2, height: 300 }}>
                        {loading ? (
                            <Skeleton variant="rectangular" width="100%" height="100%" />
                        ) : (
                            <div ref={timelineChartRef} style={{ width: '100%', height: '100%' }} />
                        )}
                    </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, height: 400 }}>
                        {loading ? (
                            <Skeleton variant="rectangular" width="100%" height="100%" />
                        ) : (
                            <div ref={agentDistributionChartRef} style={{ width: '100%', height: '100%' }} />
                        )}
                    </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, height: 400 }}>
                        {loading ? (
                            <Skeleton variant="rectangular" width="100%" height="100%" />
                        ) : (
                            <div ref={severityDistributionChartRef} style={{ width: '100%', height: '100%' }} />
                        )}
                    </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, height: 400 }}>
                        {loading ? (
                            <Skeleton variant="rectangular" width="100%" height="100%" />
                        ) : (
                            <div ref={controlDistributionChartRef} style={{ width: '100%', height: '100%' }} />
                        )}
                    </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, height: 400 }}>

                        {loading ? (
                            <Skeleton variant="rectangular" width="100%" height="100%" />
                        ) : (
                            <div ref={familyDistributionChartRef} style={{ width: '100%', height: '100%' }} />
                        )}
                    </Paper>
                </Grid>
            </Grid>

            {/* NIST Logs Table */}
            <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                        NIST Compliance Logs
                    </Typography>
                    <TextField
                        size="small"
                        placeholder="Search by agent, description, or control..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon />
                                </InputAdornment>
                            ),
                        }}
                        sx={{ width: 300 }}
                    />
                </Box>

                <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Timestamp</TableCell>
                                <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Agent</TableCell>
                                <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Description</TableCell>
                                <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Level</TableCell>
                                <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>NIST Controls</TableCell>
                                <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Actions</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {loading ? (
                                // Show loading skeletons for the table
                                [...Array(5)].map((_, index) => (
                                    <TableRow key={`skeleton-${index}`}>
                                        <TableCell><Skeleton /></TableCell>
                                        <TableCell><Skeleton /></TableCell>
                                        <TableCell><Skeleton /></TableCell>
                                        <TableCell><Skeleton width={60} /></TableCell>
                                        <TableCell><Skeleton /></TableCell>
                                        <TableCell><Skeleton width={80} /></TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                nistLogs
                                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                    .map((log, index) => (
                                        <TableRow key={index} hover>
                                            <TableCell>{formatTimestamp(log.parsed.timestamp)}</TableCell>
                                            <TableCell>{log.parsed.agent?.name || 'Unknown'}</TableCell>
                                            <TableCell>{log.parsed.rule?.description || 'No description'}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={log.parsed.rule?.level || '0'}
                                                    color={getRuleLevelColor(log.parsed.rule?.level)}
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {log.parsed.rule?.nist_800_53?.map((control, idx) => (
                                                    <Chip
                                                        key={idx}
                                                        label={control}
                                                        size="small"
                                                        sx={{ m: 0.5 }}
                                                    />
                                                ))}
                                            </TableCell>
                                            <TableCell>
                                                <Link
                                                    component="button"
                                                    variant="body2"
                                                    onClick={() => handleViewDetails(log)}
                                                >
                                                    View Details
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    component="div"
                    count={loading ? 0 : nistLogs.length}
                    rowsPerPage={rowsPerPage}
                    page={loading ? 0 : page}
                    onPageChange={(event, newPage) => setPage(newPage)}
                    onRowsPerPageChange={(event) => {
                        setRowsPerPage(parseInt(event.target.value, 10));
                        setPage(0);
                    }}
                />
            </Box>

            {/* Log Details Dialog */}
            {selectedLog && (
                <Dialog
                    open={Boolean(selectedLog)}
                    onClose={() => setSelectedLog(null)}
                    maxWidth="md"
                    fullWidth
                >
                    <DialogTitle sx={{
                        backgroundColor: '#e8f5e9',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <Typography variant="h6">NIST Log Details</Typography>
                        <IconButton
                            aria-label="close"
                            onClick={() => setSelectedLog(null)}
                            size="small"
                        >
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent sx={{ mt: 2 }}>
                        <SessionLogView data={selectedLog.data} />
                    </DialogContent>
                </Dialog>
            )}
        </Box>
    );
};

export default NISTDashboard;