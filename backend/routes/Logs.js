// backend/routes/Logs.js
const express = require('express');
const router = express.Router();
const Log = require('../models/Log');  // This is correct
const axios = require('axios');

// Cache for metrics to avoid frequent recalculations
let metricsCache = {
  data: null,
  lastUpdated: null,
  TTL: 10000 // 10 seconds
};

// Optimized metrics endpoint with caching
router.get('/metrics', async (req, res) => {
  try {
    console.log('Fetching metrics...');
    // Return cached data if valid
    if (metricsCache.data && (Date.now() - metricsCache.lastUpdated) < metricsCache.TTL) {
      return res.json(metricsCache.data);
    }

    // Use aggregation pipeline for efficient counting
    const [metrics] = await Log.aggregate([
      
      {
        $match: {
          "rule.level": { $exists: true, $type: "string", $regex: /^\d+$/ } // Only allow numeric strings
        }
      },
      {
        $group: {
          _id: null,
          totalLogs: { $sum: 1 },
          majorLogs: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$rule.level", "Unknown"] }, // Exclude 'Unknown'
                    { $gte: [{ $toInt: "$rule.level" }, 12] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    console.log('Metrics fetched:', metrics);

    const result = {
      totalLogs: metrics?.totalLogs || 0,
      majorLogs: metrics?.majorLogs || 0,
      normalLogs: (metrics?.totalLogs || 0) - (metrics?.majorLogs || 0)
    };

    // Update cache
    metricsCache.data = result;
    metricsCache.lastUpdated = Date.now();

    res.json(result);
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ message: 'Error fetching metrics', error: error.message });
  }
});

// Optimized recent logs endpoint with projection
router.get('/recent', async (req, res) => {
  try {
    console.log('Fetching recent logs...');
    const recentLogs = await Log.find({}, {
      timestamp: 1,
      'agent.name': 1,
      'rule.level': 1,
      'rule.description': 1,
      rawLog: 1
    })
      .sort({ timestamp: -1 })
      .limit(10)
      .lean();
    console.log('Recent logs count:', recentLogs.length);

    res.json(recentLogs);
  } catch (error) {
    console.error('Error fetching recent logs:', error);
    res.status(500).json({ message: 'Error fetching recent logs', error: error.message });
  }
});

// Optimized major logs endpoint with index usage
router.get('/major', async (req, res) => {
  try {
    const majorLogs = await Log.find(
      { 'rule.level': { $gte: '12' } },
      {
        timestamp: 1,
        'agent.name': 1,
        'rule.level': 1,
        'rule.description': 1,
        rawLog: 1
      }
    )
      .sort({ timestamp: -1 })
      .lean();

    res.json(majorLogs);
  } catch (error) {
    console.error('Error fetching major logs:', error);
    res.status(500).json({ message: 'Error fetching major logs', error: error.message });
  }
});

router.get('/test', async (req, res) => {
  try {
    const log = new Log({
      timestamp: new Date(),
      agent: { name: 'test-agent' },
      rule: { level: '10', description: 'test log' },
      rawLog: { message: 'test log message' }
    });
    await log.save();
    res.json({ message: 'Log saved successfully', log });
  } catch (error) {
    console.error('Error saving log:', error);
    res.status(500).json({ message: 'Error saving log', error: error.message });
  }
});

// Optimized logs endpoint with efficient pagination and filtering
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 1000, 
      search = '' 
    } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build search query
    let searchQuery = {};
    if (search) {
      searchQuery.$or = [
        { 'agent.name': { $regex: search, $options: 'i' } },
        { 'rule.level': { $regex: search, $options: 'i' } },
        { 'rule.description': { $regex: search, $options: 'i' } }
      ];
    }

    // Fetch logs
    const [total, logs] = await Promise.all([
      Log.countDocuments(searchQuery),
      Log.find(searchQuery, {
        timestamp: 1,
        'agent.name': 1,
        'rule.level': 1,
        'rule.description': 1,
        rawLog: 1
      })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean()
    ]);

    res.json({
      logs,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ message: 'Error fetching logs', error: error.message });
  }
});

module.exports = router;