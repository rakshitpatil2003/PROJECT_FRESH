import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Grid,
    Card,
    CardContent,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Chip,
    Divider,
    CircularProgress
    //useTheme
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ReactECharts from 'echarts-for-react';
import SecurityIcon from '@mui/icons-material/Security';
import GppBadIcon from '@mui/icons-material/GppBad';
import GppGoodIcon from '@mui/icons-material/GppGood';
import TimelineIcon from '@mui/icons-material/Timeline';
import TimeRangeSelector from './TimeRangeSelector';
import axios from 'axios';
import moment from 'moment';
import * as echarts from 'echarts';
//import { useTheme } from '@mui/material/styles';


const MitreAttack = () => {
    const theme = useTheme();
    const [loading, setLoading] = useState(true);
    const [mitreData, setMitreData] = useState({
        tactics: [],
        techniques: [],
        byAgent: {},
        byLevel: {},
        timeline: []
    });
    const [timeRange, setTimeRange] = useState({
        startDate: moment().subtract(7, 'days').toDate(),
        endDate: new Date()
    });
    const [selectedTactic, setSelectedTactic] = useState('all');
    const [selectedAgent, setSelectedAgent] = useState('all');

    // Fetch MITRE data from your backend
    useEffect(() => {
        const fetchMitreData = async () => {
            setLoading(true);
            try {
                const response = await axios.get('/api/logs/mitre', {
                    params: {
                        startDate: timeRange.startDate.toISOString(),
                        endDate: timeRange.endDate.toISOString()
                    }
                });
                const processedData = processMitreData(response.data);
                setMitreData(processedData); // Properly use setMitreData
            } catch (error) {
                console.error('Error fetching MITRE data:', error);
                const sampleData = processMitreData(getSampleData());
                setMitreData(sampleData);
            } finally {
                setLoading(false);
            }
        };

        fetchMitreData();
    }, [timeRange.startDate, timeRange.endDate]);

    // Process the data for visualization
    const processMitreData = (logs) => {
        const tactics = {};
        const techniques = {};
        const byAgent = {};
        const byLevel = {};
        const timelineData = {};

        logs.forEach(log => {
            // Get the normalized log data
            const parsed = log.parsedLog || log;

            if (parsed.rule?.mitre) {
                // Get agent name - handle both direct and nested structures
                const agentName = parsed.agent?.name ||
                    parsed.agent_name ||
                    'Unknown Agent';

                // Process tactics
                const tacticsList = Array.isArray(parsed.rule.mitre.tactic)
                    ? parsed.rule.mitre.tactic
                    : [parsed.rule.mitre.tactic].filter(Boolean);

                tacticsList.forEach(tactic => {
                    if (tactic) {
                        tactics[tactic] = (tactics[tactic] || 0) + 1;

                        // Initialize agent data if not exists
                        if (!byAgent[agentName]) {
                            byAgent[agentName] = { tactics: {}, techniques: {} };
                        }
                        byAgent[agentName].tactics[tactic] = (byAgent[agentName].tactics[tactic] || 0) + 1;
                    }
                });

                // Process techniques
                const techniquesList = Array.isArray(parsed.rule.mitre.technique)
                    ? parsed.rule.mitre.technique
                    : [parsed.rule.mitre.technique].filter(Boolean);

                techniquesList.forEach(technique => {
                    if (technique) {
                        techniques[technique] = (techniques[technique] || 0) + 1;
                        byAgent[agentName].techniques[technique] = (byAgent[agentName].techniques[technique] || 0) + 1;
                    }
                });

                // Process by rule level
                const level = parsed.rule.level?.toString() || 'Unknown';
                if (!byLevel[level]) {
                    byLevel[level] = { tactics: {}, techniques: {} };
                }

                tacticsList.forEach(tactic => {
                    if (tactic) {
                        byLevel[level].tactics[tactic] = (byLevel[level].tactics[tactic] || 0) + 1;
                    }
                });

                // Process timeline data
                const date = moment(parsed.timestamp).format('YYYY-MM-DD');
                if (!timelineData[date]) {
                    timelineData[date] = {
                        count: 0,
                        tactics: {},
                        byAgent: {}
                    };
                }
                timelineData[date].count += 1;

                // Add agent-specific timeline data
                if (!timelineData[date].byAgent[agentName]) {
                    timelineData[date].byAgent[agentName] = { count: 0, tactics: {} };
                }
                timelineData[date].byAgent[agentName].count += 1;

                tacticsList.forEach(tactic => {
                    if (tactic) {
                        timelineData[date].tactics[tactic] = (timelineData[date].tactics[tactic] || 0) + 1;
                        timelineData[date].byAgent[agentName].tactics[tactic] =
                            (timelineData[date].byAgent[agentName].tactics[tactic] || 0) + 1;
                    }
                });
            }
        });

        // Convert to arrays and sort
        const tacticsArray = Object.entries(tactics)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);

        const techniquesArray = Object.entries(techniques)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);

        // Process timeline data
        const timelineDates = Object.keys(timelineData).sort();
        const timeline = timelineDates.map(date => ({
            date,
            count: timelineData[date].count,
            tactics: timelineData[date].tactics,
            byAgent: timelineData[date].byAgent
        }));

        return {
            tactics: tacticsArray,
            techniques: techniquesArray,
            byAgent,
            byLevel,
            timeline
        };
    };


    // Get sample data for development (replace with actual API call in production)
    const getSampleData = () => {
        return Array(50).fill().map((_, i) => ({
            timestamp: moment().subtract(Math.floor(Math.random() * 7), 'days').toISOString(),
            agent: { name: `agent-${Math.floor(Math.random() * 5) + 1}`, id: `id-${i}` },
            rule: {
                level: `${Math.floor(Math.random() * 15) + 1}`,
                mitre: {
                    id: [`T${Math.floor(Math.random() * 1000) + 1000}`],
                    tactic: [['Execution', 'Persistence', 'Privilege Escalation', 'Defense Evasion', 'Credential Access', 'Discovery', 'Lateral Movement', 'Collection', 'Command and Control', 'Exfiltration', 'Impact'][Math.floor(Math.random() * 11)]],
                    technique: [['Process Injection', 'Scheduled Task', 'Windows Command Shell', 'PowerShell', 'Registry Run Keys', 'DLL Side-Loading', 'BITS Jobs', 'Account Manipulation'][Math.floor(Math.random() * 8)]]
                }
            }
        }));
    };

    // Filter data based on selections
    const getFilteredData = () => {
        let filteredTechniques = [...mitreData.techniques];

        if (selectedTactic !== 'all') {
            // Find logs with the selected tactic and count their techniques
            const relevantTechniques = {};
            Object.values(mitreData.byAgent).forEach(agent => {
                if (selectedAgent === 'all' || agent === selectedAgent) {
                    Object.entries(agent.techniques).forEach(([technique, count]) => {
                        relevantTechniques[technique] = (relevantTechniques[technique] || 0) + count;
                    });
                }
            });
            filteredTechniques = Object.entries(relevantTechniques).map(([name, count]) => ({ name, count }));
            filteredTechniques.sort((a, b) => b.count - a.count);
        }

        return filteredTechniques;
    };

    // Chart options
    const getTacticsChartOption = () => {
        const getColor = (index) => {
            const colors = [
                theme.palette.primary.main,
                theme.palette.secondary.main,
                theme.palette.error.main,
                theme.palette.warning.main,
                theme.palette.info.main,
                theme.palette.success.main
            ];
            return colors[index % colors.length];
        };

        return {
            tooltip: {
                trigger: 'item',
                formatter: '{b}: {c} ({d}%)'
            },
            legend: {
                type: 'scroll',
                orient: 'vertical',
                right: 10,
                top: 20,
                bottom: 20,
                data: mitreData.tactics.map(item => item.name)
            },
            series: [
                {
                    name: 'Tactics',
                    type: 'pie',
                    radius: ['40%', '70%'],
                    center: ['40%', '50%'],
                    data: mitreData.tactics.map((item, index) => ({
                        value: item.count,
                        name: item.name,
                        itemStyle: {
                            color: getColor(index)
                        }
                    })),
                    avoidLabelOverlap: false,
                    itemStyle: {
                        borderRadius: 10,
                        borderColor: theme.palette.background.paper,
                        borderWidth: 2
                    },
                    label: {
                        show: false,
                        position: 'center'
                    },
                    emphasis: {
                        label: {
                            show: true,
                            fontSize: '16',
                            fontWeight: 'bold'
                        }
                    },
                    labelLine: {
                        show: false
                    }
                    
                }
            ]
        };
    };

    const getTechniquesChartOption = () => {
        const filteredTechniques = getFilteredData().slice(0, 10); // Top 10 techniques
        const gradientColors = {
            start: theme.palette.primary.light || '#90caf9',
            end: theme.palette.primary.main || '#1976d2'
        };

        return {
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
                boundaryGap: [0, 0.01]
            },
            yAxis: {
                type: 'category',
                data: filteredTechniques.map(item => item.name),
                axisTick: {
                    alignWithLabel: true
                },
                axisLabel: {
                    rotate: 0,
                    formatter: (value) => {
                        return value.length > 20 ? value.substring(0, 20) + '...' : value;
                    }
                }
            },
            series: [
                {
                    name: 'Count',
                    type: 'bar',
                    data: filteredTechniques.map(item => ({
                        value: item.count,
                        itemStyle: {
                            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                                {
                                    offset: 0,
                                    color: gradientColors.start
                                },
                                {
                                    offset: 1,
                                    color: gradientColors.end
                                }
                            ])
                        }
                    }))
                }
            ]
        };
    };

    const getTimelineChartOption = () => {
        const dates = mitreData.timeline.map(item => item.date);
        const counts = mitreData.timeline.map(item => item.count);
        const gradientColors = {
            start: theme.palette.primary.light || '#90caf9',
            end: theme.palette.primary.main || '#1976d2'
        };

    
        return {
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'cross',
                    label: {
                        backgroundColor: theme.palette.primary.main
                    }
                }
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                boundaryGap: false,
                data: dates
            },
            yAxis: {
                type: 'value'
            },
            series: [{
                name: 'MITRE Alerts',
                type: 'line',
                stack: 'Total',
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        {
                            offset: 0,
                            color: gradientColors.start
                        },
                        {
                            offset: 1,
                            color: gradientColors.end
                        }
                    ])
                },
                emphasis: {
                    focus: 'series'
                },
                data: counts,
                smooth: true,
                lineStyle: {
                    width: 3,
                    color: theme.palette.primary.main
                },
                itemStyle: {
                    color: theme.palette.primary.main
                }
            }]
        };
    };

    const getHeatmapOption = () => {
        const agents = Object.keys(mitreData.byAgent);
        const tactics = mitreData.tactics.map(t => t.name);

        const data = [];
        agents.forEach((agent, agentIndex) => {
            tactics.forEach((tactic, tacticIndex) => {
                const count = mitreData.byAgent[agent]?.tactics[tactic] || 0;
                if (count > 0) {
                    data.push([tacticIndex, agentIndex, count]);
                }
            });
        });

        return {
            tooltip: {
                position: 'top',
                formatter: function (params) {
                    const agent = agents[params.value[1]];
                    const tactic = tactics[params.value[0]];
                    const count = params.value[2];
                    return `Agent: ${agent}<br/>Tactic: ${tactic}<br/>Count: ${count}`;
                }
            },
            grid: {
                height: '70%',
                top: '10%'
            },
            xAxis: {
                type: 'category',
                data: tactics,
                splitArea: {
                    show: true
                },
                axisLabel: {
                    rotate: 45,
                    formatter: (value) => {
                        return value.length > 15 ? value.substring(0, 15) + '...' : value;
                    }
                }
            },
            yAxis: {
                type: 'category',
                data: agents,
                splitArea: {
                    show: true
                }
            },
            visualMap: {
                min: 0,
                max: Math.max(...data.map(item => item[2])),
                calculable: true,
                orient: 'horizontal',
                left: 'center',
                bottom: '0%'
            },
            series: [{
                name: 'Tactics by Agent',
                type: 'heatmap',
                data: data,
                label: {
                    show: true,
                    formatter: (params) => params.value[2]
                },
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                }
            }]
        };
    };


    // Summary metrics
    const getSummaryMetrics = () => {
        return [
            {
                title: 'Total MITRE Alerts',
                value: mitreData.tactics.reduce((sum, tactic) => sum + tactic.count, 0),
                icon: <SecurityIcon fontSize="large" sx={{ color: theme.palette.primary.main }} />
            },
            {
                title: 'Unique Tactics',
                value: mitreData.tactics.length,
                icon: <GppGoodIcon fontSize="large" sx={{ color: theme.palette.success.main }} />
            },
            {
                title: 'Unique Techniques',
                value: mitreData.techniques.length,
                icon: <GppBadIcon fontSize="large" sx={{ color: theme.palette.warning.main }} />
            },
            {
                title: 'Affected Agents',
                value: Object.keys(mitreData.byAgent).length,
                icon: <TimelineIcon fontSize="large" sx={{ color: theme.palette.info.main }} />
            }
        ];
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            {/* Time Range Selector */}
            <Paper sx={{ p: 2, mb: 3 }}>
                <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
            </Paper>

            {/* Summary Cards */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                {getSummaryMetrics().map((metric, index) => (
                    <Grid item xs={12} sm={6} md={3} key={index}>
                        <Card>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box>
                                        <Typography variant="h6" color="textSecondary" gutterBottom>
                                            {metric.title}
                                        </Typography>
                                        <Typography variant="h4">
                                            {metric.value}
                                        </Typography>
                                    </Box>
                                    {metric.icon}
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Filters */}
            
            <Paper sx={{ p: 2, mb: 3 }}>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel>Filter by Tactic</InputLabel>
                            <Select
                                value={selectedTactic}
                                onChange={(e) => setSelectedTactic(e.target.value)}
                                label="Filter by Tactic"
                            >
                                <MenuItem value="all">All Tactics</MenuItem>
                                {mitreData.tactics.map((tactic) => (
                                    <MenuItem key={tactic.name} value={tactic.name}>
                                        {tactic.name} ({tactic.count})
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel>Filter by Agent</InputLabel>
                            <Select
                                value={selectedAgent}
                                onChange={(e) => setSelectedAgent(e.target.value)}
                                label="Filter by Agent"
                            >
                                <MenuItem value="all">All Agents</MenuItem>
                                {Object.entries(mitreData.byAgent).map(([agent, data]) => {
                                    const totalAlerts = Object.values(data.tactics)
                                        .reduce((sum, count) => sum + count, 0);
                                    return (
                                        <MenuItem key={agent} value={agent}>
                                            {agent} ({totalAlerts} alerts)
                                        </MenuItem>
                                    );
                                })}
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>
            </Paper>


            {/* Charts */}
            <Grid container spacing={3}>
                {/* Tactics Distribution */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, height: '400px' }}>
                        <Typography variant="h6" gutterBottom>
                            Tactics Distribution
                        </Typography>
                        <ReactECharts option={getTacticsChartOption()} style={{ height: '100%' }} />
                    </Paper>
                </Grid>

                {/* Top Techniques */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, height: '400px' }}>
                        <Typography variant="h6" gutterBottom>
                            Top Techniques
                        </Typography>
                        <ReactECharts option={getTechniquesChartOption()} style={{ height: '100%' }} />
                    </Paper>
                </Grid>

                {/* Timeline */}
                <Grid item xs={12}>
                    <Paper sx={{ p: 2, height: '400px' }}>
                        <Typography variant="h6" gutterBottom>
                            MITRE Alerts Timeline
                        </Typography>
                        <ReactECharts option={getTimelineChartOption()} style={{ height: '100%' }} />
                    </Paper>
                </Grid>

                {/* Heatmap */}
                <Grid item xs={12}>
                    <Paper sx={{ p: 2, height: '500px' }}>
                        <Typography variant="h6" gutterBottom>
                            Tactics by Agent Heatmap
                        </Typography>
                        <ReactECharts option={getHeatmapOption()} style={{ height: '100%' }} />
                    </Paper>
                </Grid>
            </Grid>

            {/* Detailed List */}
            <Paper sx={{ mt: 3, p: 2 }}>
                <Typography variant="h6" gutterBottom>
                    Recent MITRE Alerts
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={1}>
                    {mitreData.timeline.slice(-5).reverse().map((item, index) => (
                        <Grid item xs={12} key={index}>
                            <Paper elevation={0} sx={{ p: 1, bgcolor: 'background.default' }}>
                                <Typography variant="subtitle2">
                                    {moment(item.date).format('MMMM D, YYYY')}
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                                    {Object.entries(item.tactics).map(([tactic, count], idx) => (
                                        <Chip
                                            key={idx}
                                            label={`${tactic}: ${count}`}
                                            size="small"
                                            color="primary"
                                            variant="outlined"
                                        />
                                    ))}
                                </Box>
                            </Paper>
                        </Grid>
                    ))}
                </Grid>
            </Paper>
        </Box>
    );
};

export default MitreAttack;
