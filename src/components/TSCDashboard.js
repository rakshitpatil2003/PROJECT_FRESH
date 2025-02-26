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
import SecurityIcon from '@mui/icons-material/Security';
import CloseIcon from '@mui/icons-material/Close';
import axios from 'axios';
import { parseLogMessage } from '../utils/normalizeLogs';
import SessionLogView from '../components/SessionLogView';
import { API_URL } from '../config';
import * as echarts from 'echarts';

const TSCDashboard = () => {
    const [logs, setLogs] = useState([]);
    const [tscLogs, setTscLogs] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedLog, setSelectedLog] = useState(null);
    const [tscStats, setTscStats] = useState({
        totalCount: 0,
        uniqueTscCriteria: [],
        agentDistribution: {},
        timelineData: [],
        criteriaSeverity: {},
        controlDistribution: {},
        categoryDistribution: {},
        aicpaCategoryDistribution: {
            'Security': 0,
            'Availability': 0,
            'Processing Integrity': 0,
            'Confidentiality': 0,
            'Privacy': 0
        }
    });

    // Charts references
    const timelineChartRef = React.useRef(null);
    const agentDistributionChartRef = React.useRef(null);
    const criteriaDistributionChartRef = React.useRef(null);
    const severityDistributionChartRef = React.useRef(null);
    const controlDistributionChartRef = React.useRef(null);
    const categoryDistributionChartRef = React.useRef(null);

    const getRuleLevelColor = (level) => {
        const numLevel = parseInt(level);
        if (numLevel >= 12) return "error";
        if (numLevel >= 8) return "warning";
        if (numLevel >= 4) return "info";
        return "success";
    };

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

            // Filter TSC logs
            const tscFilteredLogs = parsedLogs.filter(log => {
                const parsedLog = log.parsed;
                return parsedLog?.rule?.tsc && parsedLog.rule.tsc.length > 0;
            });

            setTscLogs(tscFilteredLogs);
            processTscStats(tscFilteredLogs);
        } catch (error) {
            console.error('Error fetching session logs:', error);
            setError(error.response?.data?.message || error.message || 'Failed to fetch session logs');
            setLogs([]);
            setTscLogs([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const processTscStats = (tscLogs) => {
        // Unique TSC criteria
        const tscCriteria = new Set();

        // Agent distribution
        const agentDistribution = {};

        // Timeline data (group by day)
        const timelineMap = {};

        // Criteria severity
        const criteriaSeverity = {};

        // Control distribution (based on first letter of TSC criterion)
        const controlDistribution = {
            'CC': 0,  // Common Criteria
            'A': 0,   // Availability
            'PI': 0,  // Processing Integrity
            'C': 0,   // Confidentiality
            'P': 0    // Privacy
        };

        // Category distribution (AICPA categories)
        const categoryDistribution = {
            'Security': 0,
            'Availability': 0,
            'Processing Integrity': 0,
            'Confidentiality': 0,
            'Privacy': 0
        };

        tscLogs.forEach(log => {
            const parsedLog = log.parsed;
            const rule = parsedLog.rule || {};

            // Process TSC criteria
            if (rule.tsc && rule.tsc.length) {
                rule.tsc.forEach(criterion => {
                    tscCriteria.add(criterion);

                    // Track criterion severity
                    if (!criteriaSeverity[criterion]) {
                        criteriaSeverity[criterion] = {
                            count: 0,
                            avgLevel: 0,
                            levels: []
                        };
                    }

                    criteriaSeverity[criterion].count++;
                    criteriaSeverity[criterion].levels.push(parseInt(rule.level));

                    // Process control distribution
                    if (criterion.startsWith('CC')) {
                        controlDistribution['CC']++;
                        categoryDistribution['Security']++;
                    } else if (criterion.startsWith('A')) {
                        controlDistribution['A']++;
                        categoryDistribution['Availability']++;
                    } else if (criterion.startsWith('PI')) {
                        controlDistribution['PI']++;
                        categoryDistribution['Processing Integrity']++;
                    } else if (criterion.startsWith('C')) {
                        controlDistribution['C']++;
                        categoryDistribution['Confidentiality']++;
                    } else if (criterion.startsWith('P')) {
                        controlDistribution['P']++;
                        categoryDistribution['Privacy']++;
                    }
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

        // Calculate average severity for each criterion
        Object.keys(criteriaSeverity).forEach(criterion => {
            const levels = criteriaSeverity[criterion].levels;
            criteriaSeverity[criterion].avgLevel = levels.reduce((sum, level) => sum + level, 0) / levels.length;
        });

        // Convert timeline map to array sorted by date
        const timelineData = Object.entries(timelineMap)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        setTscStats({
            totalCount: tscLogs.length,
            uniqueTscCriteria: Array.from(tscCriteria),
            agentDistribution,
            timelineData,
            criteriaSeverity,
            controlDistribution,
            categoryDistribution
        });
    };

    // Initialize and update charts
    useEffect(() => {
        if (loading) return;

        // Timeline Chart
        if (timelineChartRef.current && tscStats.timelineData.length > 0) {
            const timelineChart = echarts.init(timelineChartRef.current);

            const option = {
                title: {
                    text: 'TSC Events Timeline',
                    left: 'center'
                },
                tooltip: {
                    trigger: 'axis',
                    formatter: '{b}: {c} events'
                },
                xAxis: {
                    type: 'category',
                    data: tscStats.timelineData.map(item => item.date),
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
                        data: tscStats.timelineData.map(item => item.count),
                        type: 'line',
                        smooth: true,
                        lineStyle: {
                            color: '#3F51B5',
                            width: 3
                        },
                        symbol: 'circle',
                        symbolSize: 8,
                        itemStyle: {
                            color: '#3F51B5'
                        },
                        areaStyle: {
                            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                { offset: 0, color: 'rgba(63, 81, 181, 0.8)' },
                                { offset: 1, color: 'rgba(63, 81, 181, 0.1)' }
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
    }, [tscStats.timelineData, loading]);

    // Agent Distribution Chart
    useEffect(() => {
        if (loading || !agentDistributionChartRef.current) return;

        const agentChart = echarts.init(agentDistributionChartRef.current);

        const agentData = Object.entries(tscStats.agentDistribution)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        const option = {
            title: {
                text: 'TSC Events by Agent',
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
    }, [tscStats.agentDistribution, loading]);

    // Criteria Distribution Chart
    useEffect(() => {
        if (loading || !criteriaDistributionChartRef.current) return;

        const criteriaChart = echarts.init(criteriaDistributionChartRef.current);

        const criteriaData = Object.entries(tscStats.criteriaSeverity)
            .map(([criterion, data]) => ({ criterion, count: data.count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10); // Top 10 criteria

        const option = {
            title: {
                text: 'Top 10 TSC Criteria',
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
                data: criteriaData.map(item => item.criterion),
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
                    data: criteriaData.map(item => item.count),
                    itemStyle: {
                        color: function (params) {
                            const colorList = [
                                '#3F51B5', '#5C6BC0', '#7986CB', '#9FA8DA', '#C5CAE9',
                                '#8C9EFF', '#536DFE', '#3D5AFE', '#304FFE', '#1A237E'
                            ];
                            return colorList[params.dataIndex % colorList.length];
                        }
                    }
                }
            ]
        };

        criteriaChart.setOption(option);

        const handleResize = () => {
            criteriaChart.resize();
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            criteriaChart.dispose();
        };
    }, [tscStats.criteriaSeverity, loading]);

    // Severity Distribution Chart
    useEffect(() => {
        if (loading || !severityDistributionChartRef.current) return;

        const severityChart = echarts.init(severityDistributionChartRef.current);

        // Group logs by severity level
        const severityDistribution = tscLogs.reduce((acc, log) => {
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
                            color: getSeverityColor(item.level)
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
    }, [tscLogs, loading]);

    // Control Distribution Chart
    useEffect(() => {
        if (loading || !controlDistributionChartRef.current) return;

        const controlChart = echarts.init(controlDistributionChartRef.current);

        const controlLabels = {
            'CC': 'Common Criteria (Security)',
            'A': 'Availability',
            'PI': 'Processing Integrity',
            'C': 'Confidentiality',
            'P': 'Privacy'
        };

        const controlData = Object.entries(tscStats.controlDistribution)
            .map(([control, count]) => ({ 
                name: controlLabels[control] || control, 
                value: count 
            }))
            .filter(item => item.value > 0);

        const option = {
            title: {
                text: 'TSC Control Distribution',
                left: 'center'
            },
            tooltip: {
                trigger: 'item',
                formatter: '{b}: {c} ({d}%)'
            },
            legend: {
                orient: 'vertical',
                left: 'left',
            },
            series: [
                {
                    type: 'pie',
                    radius: '50%',
                    data: controlData,
                    emphasis: {
                        itemStyle: {
                            shadowBlur: 10,
                            shadowOffsetX: 0,
                            shadowColor: 'rgba(0, 0, 0, 0.5)'
                        }
                    },
                    label: {
                        formatter: '{b}: {c} ({d}%)'
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
    }, [tscStats.controlDistribution, loading]);

    // Category Distribution Chart
    useEffect(() => {
        if (loading || !categoryDistributionChartRef.current) return;

        const categoryChart = echarts.init(categoryDistributionChartRef.current);

        const categoryData = Object.entries(tscStats.categoryDistribution)
            .map(([category, count]) => ({ category, count }))
            .filter(item => item.count > 0);

        const option = {
            title: {
                text: 'AICPA TSC Categories',
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
                data: categoryData.map(item => item.category),
                axisLabel: {
                    interval: 0,
                    rotate: 0
                }
            },
            series: [
                {
                    name: 'Event Count',
                    type: 'bar',
                    barWidth: '60%',
                    data: categoryData.map(item => item.count),
                    itemStyle: {
                        color: '#3F51B5'
                    }
                }
            ]
        };

        categoryChart.setOption(option);

        const handleResize = () => {
            categoryChart.resize();
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            categoryChart.dispose();
        };
    }, [tscStats.categoryDistribution, loading]);

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
        setSelectedLog(log.parsed);
    };

    // Filter logs on search
    useEffect(() => {
        if (!searchTerm.trim()) {
            setTscLogs(logs.filter(log => {
                const parsedLog = log.parsed;
                return parsedLog?.rule?.tsc && parsedLog.rule.tsc.length > 0;
            }));
            return;
        }

        const lowerSearchTerm = searchTerm.toLowerCase();
        const filtered = logs.filter(log => {
            const parsedLog = log.parsed;

            // Only include TSC logs
            if (!parsedLog?.rule?.tsc || parsedLog.rule.tsc.length === 0) {
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

            // Search in TSC criteria
            if (parsedLog.rule?.tsc?.some(criterion =>
                criterion.toLowerCase().includes(lowerSearchTerm)
            )) {
                return true;
            }

            return false;
        });

        setTscLogs(filtered);
    }, [searchTerm, logs]);

    // Fetch logs on component mount
    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    if (loading && !logs.length) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box p={4}>
            <Typography variant="h4" gutterBottom sx={{ color: '#3F51B5', mb: 2 }}>
                TSC Compliance Dashboard
                <Typography variant="subtitle1" sx={{ color: 'text.secondary', mt: 1 }}>
                    Trust Services Criteria
                </Typography>
            </Typography>

            <Alert
                icon={<SecurityIcon />}
                severity="info"
                sx={{ mb: 3 }}
            >
                {tscLogs.length} TSC compliance events detected across {tscStats.uniqueTscCriteria.length} unique TSC criteria
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
                                Total TSC Events
                            </Typography>
                            <Typography variant="h4">
                                {tscLogs.length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Unique TSC Criteria
                            </Typography>
                            <Typography variant="h4">
                                {tscStats.uniqueTscCriteria.length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Security Events (CC)
                            </Typography>
                            <Typography variant="h4">
                                {tscStats.controlDistribution['CC'] || 0}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                High Severity (12+)
                            </Typography>
                            <Typography variant="h4">
                                {tscLogs.filter(log => parseInt(log.parsed.rule?.level) >= 12).length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Charts */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12}>
                    <Paper sx={{ p: 2, height: 300 }}>
                        <div ref={timelineChartRef} style={{ width: '100%', height: '100%' }} />
                    </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, height: 400 }}>
                        <div ref={agentDistributionChartRef} style={{ width: '100%', height: '100%' }} />
                    </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, height: 400 }}>
                        <div ref={severityDistributionChartRef} style={{ width: '100%', height: '100%' }} />
                    </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, height: 400 }}>
                        <div ref={controlDistributionChartRef} style={{ width: '100%', height: '100%' }} />
                    </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, height: 400 }}>
                        <div ref={categoryDistributionChartRef} style={{ width: '100%', height: '100%' }} />
                    </Paper>
                </Grid>
                <Grid item xs={12}>
                    <Paper sx={{ p: 2, height: 400 }}>
                        <div ref={criteriaDistributionChartRef} style={{ width: '100%', height: '100%' }} />
                    </Paper>
                </Grid>
            </Grid>

            {/* TSC Logs Table */}
            <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                        TSC Compliance Logs
                    </Typography>
                    <TextField
                        size="small"
                        placeholder="Search by agent, description, or criteria..."
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
                                <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>TSC Criteria</TableCell>
                                <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Actions</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {tscLogs.map((log, index) => (
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
                                        {log.parsed.rule?.tsc?.map((criterion, idx) => (
                                            <Chip
                                                key={idx}
                                                label={criterion}
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
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>

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
    
    // Helper function to get severity color
    function getSeverityColor(level) {
        if (level >= 12) return '#f44336'; // Red
        if (level >= 8) return '#ff9800';  // Orange
        if (level >= 4) return '#2196f3';  // Blue
        return '#4caf50';                  // Green
    }
};
export default TSCDashboard;
