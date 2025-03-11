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
import CreditCardIcon from '@mui/icons-material/CreditCard';
import axios from 'axios';
import TablePagination from '@mui/material/TablePagination';
import { parseLogMessage } from '../utils/normalizeLogs';
import SessionLogView from '../components/SessionLogView';
import { API_URL } from '../config';
import * as echarts from 'echarts';
import ExportPDF from '../components/ExportPDF';

const PCIDSSDashboard = () => {
    const [logs, setLogs] = useState([]);
    const [pciDssLogs, setPciDssLogs] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedLog, setSelectedLog] = useState(null);
    const [pciDssStats, setPciDssStats] = useState({
        totalCount: 0,
        uniquePciDssRequirements: [],
        agentDistribution: {},
        timelineData: [],
        requirementSeverity: {},
        countryDistribution: {},
        cardDataStatistics: {
            'Card Number Exposure': 0,
            'CVV Exposure': 0,
            'Magnetic Track Data': 0,
            'Card PIN': 0,
            'Cardholder Data Storage': 0,
            'Unencrypted Transmission': 0,
            'Unauthorized Access': 0
        }
    });
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Charts references
    const dashboardRef = React.useRef(null);
    const timelineChartRef = React.useRef(null);
    const agentDistributionChartRef = React.useRef(null);
    const requirementDistributionChartRef = React.useRef(null);
    const severityDistributionChartRef = React.useRef(null);
    const countryDistributionChartRef = React.useRef(null);
    const cardDataViolationChartRef = React.useRef(null);

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

            // Filter PCI DSS logs
            const pciDssFilteredLogs = parsedLogs.filter(log => {
                const parsedLog = log.parsed;
                return parsedLog?.rule?.pci_dss && parsedLog.rule.pci_dss.length > 0;
            });

            setPciDssLogs(pciDssFilteredLogs);
            processPciDssStats(pciDssFilteredLogs);
        } catch (error) {
            console.error('Error fetching session logs:', error);
            setError(error.response?.data?.message || error.message || 'Failed to fetch session logs');
            setLogs([]);
            setPciDssLogs([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const processPciDssStats = (pciDssLogs) => {
        // Unique PCI DSS requirements
        const pciDssRequirements = new Set();

        // Agent distribution
        const agentDistribution = {};

        // Timeline data (group by day)
        const timelineMap = {};

        // Requirement severity
        const requirementSeverity = {};

        // Country distribution
        const countryDistribution = {};

        // Card data violation statistics
        const cardDataStatistics = {
            'Card Number Exposure': 0,
            'CVV Exposure': 0,
            'Magnetic Track Data': 0,
            'Card PIN': 0,
            'Cardholder Data Storage': 0,
            'Unencrypted Transmission': 0,
            'Unauthorized Access': 0
        };

        // Process logs for statistics
        pciDssLogs.forEach(log => {
            const parsedLog = log.parsed;
            const rule = parsedLog.rule || {};

            // Process PCI DSS requirements
            if (rule.pci_dss && rule.pci_dss.length) {
                rule.pci_dss.forEach(requirement => {
                    pciDssRequirements.add(requirement);

                    // Track requirement severity
                    if (!requirementSeverity[requirement]) {
                        requirementSeverity[requirement] = {
                            count: 0,
                            avgLevel: 0,
                            levels: []
                        };
                    }

                    requirementSeverity[requirement].count++;
                    requirementSeverity[requirement].levels.push(parseInt(rule.level));
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

            // Process card data violations (based on rule descriptions or PCI DSS requirements)
            const ruleDescription = rule.description?.toLowerCase() || '';

            if (ruleDescription.includes('card number') || ruleDescription.includes('pan')) {
                cardDataStatistics['Card Number Exposure']++;
            }

            if (ruleDescription.includes('cvv') || ruleDescription.includes('security code')) {
                cardDataStatistics['CVV Exposure']++;
            }

            if (ruleDescription.includes('track data') || ruleDescription.includes('magnetic stripe')) {
                cardDataStatistics['Magnetic Track Data']++;
            }

            if (ruleDescription.includes('pin') || ruleDescription.includes('personal identification number')) {
                cardDataStatistics['Card PIN']++;
            }

            if (ruleDescription.includes('storage') || ruleDescription.includes('store')) {
                cardDataStatistics['Cardholder Data Storage']++;
            }

            if (ruleDescription.includes('encrypt') || ruleDescription.includes('transmission')) {
                cardDataStatistics['Unencrypted Transmission']++;
            }

            if (ruleDescription.includes('access') || ruleDescription.includes('unauthorized')) {
                cardDataStatistics['Unauthorized Access']++;
            }
        });

        // Calculate average severity for each requirement
        Object.keys(requirementSeverity).forEach(requirement => {
            const levels = requirementSeverity[requirement].levels;
            requirementSeverity[requirement].avgLevel = levels.reduce((sum, level) => sum + level, 0) / levels.length;
        });

        // Convert timeline map to array sorted by date
        const timelineData = Object.entries(timelineMap)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        setPciDssStats({
            totalCount: pciDssLogs.length,
            uniquePciDssRequirements: Array.from(pciDssRequirements),
            agentDistribution,
            timelineData,
            requirementSeverity,
            countryDistribution,
            cardDataStatistics
        });
    };

    // Initialize and update charts
    useEffect(() => {
        if (loading) return;

        // Timeline Chart
        if (timelineChartRef.current && pciDssStats.timelineData.length > 0) {
            const timelineChart = echarts.init(timelineChartRef.current);

            const option = {
                title: {
                    text: 'PCI DSS Events Timeline',
                    left: 'center'
                },
                tooltip: {
                    trigger: 'axis',
                    formatter: '{b}: {c} events'
                },
                xAxis: {
                    type: 'category',
                    data: pciDssStats.timelineData.map(item => item.date),
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
                        data: pciDssStats.timelineData.map(item => item.count),
                        type: 'line',
                        smooth: true,
                        lineStyle: {
                            color: '#FF5722',
                            width: 3
                        },
                        symbol: 'circle',
                        symbolSize: 8,
                        itemStyle: {
                            color: '#FF5722'
                        },
                        areaStyle: {
                            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                { offset: 0, color: 'rgba(255, 87, 34, 0.8)' },
                                { offset: 1, color: 'rgba(255, 87, 34, 0.1)' }
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
    }, [pciDssStats.timelineData, loading]);

    // Agent Distribution Chart
    useEffect(() => {
        if (loading || !agentDistributionChartRef.current) return;

        const agentChart = echarts.init(agentDistributionChartRef.current);

        const agentData = Object.entries(pciDssStats.agentDistribution)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        const option = {
            title: {
                text: 'PCI DSS Events by Agent',
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
    }, [pciDssStats.agentDistribution, loading]);

    // Requirement Distribution Chart
    useEffect(() => {
        if (loading || !requirementDistributionChartRef.current) return;

        const requirementChart = echarts.init(requirementDistributionChartRef.current);

        const requirementData = Object.entries(pciDssStats.requirementSeverity)
            .map(([requirement, data]) => ({ requirement, count: data.count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10); // Top 10 requirements

        const option = {
            title: {
                text: 'Top 10 PCI DSS Requirements',
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
                data: requirementData.map(item => item.requirement),
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
                    data: requirementData.map(item => item.count),
                    itemStyle: {
                        color: function (params) {
                            const colorList = [
                                '#FF5722', '#FF9800', '#FFC107', '#FFEB3B', '#CDDC39',
                                '#8BC34A', '#4CAF50', '#009688', '#00BCD4', '#03A9F4'
                            ];
                            return colorList[params.dataIndex % colorList.length];
                        }
                    }
                }
            ]
        };

        requirementChart.setOption(option);

        const handleResize = () => {
            requirementChart.resize();
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            requirementChart.dispose();
        };
    }, [pciDssStats.requirementSeverity, loading]);

    // Severity Distribution Chart
    useEffect(() => {
        if (loading || !severityDistributionChartRef.current) return;

        const severityChart = echarts.init(severityDistributionChartRef.current);

        // Group logs by severity level
        const severityDistribution = pciDssLogs.reduce((acc, log) => {
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
    }, [pciDssLogs, loading]);

    // Country Distribution Chart
    useEffect(() => {
        if (loading || !countryDistributionChartRef.current) return;

        const countryChart = echarts.init(countryDistributionChartRef.current);

        const countryData = Object.entries(pciDssStats.countryDistribution)
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
                        color: '#FF5722'
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
    }, [pciDssStats.countryDistribution, loading]);

    // Card Data Violation Chart
    useEffect(() => {
        if (loading || !cardDataViolationChartRef.current) return;

        const cardDataChart = echarts.init(cardDataViolationChartRef.current);

        const cardDataTypes = Object.entries(pciDssStats.cardDataStatistics)
            .map(([type, count]) => ({ type, count }))
            .filter(item => item.count > 0);

        const option = {
            title: {
                text: 'Card Data Violation Types',
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
                    data: cardDataTypes.map(item => ({
                        name: item.type,
                        value: item.count
                    }))
                }
            ]
        };

        cardDataChart.setOption(option);

        const handleResize = () => {
            cardDataChart.resize();
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            cardDataChart.dispose();
        };
    }, [pciDssStats.cardDataStatistics, loading]);
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
            setPciDssLogs(logs.filter(log => {
                const parsedLog = log.parsed;
                return parsedLog?.rule?.pci_dss && parsedLog.rule.pci_dss.length > 0;
            }));
            return;
        }

        const lowerSearchTerm = searchTerm.toLowerCase();
        const filtered = logs.filter(log => {
            const parsedLog = log.parsed;

            // Only include PCI DSS logs
            if (!parsedLog?.rule?.pci_dss || parsedLog.rule.pci_dss.length === 0) {
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

            // Search in PCI DSS requirements
            if (parsedLog.rule?.pci_dss?.some(requirement =>
                requirement.toLowerCase().includes(lowerSearchTerm)
            )) {
                return true;
            }

            // Search in country
            if (parsedLog.geoip?.country_name?.toLowerCase().includes(lowerSearchTerm)) {
                return true;
            }

            return false;
        });

        setPciDssLogs(filtered);
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
        <Box ref={dashboardRef} p={4}>
            <Typography variant="h4" gutterBottom sx={{ color: '#FF5722', mb: 2 }}>
                PCI DSS Compliance Dashboard
                <Typography variant="subtitle1" sx={{ color: 'text.secondary', mt: 1 }}>
                    Payment Card Industry Data Security Standard
                </Typography>
                <ExportPDF
                    fetchData={fetchLogs}
                    currentData={pciDssLogs}
                    dashboardRef={dashboardRef}
                />
            </Typography>

            <Alert
                icon={<CreditCardIcon />}
                severity="info"
                sx={{ mb: 3 }}
            >
                {pciDssLogs.length} PCI DSS compliance events detected across {pciDssStats.uniquePciDssRequirements.length} unique requirements
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
                                Total PCI DSS Events
                            </Typography>
                            <Typography variant="h4">
                                {pciDssLogs.length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Unique Requirements
                            </Typography>
                            <Typography variant="h4">
                                {pciDssStats.uniquePciDssRequirements.length}
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
                                {Object.keys(pciDssStats.countryDistribution).length}
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
                                {pciDssLogs.filter(log => parseInt(log.parsed.rule?.level) >= 12).length}
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
                        <div ref={cardDataViolationChartRef} style={{ width: '100%', height: '100%' }} />
                    </Paper>
                </Grid>
                <Grid item xs={12}>
                    <Paper sx={{ p: 2, height: 400 }}>
                        <div ref={requirementDistributionChartRef} style={{ width: '100%', height: '100%' }} />
                    </Paper>
                </Grid>
            </Grid>

            {/* PCI DSS Logs Table */}
            <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                        PCI DSS Compliance Logs
                    </Typography>
                    <TextField
                        size="small"
                        placeholder="Search by agent, description, requirement, or country..."
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
                                <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>PCI DSS Requirements</TableCell>
                                <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Actions</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {pciDssLogs.length > 0 ? (
                                pciDssLogs
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
                                        <TableCell>{log.parsed.geoip?.country_name || 'Unknown'}</TableCell>
                                        <TableCell>
                                            {log.parsed.rule?.pci_dss?.map((req, i) => (
                                                <Chip
                                                    key={i}
                                                    label={req}
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
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} align="center">No PCI DSS logs found</TableCell>
                                </TableRow>
                            )}
                        </TableBody>                    </Table>
                </TableContainer>
                <TablePagination
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    component="div"
                    count={pciDssLogs.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={(event, newPage) => setPage(newPage)}
                    onRowsPerPageChange={(event) => {
                        setRowsPerPage(parseInt(event.target.value, 10));
                        setPage(0);
                    }}
                />
            </Box>

            {/* Session Log View Modal */}
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
                        <Typography variant="h6">PCIDSS Log Details</Typography>
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

export default PCIDSSDashboard;