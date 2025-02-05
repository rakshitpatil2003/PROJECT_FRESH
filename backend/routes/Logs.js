const express = require('express');
const axios = require('axios');
const router = express.Router();
const Log = require('../models/Log');

// Cache for storing the last fetched timestamp
let lastFetchTimestamp = new Date();

// Function to fetch logs from Graylog
async function fetchGraylogLogs() {
  try {
    const graylogUrl = `http://${process.env.GRAYLOG_HOST}:${process.env.GRAYLOG_PORT}/api/search/universal/absolute`;
    const response = await axios({
      method: 'get',
      url: graylogUrl,
      params: {
        query: '*',
        from: lastFetchTimestamp.toISOString(),
        to: new Date().toISOString(),
        limit: 1000,
        fields: '*',
      },
      auth: {
        username: process.env.GRAYLOG_USERNAME,
        password: process.env.GRAYLOG_PASSWORD,
      },
    });

    return response.data.messages || [];
  } catch (error) {
    console.error('Error fetching from Graylog:', error);
    return [];
  }
}

// Function to store logs in MongoDB
async function storeLogsInMongo(logs) {
  try {
    const formattedLogs = logs.map(msg => ({
      timestamp: new Date(msg.message.timestamp || msg.timestamp),
      agent: {
        name: msg.message.agent_name || 'Unknown'
      },
      rule: {
        level: msg.message.rule_level || 'Unknown',
        description: msg.message.rule?.description || ''
      },
      network: {
        srcIp: msg.message.data?.src_ip || '',
        destIp: msg.message.data?.dest_ip || '',
        protocol: msg.message.data?.proto || ''
      },
      rawLog: msg.message
    }));

    if (formattedLogs.length > 0) {
      await Log.insertMany(formattedLogs, { ordered: false });
      console.log(`Stored ${formattedLogs.length} new logs`);
    }
    
    lastFetchTimestamp = new Date();
  } catch (error) {
    console.error('Error storing logs:', error);
  }
}

// Function to clean old logs (keep last 24 hours)
async function cleanOldLogs() {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  try {
    const result = await Log.deleteMany({ timestamp: { $lt: twentyFourHoursAgo } });
    console.log(`Cleaned ${result.deletedCount} old logs`);
  } catch (error) {
    console.error('Error cleaning old logs:', error);
  }
}

// Initialize periodic tasks
const FETCH_INTERVAL = 10000; // 10 seconds
const CLEANUP_INTERVAL = 3600000; // 1 hour

// Set up periodic log fetching
setInterval(async () => {
  const logs = await fetchGraylogLogs();
  await storeLogsInMongo(logs);
}, FETCH_INTERVAL);

// Set up periodic cleanup
setInterval(cleanOldLogs, CLEANUP_INTERVAL);


// Add this new endpoint in your existing Logs.js file
router.get('/metrics', async (req, res) => {
  try {
    const [totalLogs, majorLogs] = await Promise.all([
      Log.countDocuments(),
      Log.countDocuments({
        $or: [
          { 'rule.level': { $gte: '12' } },
          { 'rule.level': { $gte: 12 } }
        ]
      })
    ]);

    res.json({
      totalLogs,
      majorLogs
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ message: 'Error fetching metrics', error: error.message });
  }
});

// Route to get logs with pagination and filtering
// Modify the existing logs endpoint for better search
router.get('/', async (req, res) => {
  try {
    const { 
      range = 86400, 
      page = 1, 
      limit = 1000, // Changed default limit to 1000
      search = '' 
    } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const timeRange = new Date(Date.now() - range * 1000);
    
    // Build search query
    let searchQuery = { timestamp: { $gte: timeRange } };
    if (search) {
      searchQuery.$or = [
        { 'agent.name': { $regex: search, $options: 'i' } },
        { 'rule.level': { $regex: search, $options: 'i' } },
        { 'rule.description': { $regex: search, $options: 'i' } },
        { 'rawLog.message': { $regex: search, $options: 'i' } },
        { 'rawLog.full_log': { $regex: search, $options: 'i' } }
      ];
    }

    // Get total count for pagination
    const total = await Log.countDocuments(searchQuery);

    // Get logs with pagination
    const logs = await Log.find(searchQuery)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get level distribution
    const levelDistribution = await Log.aggregate([
      { $match: searchQuery },
      {
        $group: {
          _id: '$rule.level',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      logsWithGeolocation: logs,
      levelDistribution: levelDistribution.map(item => ({
        name: item._id,
        value: item.count
      })),
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