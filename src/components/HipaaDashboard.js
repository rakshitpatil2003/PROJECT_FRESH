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
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
//import FilterListIcon from '@mui/icons-material/FilterList';
//import TimelineIcon from '@mui/icons-material/Timeline';
import axios from 'axios';
import { parseLogMessage } from '../utils/normalizeLogs';
import SessionLogView from '../components/SessionLogView';
import { API_URL } from '../config';
import * as echarts from 'echarts';

const HIPAADashboard = () => {
    const [logs, setLogs] = useState([]);
    const [hipaaLogs, setHipaaLogs] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedLog, setSelectedLog] = useState(null);
    const [hipaaStats, setHipaaStats] = useState({
        totalCount: 0,
        uniqueHipaaControls: [],
        agentDistribution: {},
        timelineData: [],
        controlSeverity: {},
    });

    // Charts references
    const timelineChartRef = React.useRef(null);
    const agentDistributionChartRef = React.useRef(null);
    const controlDistributionChartRef = React.useRef(null);
    const severityDistributionChartRef = React.useRef(null);

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

            // Filter HIPAA logs
            const hipaaFilteredLogs = parsedLogs.filter(log => {
                const parsedLog = log.parsed;
                return parsedLog?.rule?.hipaa && parsedLog.rule.hipaa.length > 0;
            });

            setHipaaLogs(hipaaFilteredLogs);
            processHipaaStats(hipaaFilteredLogs);
        } catch (error) {
            console.error('Error fetching session logs:', error);
            setError(error.response?.data?.message || error.message || 'Failed to fetch session logs');
            setLogs([]);
            setHipaaLogs([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const processHipaaStats = (hipaaLogs) => {
        // Unique HIPAA controls
        const hipaaControls = new Set();

        // Agent distribution
        const agentDistribution = {};

        // Timeline data (group by day)
        const timelineMap = {};

        // Control severity
        const controlSeverity = {};

        hipaaLogs.forEach(log => {
            const parsedLog = log.parsed;
            const rule = parsedLog.rule || {};

            // Process HIPAA controls
            if (rule.hipaa && rule.hipaa.length) {
                rule.hipaa.forEach(control => {
                    hipaaControls.add(control);

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

        setHipaaStats({
            totalCount: hipaaLogs.length,
            uniqueHipaaControls: Array.from(hipaaControls),
            agentDistribution,
            timelineData,
            controlSeverity,
        });
    };

    // Initialize and update charts
    useEffect(() => {
        if (loading) return;

        // Timeline Chart
        if (timelineChartRef.current && hipaaStats.timelineData.length > 0) {
            const timelineChart = echarts.init(timelineChartRef.current);

            const option = {
                title: {
                    text: 'HIPAA Events Timeline',
                    left: 'center'
                },
                tooltip: {
                    trigger: 'axis',
                    formatter: '{b}: {c} events'
                },
                xAxis: {
                    type: 'category',
                    data: hipaaStats.timelineData.map(item => item.date),
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
                        data: hipaaStats.timelineData.map(item => item.count),
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
    }, [hipaaStats.timelineData, loading]);

    // Agent Distribution Chart
    useEffect(() => {
        if (loading || !agentDistributionChartRef.current) return;

        const agentChart = echarts.init(agentDistributionChartRef.current);

        const agentData = Object.entries(hipaaStats.agentDistribution)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        const option = {
            title: {
                text: 'HIPAA Events by Agent',
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
    }, [hipaaStats.agentDistribution, loading]);

    // Control Distribution Chart
    useEffect(() => {
        if (loading || !controlDistributionChartRef.current) return;

        const controlChart = echarts.init(controlDistributionChartRef.current);

        const controlData = Object.entries(hipaaStats.controlSeverity)
            .map(([control, data]) => ({ control, count: data.count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10); // Top 10 controls

        const option = {
            title: {
                text: 'Top 10 HIPAA Controls',
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
    }, [hipaaStats.controlSeverity, loading]);

    // Severity Distribution Chart
    useEffect(() => {
        if (loading || !severityDistributionChartRef.current) return;

        const severityChart = echarts.init(severityDistributionChartRef.current);

        // Group logs by severity level
        const severityDistribution = hipaaLogs.reduce((acc, log) => {
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
    }, [hipaaLogs, loading]);

    function getSeverityColor(level) {
        if (level >= 12) return '#f44336'; // Red
        if (level >= 8) return '#ff9800';  // Orange
        if (level >= 4) return '#2196f3';  // Blue
        return '#4caf50';                 // Green
    }

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
            setHipaaLogs(logs.filter(log => {
                const parsedLog = log.parsed;
                return parsedLog?.rule?.hipaa && parsedLog.rule.hipaa.length > 0;
            }));
            return;
        }

        const lowerSearchTerm = searchTerm.toLowerCase();
        const filtered = logs.filter(log => {
            const parsedLog = log.parsed;

            // Only include HIPAA logs
            if (!parsedLog?.rule?.hipaa || parsedLog.rule.hipaa.length === 0) {
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

            // Search in HIPAA controls
            if (parsedLog.rule?.hipaa?.some(control =>
                control.toLowerCase().includes(lowerSearchTerm)
            )) {
                return true;
            }

            return false;
        });

        setHipaaLogs(filtered);
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
            <Typography variant="h4" gutterBottom sx={{ color: '#2196f3', mb: 2 }}>
                HIPAA Compliance Dashboard
                <Typography variant="subtitle1" sx={{ color: 'text.secondary', mt: 1 }}>
                    Health Insurance Portability and Accountability Act
                </Typography>
            </Typography>

            <Alert
                icon={<VerifiedUserIcon />}
                severity="info"
                sx={{ mb: 3 }}
            >
                {hipaaLogs.length} HIPAA compliance events detected across {hipaaStats.uniqueHipaaControls.length} unique HIPAA controls
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
                                Total HIPAA Events
                            </Typography>
                            <Typography variant="h4">
                                {hipaaLogs.length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Unique HIPAA Controls
                            </Typography>
                            <Typography variant="h4">
                                {hipaaStats.uniqueHipaaControls.length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Unique Agent Sources
                            </Typography>
                            <Typography variant="h4">
                                {Object.keys(hipaaStats.agentDistribution).length}
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
                                {hipaaLogs.filter(log => parseInt(log.parsed.rule?.level) >= 12).length}
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
                <Grid item xs={12}>
                    <Paper sx={{ p: 2, height: 400 }}>
                        <div ref={controlDistributionChartRef} style={{ width: '100%', height: '100%' }} />
                    </Paper>
                </Grid>
            </Grid>

            {/* HIPAA Logs Table */}
            <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                        HIPAA Compliance Logs
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
                        <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>HIPAA Controls</TableCell>
                        <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>

                    <TableBody>
                        {hipaaLogs.map((log, index) => (
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
                                    {log.parsed.rule?.hipaa?.map((control, idx) => (
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
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
                
                      {/* Log Details Dialog */ }
    {
        selectedLog && (
            <SessionLogView
                log={selectedLog}
                open={Boolean(selectedLog)}
                onClose={() => setSelectedLog(null)}
            />
        )
    }
                    </Box >
                  );
                };

export default HIPAADashboard;
