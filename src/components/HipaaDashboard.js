import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Paper, Grid, Alert, CircularProgress, Card, CardContent,
    Chip, Link, TextField, InputAdornment, Dialog, DialogTitle, DialogContent, IconButton, Button
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import CloseIcon from '@mui/icons-material/Close';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import axios from 'axios';
import { parseLogMessage } from '../utils/normalizeLogs';
import SessionLogView from '../components/SessionLogView';
import { API_URL } from '../config';
import * as echarts from 'echarts';
import ExportPDF from '../components/ExportPDF';
import Skeleton from '@mui/material/Skeleton';
import { DataGrid } from '@mui/x-data-grid';

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
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Charts references
    const dashboardRef = React.useRef(null);
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

    const [timeRange, setTimeRange] = useState('7d'); // Default to 7 days
    const timeRangeOptions = [
        { value: '1h', label: 'Last Hour' },
        { value: '3h', label: 'Last 3 Hours' },
        { value: '12h', label: 'Last 12 Hours' },
        { value: '24h', label: 'Last 24 Hours' },
        { value: '7d', label: 'Last 7 Days' },
        { value: 'all', label: 'All Time' },
    ];

    const filterLogsByTime = useCallback((logs) => {
        if (timeRange === 'all') return logs;

        const now = new Date().getTime();
        let milliseconds;

        switch (timeRange) {
            case '1h':
                milliseconds = 60 * 60 * 1000;
                break;
            case '3h':
                milliseconds = 3 * 60 * 60 * 1000;
                break;
            case '12h':
                milliseconds = 12 * 60 * 60 * 1000;
                break;
            case '24h':
                milliseconds = 24 * 60 * 60 * 1000;
                break;
            case '7d':
                milliseconds = 7 * 24 * 60 * 60 * 1000;
                break;
            default:
                milliseconds = 7 * 24 * 60 * 60 * 1000; // Default to 7 days
        }

        return logs.filter(log => {
            const timestamp = log.parsed.timestamp;
            let logTime;

            if (typeof timestamp === 'number') {
                logTime = timestamp * 1000;
            } else {
                logTime = new Date(timestamp).getTime();
            }

            return (now - logTime) <= milliseconds;
        });
    }, [timeRange]);

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
    }, [hipaaStats.timelineData, loading, timeRange]);

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
    }, [hipaaLogs, loading]);
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
    // Filter logs on search and time range
    useEffect(() => {
        // First filter all logs by HIPAA criteria
        const hipaaFilteredLogs = logs.filter(log => {
            const parsedLog = log.parsed;
            return parsedLog?.rule?.hipaa && parsedLog.rule.hipaa.length > 0;
        });

        // Then filter by time range
        const timeFilteredLogs = filterLogsByTime(hipaaFilteredLogs);

        // Then filter by search term
        if (!searchTerm.trim()) {
            setHipaaLogs(timeFilteredLogs);
            processHipaaStats(timeFilteredLogs);
            return;
        }

        const lowerSearchTerm = searchTerm.toLowerCase();
        const searchFilteredLogs = timeFilteredLogs.filter(log => {
            const parsedLog = log.parsed;

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

        setHipaaLogs(searchFilteredLogs);
        processHipaaStats(searchFilteredLogs);
    }, [searchTerm, logs, timeRange, filterLogsByTime]);
    // Fetch logs on component mount
    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);
    return (
        <Box ref={dashboardRef} p={4}>
            <Typography variant="h4" gutterBottom sx={{ color: '#2196f3', mb: 2 }}>
                HIPAA Compliance Dashboard
                <Typography variant="subtitle1" sx={{ color: 'text.secondary', mt: 1 }}>
                    Health Insurance Portability and Accountability Act
                </Typography>
                <ExportPDF 
                  dashboardRef={dashboardRef} 
                  currentDashboard="hipaa" 
                />
            </Typography>
            <Alert
                icon={<VerifiedUserIcon />}
                severity="info"
                sx={{ mb: 3 }}
            >
                {loading ? (
                    <Box display="flex" alignItems="center">
                        <CircularProgress size={20} sx={{ mr: 1 }} /> Loading HIPAA compliance data...
                    </Box>
                ) : (
                    `${hipaaLogs.length} HIPAA compliance events detected across ${hipaaStats.uniqueHipaaControls.length} unique HIPAA controls`
                )}
            </Alert>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {timeRange !== 'all' && (
                <Alert
                    severity="info"
                    sx={{ mb: 3 }}
                >
                    Showing data from the {timeRangeOptions.find(option => option.value === timeRange)?.label.toLowerCase()}
                </Alert>
            )}
            {/* Key Metrics Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card
                        elevation={0}
                        sx={{
                            background: 'rgba(255, 255, 255, 0.15)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: 2,
                            overflow: 'hidden',
                            position: 'relative',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                transform: 'translateY(-5px)',
                                boxShadow: '0 10px 20px rgba(0,0,0,0.1)',
                            },
                            '&::before': {
                                content: '""',
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                height: '2px',
                                background: 'linear-gradient(90deg, transparent, rgba(66, 165, 245, 0.8), transparent)',
                                animation: 'glowAnimation 2s linear infinite',
                            },
                            '@keyframes glowAnimation': {
                                '0%': { backgroundPosition: '-300px 0' },
                                '100%': { backgroundPosition: '300px 0' }
                            },
                            // This ensures visibility in both light and dark themes
                            '.MuiTypography-root': {
                                color: theme => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.87)',
                            },
                            '.MuiTypography-colorTextSecondary': {
                                color: theme => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                            }
                        }}
                    >
                        <CardContent>
                            <Typography
                                color="textSecondary"
                                gutterBottom
                                sx={{
                                    fontWeight: 500,
                                    letterSpacing: '0.5px',
                                    fontSize: '0.875rem',
                                    textTransform: 'uppercase'
                                }}
                            >
                                Total HIPAA Events
                            </Typography>
                            {loading ? (
                                <Skeleton
                                    variant="rectangular"
                                    width="100%"
                                    height={40}
                                    sx={{
                                        bgcolor: 'rgba(255, 255, 255, 0.1)'
                                    }}
                                />
                            ) : (
                                <Typography
                                    variant="h4"
                                    sx={{
                                        fontWeight: 600,
                                        mt: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        fontSize: '2rem',
                                        background: 'linear-gradient(45deg, #2196f3, #21cbf3)',
                                        backgroundClip: 'text',
                                        textFillColor: 'transparent',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent'
                                    }}
                                >
                                    {hipaaLogs.length}
                                </Typography>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card
                        elevation={0}
                        sx={{
                            background: 'rgba(255, 255, 255, 0.15)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: 2,
                            overflow: 'hidden',
                            position: 'relative',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                transform: 'translateY(-5px)',
                                boxShadow: '0 10px 20px rgba(0,0,0,0.1)',
                            },
                            '&::before': {
                                content: '""',
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                height: '2px',
                                background: 'linear-gradient(90deg, transparent, rgba(66, 165, 245, 0.8), transparent)',
                                animation: 'glowAnimation 2s linear infinite',
                            },
                            '@keyframes glowAnimation': {
                                '0%': { backgroundPosition: '-300px 0' },
                                '100%': { backgroundPosition: '300px 0' }
                            },
                            '.MuiTypography-root': {
                                color: theme => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.87)',
                            },
                            '.MuiTypography-colorTextSecondary': {
                                color: theme => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                            }
                        }}
                    >
                        <CardContent>
                            <Typography
                                color="textSecondary"
                                gutterBottom
                                sx={{
                                    fontWeight: 500,
                                    letterSpacing: '0.5px',
                                    fontSize: '0.875rem',
                                    textTransform: 'uppercase'
                                }}
                            >
                                Unique HIPAA Controls
                            </Typography>
                            {loading ? (
                                <Skeleton
                                    variant="rectangular"
                                    width="100%"
                                    height={40}
                                    sx={{
                                        bgcolor: 'rgba(255, 255, 255, 0.1)'
                                    }}
                                />
                            ) : (
                                <Typography
                                    variant="h4"
                                    sx={{
                                        fontWeight: 600,
                                        mt: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        fontSize: '2rem',
                                        background: 'linear-gradient(45deg, #2196f3, #21cbf3)',
                                        backgroundClip: 'text',
                                        textFillColor: 'transparent',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent'
                                    }}
                                >
                                    {hipaaStats.uniqueHipaaControls.length}
                                </Typography>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>

                    <Card
                        elevation={0}
                        sx={{
                            background: 'rgba(255, 255, 255, 0.15)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: 2,
                            overflow: 'hidden',
                            position: 'relative',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                transform: 'translateY(-5px)',
                                boxShadow: '0 10px 20px rgba(0,0,0,0.1)',
                            },
                            '&::before': {
                                content: '""',
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                height: '2px',
                                background: 'linear-gradient(90deg, transparent, rgba(66, 165, 245, 0.8), transparent)',
                                animation: 'glowAnimation 2s linear infinite',
                            },
                            '@keyframes glowAnimation': {
                                '0%': { backgroundPosition: '-300px 0' },
                                '100%': { backgroundPosition: '300px 0' }
                            },
                            '.MuiTypography-root': {
                                color: theme => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.87)',
                            },
                            '.MuiTypography-colorTextSecondary': {
                                color: theme => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                            }
                        }}
                    >
                        <CardContent>
                            <Typography
                                color="textSecondary"
                                gutterBottom
                                sx={{
                                    fontWeight: 500,
                                    letterSpacing: '0.5px',
                                    fontSize: '0.875rem',
                                    textTransform: 'uppercase'
                                }}
                            >
                                Unique Agent Sources
                            </Typography>
                            {loading ? (
                                <Skeleton
                                    variant="rectangular"
                                    width="100%"
                                    height={40}
                                    sx={{
                                        bgcolor: 'rgba(255, 255, 255, 0.1)'
                                    }}
                                />
                            ) : (
                                <Typography
                                    variant="h4"
                                    sx={{
                                        fontWeight: 600,
                                        mt: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        fontSize: '2rem',
                                        background: 'linear-gradient(45deg, #2196f3, #21cbf3)',
                                        backgroundClip: 'text',
                                        textFillColor: 'transparent',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent'
                                    }}
                                >
                                    {Object.keys(hipaaStats.agentDistribution).length}
                                </Typography>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>

                    <Card
                        elevation={0}
                        sx={{
                            background: 'rgba(255, 255, 255, 0.15)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: 2,
                            overflow: 'hidden',
                            position: 'relative',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                transform: 'translateY(-5px)',
                                boxShadow: '0 10px 20px rgba(0,0,0,0.1)',
                            },
                            '&::before': {
                                content: '""',
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                height: '2px',
                                background: 'linear-gradient(90deg, transparent, rgba(66, 165, 245, 0.8), transparent)',
                                animation: 'glowAnimation 2s linear infinite',
                            },
                            '@keyframes glowAnimation': {
                                '0%': { backgroundPosition: '-300px 0' },
                                '100%': { backgroundPosition: '300px 0' }
                            },
                            '.MuiTypography-root': {
                                color: theme => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.87)',
                            },
                            '.MuiTypography-colorTextSecondary': {
                                color: theme => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                            }
                        }}
                    >
                        <CardContent>
                            <Typography
                                color="textSecondary"
                                gutterBottom
                                sx={{
                                    fontWeight: 500,
                                    letterSpacing: '0.5px',
                                    fontSize: '0.875rem',
                                    textTransform: 'uppercase'
                                }}
                            >
                                High Severity (12+)
                            </Typography>
                            {loading ? (
                                <Skeleton
                                    variant="rectangular"
                                    width="100%"
                                    height={40}
                                    sx={{
                                        bgcolor: 'rgba(255, 255, 255, 0.1)'
                                    }}
                                />
                            ) : (
                                <Typography
                                    variant="h4"
                                    sx={{
                                        fontWeight: 600,
                                        mt: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        fontSize: '2rem',
                                        background: 'linear-gradient(45deg, #2196f3, #21cbf3)',
                                        backgroundClip: 'text',
                                        textFillColor: 'transparent',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent'
                                    }}
                                >
                                    {hipaaLogs.filter(log => parseInt(log.parsed.rule?.level) >= 12).length}
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
                <Grid item xs={12}>
                    <Paper sx={{ p: 2, height: 400 }}>
                        {loading ? (
                            <Skeleton variant="rectangular" width="100%" height="100%" />
                        ) : (
                            <div ref={controlDistributionChartRef} style={{ width: '100%', height: '100%' }} />
                        )}
                    </Paper>
                </Grid>
            </Grid>
            {/* HIPAA Logs DataGrid */}
            <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                        HIPAA Compliance Logs
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        {/* Time range selector */}
                        <Box component="form" sx={{ display: 'flex', alignItems: 'center' }}>
                            <Typography variant="body2" sx={{ mr: 1 }}>Time Range:</Typography>
                            <TextField
                                select
                                size="small"
                                value={timeRange}
                                onChange={(e) => setTimeRange(e.target.value)}
                                sx={{ width: 150 }}
                                SelectProps={{
                                    native: true,
                                }}
                            >
                                {timeRangeOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </TextField>
                            <Button
                                size="small"
                                variant="outlined"
                                onClick={() => {
                                    setTimeRange('all');
                                    setSearchTerm('');
                                }}
                                sx={{ ml: 1 }}
                            >
                                Reset Filters
                            </Button>
                        </Box>

                        {/* Existing search field */}
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
                </Box>
                <Paper sx={{
                    height: 400,
                    width: '100%',
                    overflow: 'hidden',  // Prevent overflow
                    position: 'relative' // Create a positioning context
                }}>
                    {loading ? (
                        <Box sx={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <Box sx={{
                            height: '100%',
                            width: '100%',
                            overflow: 'auto' // Make this box scrollable
                        }}>
                            <DataGrid
                                rows={hipaaLogs.map((log, index) => ({
                                    id: index,
                                    timestamp: formatTimestamp(log.parsed.timestamp),
                                    agent: log.parsed.agent?.name || 'Unknown',
                                    description: log.parsed.rule?.description || 'No description',
                                    level: log.parsed.rule?.level || '0',
                                    hipaaControls: log.parsed.rule?.hipaa || [],
                                    rawLog: log
                                }))}
                                columns={[
                                    {
                                        field: 'timestamp',
                                        headerName: 'Timestamp',
                                        width: 200,
                                        sortable: true
                                    },
                                    {
                                        field: 'agent',
                                        headerName: 'Agent',
                                        width: 150,
                                        sortable: true
                                    },
                                    {
                                        field: 'description',
                                        headerName: 'Description',
                                        width: 250,
                                        sortable: true,
                                        flex: 1
                                    },
                                    {
                                        field: 'level',
                                        headerName: 'Level',
                                        width: 100,
                                        sortable: true,
                                        renderCell: (params) => (
                                            <Chip
                                                label={params.value}
                                                color={getRuleLevelColor(params.value)}
                                                size="small"
                                            />
                                        )
                                    },
                                    {
                                        field: 'hipaaControls',
                                        headerName: 'HIPAA Controls',
                                        width: 250,
                                        sortable: false,
                                        renderCell: (params) => (
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                {params.value.map((control, idx) => (
                                                    <Chip
                                                        key={idx}
                                                        label={control}
                                                        size="small"
                                                    />
                                                ))}
                                            </Box>
                                        )
                                    },
                                    {
                                        field: 'actions',
                                        headerName: 'Actions',
                                        width: 120,
                                        sortable: false,
                                        renderCell: (params) => (
                                            <Link
                                                component="button"
                                                variant="body2"
                                                onClick={() => handleViewDetails(params.row.rawLog)}
                                            >
                                                View Details
                                            </Link>
                                        )
                                    }
                                ]}
                                initialState={{
                                    pagination: {
                                        paginationModel: {
                                            pageSize: rowsPerPage,
                                        },
                                    },
                                    sorting: {
                                        sortModel: [{ field: 'timestamp', sort: 'desc' }],
                                    },
                                }}
                                pageSizeOptions={[5, 10, 25, 50]}
                                disableRowSelectionOnClick
                                autoHeight={false} // Important! Don't use autoHeight
                                sx={{
                                    // These styles ensure the DataGrid is properly contained
                                    height: '100%',
                                    width: '100%',
                                    '& .MuiDataGrid-main': {
                                        // Ensure the main content area is properly sized
                                        overflow: 'hidden',
                                        width: '100%'
                                    },
                                    // Ensure footer sticks to bottom of container
                                    '& .MuiDataGrid-footerContainer': {
                                        position: 'sticky',
                                        bottom: 0,
                                        backgroundColor: 'background.paper',
                                        zIndex: 2
                                    }
                                }}
                            />
                        </Box>
                    )}
                </Paper>
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
                        <Typography variant="h6">HIPAA Log Details</Typography>
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
        </Box >
    );
};
export default HIPAADashboard;