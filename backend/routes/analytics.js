// routes/analytics.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Log = require('../models/Log');
const mongoose = require('mongoose');

// Helper to parse time range
const getTimeRangeFilter = (timeRange) => {
    const now = new Date();
    let timeFilter = {};

    switch (timeRange) {
        case '1h':
            timeFilter = { timestamp: { $gte: new Date(now - 60 * 60 * 1000) } };
            break;
        case '3h':
            timeFilter = { timestamp: { $gte: new Date(now - 3 * 60 * 60 * 1000) } };
            break;
        case '12h':
            timeFilter = { timestamp: { $gte: new Date(now - 12 * 60 * 60 * 1000) } };
            break;
        case '7d':
            timeFilter = { timestamp: { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) } };
            break;
        case '24h':
        default:
            timeFilter = { timestamp: { $gte: new Date(now - 24 * 60 * 60 * 1000) } };
    }

    return timeFilter;
};

// Helper to apply log type filter
const applyLogTypeFilter = (query, logType) => {
    if (logType === 'fortigate') {
        return query.match({ "agent.name": /fortigate/i });
    } else if (logType === 'other') {
        return query.match({
            $and: [
                { "agent.name": { $exists: true } },
                { "agent.name": { $not: /fortigate/i } }
            ]
        });
    }
    return query; // Return original query for 'all' logs
};

// Helper to apply protocol filter
const applyProtocolFilter = (query, protocol) => {
    if (protocol && protocol !== 'all') {
        return query.match({ "network.protocol": protocol });
    }
    return query;
};

// @route   GET /api/analytics/summary
// @desc    Get summary statistics for the dashboard
// @access  Private
router.get('/summary', auth, async (req, res) => {
    try {
        const { timeRange = '24h', logType = 'all' } = req.query;

        // Build base query
        let pipeline = [{ $match: getTimeRangeFilter(timeRange) }];

        // Apply log type filter
        if (logType !== 'all') {
            pipeline.push(applyLogTypeFilter({ $match: {} }, logType).$match);
        }

        // Add aggregation to count by level
        pipeline = [
            ...pipeline,
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    noticeLogs: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $gte: [{ $toInt: "$rule.level" }, 1] },
                                        { $lte: [{ $toInt: "$rule.level" }, 7] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    },
                    warningLogs: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $gte: [{ $toInt: "$rule.level" }, 8] },
                                        { $lte: [{ $toInt: "$rule.level" }, 11] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    },
                    criticalLogs: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        // Continuing from where your file left off...
                                        { $gte: [{ $toInt: "$rule.level" }, 12] },
                                        { $lte: [{ $toInt: "$rule.level" }, 15] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    }
                }
            }
        ];

        const result = await Log.aggregate(pipeline);

        // Format the response
        const summary = result[0] || {
            total: 0,
            noticeLogs: 0,
            warningLogs: 0,
            criticalLogs: 0
        };

        res.json(summary);
    } catch (error) {
        console.error('Error fetching summary:', error);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/analytics/trends
// @desc    Get trend data over time
// @access  Private
router.get('/trends', auth, async (req, res) => {
    try {
        const { timeRange = '24h', logType = 'all', interval = '1h' } = req.query;

        let pipeline = [{ $match: getTimeRangeFilter(timeRange) }];

        // Apply log type filter
        if (logType !== 'all') {
            pipeline.push(applyLogTypeFilter({ $match: {} }, logType).$match);
        }

        // Group by time interval
        pipeline.push({
            $group: {
                _id: {
                    $dateToString: {
                        format: "%Y-%m-%d %H:00:00",
                        date: "$timestamp"
                    }
                },
                count: { $sum: 1 },
                noticeLogs: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $gte: [{ $toInt: "$rule.level" }, 1] },
                                    { $lte: [{ $toInt: "$rule.level" }, 7] }
                                ]
                            },
                            1,
                            0
                        ]
                    }
                },
                warningLogs: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $gte: [{ $toInt: "$rule.level" }, 8] },
                                    { $lte: [{ $toInt: "$rule.level" }, 11] }
                                ]
                            },
                            1,
                            0
                        ]
                    }
                },
                criticalLogs: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $gte: [{ $toInt: "$rule.level" }, 12] },
                                    { $lte: [{ $toInt: "$rule.level" }, 15] }
                                ]
                            },
                            1,
                            0
                        ]
                    }
                }
            }
        });

        // Sort by timestamp
        pipeline.push({ $sort: { "_id": 1 } });

        const trends = await Log.aggregate(pipeline);
        res.json(trends);
    } catch (error) {
        console.error('Error fetching trends:', error);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/analytics/top-sources
// @desc    Get top log sources
// @access  Private
router.get('/top-sources', auth, async (req, res) => {
    try {
        const { timeRange = '24h', limit = 10 } = req.query;

        const pipeline = [
            { $match: getTimeRangeFilter(timeRange) },
            {
                $group: {
                    _id: "$agent.name",
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: parseInt(limit) }
        ];

        const sources = await Log.aggregate(pipeline);
        res.json(sources);
    } catch (error) {
        console.error('Error fetching top sources:', error);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
