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
import ShieldIcon from '@mui/icons-material/Shield';
import axios from 'axios';
import { parseLogMessage } from '../utils/normalizeLogs';
import SessionLogView from '../components/SessionLogView';
import { API_URL } from '../config';
import * as echarts from 'echarts';

const GDPRDashboard = () => {
    const [logs, setLogs] = useState([]);
    const [gdprLogs, setGdprLogs] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedLog, setSelectedLog] = useState(null);
    const [gdprStats, setGdprStats] = useState({
        totalCount: 0,
        uniqueGdprArticles: [],
        agentDistribution: {},
        timelineData: [],
        articleSeverity: {},
        countryDistribution: {},
        dataSubjectRequestTypes: {
            'Access': 0,
            'Rectification': 0,
            'Erasure': 0,
            'Restriction': 0,
            'Portability': 0,
            'Object': 0,
            'Automated Decision': 0
        }
    });

    // Charts references
    const timelineChartRef = React.useRef(null);
    const agentDistributionChartRef = React.useRef(null);
    const articleDistributionChartRef = React.useRef(null);
    const severityDistributionChartRef = React.useRef(null);
    const countryDistributionChartRef = React.useRef(null);
    const dsrTypeChartRef = React.useRef(null);

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

            // Filter GDPR logs
            const gdprFilteredLogs = parsedLogs.filter(log => {
                const parsedLog = log.parsed;
                return parsedLog?.rule?.gdpr && parsedLog.rule.gdpr.length > 0;
            });

            setGdprLogs(gdprFilteredLogs);
            processGdprStats(gdprFilteredLogs);
        } catch (error) {
            console.error('Error fetching session logs:', error);
            setError(error.response?.data?.message || error.message || 'Failed to fetch session logs');
            setLogs([]);
            setGdprLogs([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const processGdprStats = (gdprLogs) => {
        // Unique GDPR articles
        const gdprArticles = new Set();

        // Agent distribution
        const agentDistribution = {};

        // Timeline data (group by day)
        const timelineMap = {};

        // Article severity
        const articleSeverity = {};

        // Country distribution
        const countryDistribution = {};

        // Data Subject Request Types
        const dsrTypes = {
            'Access': 0,
            'Rectification': 0,
            'Erasure': 0,
            'Restriction': 0,
            'Portability': 0,
            'Object': 0,
            'Automated Decision': 0
        };

        gdprLogs.forEach(log => {
            const parsedLog = log.parsed;
            const rule = parsedLog.rule || {};

            // Process GDPR articles
            if (rule.gdpr && rule.gdpr.length) {
                rule.gdpr.forEach(article => {
                    gdprArticles.add(article);

                    // Track article severity
                    if (!articleSeverity[article]) {
                        articleSeverity[article] = {
                            count: 0,
                            avgLevel: 0,
                            levels: []
                        };
                    }

                    articleSeverity[article].count++;
                    articleSeverity[article].levels.push(parseInt(rule.level));
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

            // Process country information (if available)
            const country = parsedLog.geoip?.country_name || 'Unknown';
            if (!countryDistribution[country]) {
                countryDistribution[country] = 0;
            }
            countryDistribution[country]++;

            // Process Data Subject Request types (this is an example - adjust based on your actual data structure)
            if (rule.dsr_type) {
                if (dsrTypes.hasOwnProperty(rule.dsr_type)) {
                    dsrTypes[rule.dsr_type]++;
                }
            }
        });

        // Calculate average severity for each article
        Object.keys(articleSeverity).forEach(article => {
            const levels = articleSeverity[article].levels;
            articleSeverity[article].avgLevel = levels.reduce((sum, level) => sum + level, 0) / levels.length;
        });

        // Convert timeline map to array sorted by date
        const timelineData = Object.entries(timelineMap)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        setGdprStats({
            totalCount: gdprLogs.length,
            uniqueGdprArticles: Array.from(gdprArticles),
            agentDistribution,
            timelineData,
            articleSeverity,
            countryDistribution,
            dataSubjectRequestTypes: dsrTypes
        });
    };

    // Initialize and update charts
    useEffect(() => {
        if (loading) return;

        // Timeline Chart
        if (timelineChartRef.current && gdprStats.timelineData.length > 0) {
            const timelineChart = echarts.init(timelineChartRef.current);

            const option = {
                title: {
                    text: 'GDPR Events Timeline',
                    left: 'center'
                },
                tooltip: {
                    trigger: 'axis',
                    formatter: '{b}: {c} events'
                },
                xAxis: {
                    type: 'category',
                    data: gdprStats.timelineData.map(item => item.date),
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
                        data: gdprStats.timelineData.map(item => item.count),
                        type: 'line',
                        smooth: true,
                        lineStyle: {
                            color: '#4CAF50',
                            width: 3
                        },
                        symbol: 'circle',
                        symbolSize: 8,
                        itemStyle: {
                            color: '#4CAF50'
                        },
                        areaStyle: {
                            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                { offset: 0, color: 'rgba(76, 175, 80, 0.8)' },
                                { offset: 1, color: 'rgba(76, 175, 80, 0.1)' }
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
    }, [gdprStats.timelineData, loading]);

    // Agent Distribution Chart
    useEffect(() => {
        if (loading || !agentDistributionChartRef.current) return;

        const agentChart = echarts.init(agentDistributionChartRef.current);

        const agentData = Object.entries(gdprStats.agentDistribution)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        const option = {
            title: {
                text: 'GDPR Events by Agent',
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
    }, [gdprStats.agentDistribution, loading]);

    // Article Distribution Chart
    useEffect(() => {
        if (loading || !articleDistributionChartRef.current) return;

        const articleChart = echarts.init(articleDistributionChartRef.current);

        const articleData = Object.entries(gdprStats.articleSeverity)
            .map(([article, data]) => ({ article, count: data.count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10); // Top 10 articles

        const option = {
            title: {
                text: 'Top 10 GDPR Articles',
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
                data: articleData.map(item => item.article),
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
                    data: articleData.map(item => item.count),
                    itemStyle: {
                        color: function (params) {
                            const colorList = [
                                '#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107',
                                '#FF9800', '#FF5722', '#795548', '#9E9E9E', '#607D8B'
                            ];
                            return colorList[params.dataIndex % colorList.length];
                        }
                    }
                }
            ]
        };

        articleChart.setOption(option);

        const handleResize = () => {
            articleChart.resize();
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            articleChart.dispose();
        };
    }, [gdprStats.articleSeverity, loading]);

    // Severity Distribution Chart
    useEffect(() => {
        if (loading || !severityDistributionChartRef.current) return;

        const severityChart = echarts.init(severityDistributionChartRef.current);

        // Group logs by severity level
        const severityDistribution = gdprLogs.reduce((acc, log) => {
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
    }, [gdprLogs, loading]);

    // Country Distribution Chart
    useEffect(() => {
        if (loading || !countryDistributionChartRef.current) return;

        const countryChart = echarts.init(countryDistributionChartRef.current);

        const countryData = Object.entries(gdprStats.countryDistribution)
            .map(([country, count]) => ({ country, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10); // Top 10 countries

        const option = {
            title: {
                text: 'Top 10 Countries',
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
                data: countryData.map(item => item.country),
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
                    data: countryData.map(item => item.count),
                    itemStyle: {
                        color: '#3F51B5'
                    }
                }
            ]
        };

        countryChart.setOption(option);

        const handleResize = () => {
            countryChart.resize();
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            countryChart.dispose();
        };
    }, [gdprStats.countryDistribution, loading]);

    // DSR Types Chart
    useEffect(() => {
        if (loading || !dsrTypeChartRef.current) return;

        const dsrChart = echarts.init(dsrTypeChartRef.current);

        const dsrData = Object.entries(gdprStats.dataSubjectRequestTypes)
            .map(([type, count]) => ({ type, count }))
            .filter(item => item.count > 0);

        const option = {
            title: {
                text: 'Data Subject Request Types',
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
                    radius: ['30%', '70%'],
                    avoidLabelOverlap: false,
                    itemStyle: {
                        borderRadius: 10,
                        borderColor: '#fff',
                        borderWidth: 2
                    },
                    label: {
                        show: true,
                        formatter: '{b}: {c}'
                    },
                    emphasis: {
                        label: {
                            show: true,
                            fontSize: '18',
                            fontWeight: 'bold'
                        }
                    },
                    data: dsrData.map(item => ({
                        name: item.type,
                        value: item.count
                    }))
                }
            ]
        };

        dsrChart.setOption(option);

        const handleResize = () => {
            dsrChart.resize();
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            dsrChart.dispose();
        };
    }, [gdprStats.dataSubjectRequestTypes, loading]);

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
            setGdprLogs(logs.filter(log => {
                const parsedLog = log.parsed;
                return parsedLog?.rule?.gdpr && parsedLog.rule.gdpr.length > 0;
            }));
            return;
        }

        const lowerSearchTerm = searchTerm.toLowerCase();
        const filtered = logs.filter(log => {
            const parsedLog = log.parsed;

            // Only include GDPR logs
            if (!parsedLog?.rule?.gdpr || parsedLog.rule.gdpr.length === 0) {
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

            // Search in GDPR articles
            if (parsedLog.rule?.gdpr?.some(article =>
                article.toLowerCase().includes(lowerSearchTerm)
            )) {
                return true;
            }

            // Search in country
            if (parsedLog.geoip?.country_name?.toLowerCase().includes(lowerSearchTerm)) {
                return true;
            }

            return false;
        });

        setGdprLogs(filtered);
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
            <Typography variant="h4" gutterBottom sx={{ color: '#4CAF50', mb: 2 }}>
                GDPR Compliance Dashboard
                <Typography variant="subtitle1" sx={{ color: 'text.secondary', mt: 1 }}>
                    General Data Protection Regulation
                </Typography>
            </Typography>

            <Alert
                icon={<ShieldIcon />}
                severity="info"
                sx={{ mb: 3 }}
            >
                {gdprLogs.length} GDPR compliance events detected across {gdprStats.uniqueGdprArticles.length} unique GDPR articles
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
                                Total GDPR Events
                            </Typography>
                            <Typography variant="h4">
                                {gdprLogs.length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Unique GDPR Articles
                            </Typography>
                            <Typography variant="h4">
                                {gdprStats.uniqueGdprArticles.length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Affected Countries
                            </Typography>
                            <Typography variant="h4">
                                {Object.keys(gdprStats.countryDistribution).length}
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
                                {gdprLogs.filter(log => parseInt(log.parsed.rule?.level) >= 12).length}
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
                        <div ref={countryDistributionChartRef} style={{ width: '100%', height: '100%' }} />
                    </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, height: 400 }}>
                        <div ref={dsrTypeChartRef} style={{ width: '100%', height: '100%' }} />
                    </Paper>
                </Grid>
                <Grid item xs={12}>
                    <Paper sx={{ p: 2, height: 400 }}>
                        <div ref={articleDistributionChartRef} style={{ width: '100%', height: '100%' }} />
                    </Paper>
                </Grid>
            </Grid>

            {/* GDPR Logs Table */}
            <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                        GDPR Compliance Logs
                    </Typography>
                    <TextField
                        size="small"
                        placeholder="Search by agent, description, article, or country..."
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
                                <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Country</TableCell>
                                <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>GDPR Articles</TableCell>
                                <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Actions</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {gdprLogs.map((log, index) => (
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
                                    <TableCell>{log.parsed.geoip?.country_name || 'Unknown'}</TableCell>
                                    <TableCell>
                                        {log.parsed.rule?.gdpr?.map((article, idx) => (
                                            <Chip
                                                key={idx}
                                                label={article}
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

            {/* Log Details            {/* Session Log View Dialog */}
            {selectedLog && (
                <SessionLogView
                    log={selectedLog}
                    open={Boolean(selectedLog)}
                    onClose={() => setSelectedLog(null)}
                />
            )}
        </Box>
    );
};

// Helper function to get severity color
const getSeverityColor = (level) => {
    if (level >= 12) return '#f44336'; // Red
    if (level >= 8) return '#ff9800';  // Orange
    if (level >= 4) return '#2196f3';  // Blue
    return '#4caf50';                  // Green
};

// PropTypes validation
GDPRDashboard.propTypes = {
    // Add any props if needed
};

export default GDPRDashboard;
