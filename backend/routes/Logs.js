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
    
    const [metrics] = await Log.aggregate([
      {
        $addFields: {
          numericLevel: {
            $convert: {
              input: "$rule.level",
              to: "int",
              onError: 0,
              onNull: 0
            }
          }
        }
      },
      {
        $group: {
          _id: {
            agentName: '$agent.name',
            ruleLevel: '$rule.level',
            ruleDescription: '$rule.description',
            timestamp: {
              $dateToString: {
                format: '%Y-%m-%d %H:%M:%S',
                date: '$timestamp'
              }
            }
          },
          uniqueId: { $first: '$_id' }
        }
      },
      {
        $group: {
          _id: null,
          totalLogs: { $sum: 1 },
          majorLogs: {
            $sum: {
              $cond: [
                { $gte: [{ $toInt: "$_id.ruleLevel" }, 12] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    const result = {
      totalLogs: metrics?.totalLogs || 0,
      majorLogs: metrics?.majorLogs || 0,
      normalLogs: (metrics?.totalLogs || 0) - (metrics?.majorLogs || 0)
    };

    console.log('Metrics calculated:', result);
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
    const { search = '' } = req.query;
    console.log('Fetching unique major logs with search:', search);
    
    // Build the base query for major logs with explicit type conversion
    let query = {
      $and: [
        {
          $or: [
            // Handle numeric levels
            { 'rule.level': { $gte: 12 } },
            // Handle string levels
            {
              $expr: {
                $gte: [
                  { $toInt: '$rule.level' },
                  12
                ]
              }
            }
          ]
        }
      ]
    };

    // Add search criteria if provided
    if (search) {
      query.$and.push({
        $or: [
          { 'agent.name': { $regex: search, $options: 'i' } },
          { 'rule.description': { $regex: search, $options: 'i' } },
          { 'network.srcIp': { $regex: search, $options: 'i' } },
          { 'network.destIp': { $regex: search, $options: 'i' } }
        ]
      });
    }

    // Use aggregation to get unique logs
    const majorLogs = await Log.aggregate([
      { $match: query },
      // Add a stage to ensure proper level comparison
      {
        $addFields: {
          numericLevel: {
            $convert: {
              input: '$rule.level',
              to: 'int',
              onError: 0,
              onNull: 0
            }
          }
        }
      },
      // Only keep logs with level >= 12 after conversion
      {
        $match: {
          numericLevel: { $gte: 12 }
        }
      },
      // Group by the fields that determine uniqueness
      {
        $group: {
          _id: {
            agentName: '$agent.name',
            ruleLevel: '$numericLevel', // Use converted level
            ruleDescription: '$rule.description',
            timestamp: {
              $dateToString: {
                format: '%Y-%m-%d %H:%M:%S',
                date: '$timestamp'
              }
            }
          },
          // Keep the first occurrence's full data
          originalId: { $first: '$_id' },
          timestamp: { $first: '$timestamp' },
          agent: { $first: '$agent' },
          rule: { $first: '$rule' },
          network: { $first: '$network' },
          rawLog: { $first: '$rawLog' },
          uniqueIdentifier: { $first: '$uniqueIdentifier' },
          numericLevel: { $first: '$numericLevel' } // Keep the numeric level
        }
      },
      // Sort by level (descending) and then timestamp (descending)
      { 
        $sort: { 
          numericLevel: -1,
          timestamp: -1 
        } 
      },
      { $limit: 1000 }
    ]);

    console.log(`Found ${majorLogs.length} unique major logs`);
    
    // Add additional validation before sending response
    const validatedLogs = majorLogs.filter(log => {
      const level = parseInt(log.rule.level);
      return !isNaN(level) && level >= 12;
    });

    console.log(`Validated ${validatedLogs.length} logs with level >= 12`);
    
    res.json(validatedLogs);
  } catch (error) {
    console.error('Error fetching major logs:', error);
    res.status(500).json({ 
      message: 'Error fetching major logs', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// backend/routes/Logs.js - Update the session endpoint

// Update the session endpoint in routes/Logs.js

router.get('/session', async (req, res) => {
  try {
    const { search = '' } = req.query;
    
    // Build search query for all compliance standards
    let searchQuery = {
      $or: [
        // Check for compliance standards in rawLog message
        { "rawLog.message": { $regex: /hipaa|gdpr|pci_dss|nist_800_53/i } },
        // Check for compliance arrays in rule
        { "rule.hipaa": { $exists: true, $ne: [] } },
        { "rule.gdpr": { $exists: true, $ne: [] } },
        { "rule.pci_dss": { $exists: true, $ne: [] } },
        { "rule.nist_800_53": { $exists: true, $ne: [] } }
      ]
    };

    // Add text search if provided
    if (search) {
      searchQuery = {
        $and: [
          searchQuery,
          {
            $or: [
              { "agent.name": { $regex: search, $options: 'i' } },
              { "rule.description": { $regex: search, $options: 'i' } },
              { "rawLog.message": { $regex: search, $options: 'i' } }
            ]
          }
        ]
      };
    }

    // Execute query with proper sorting
    const sessionLogs = await Log.find(searchQuery)
      .sort({ timestamp: -1 })
      .lean();

    console.log(`Found ${sessionLogs.length} compliance-related logs`);
    
    res.json(sessionLogs);
  } catch (error) {
    console.error('Error in /session endpoint:', error);
    res.status(500).json({ 
      message: 'Error fetching compliance logs', 
      error: error.message 
    });
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
// In routes/Logs.js, update the search query:

router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 1000, 
      search = '' 
    } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Improved search query
    let searchQuery = {};
    if (search) {
      searchQuery.$or = [
        { 'agent.name': { $regex: search, $options: 'i' } },
        { 'rule.level': search },  // Exact match for rule level
        { 'rule.description': { $regex: search, $options: 'i' } },
        { 'network.srcIp': { $regex: search, $options: 'i' } },
        { 'network.destIp': { $regex: search, $options: 'i' } },
        { 'rawLog.message': { $regex: search, $options: 'i' } }
      ];
    }

    // Fetch logs with proper index usage
    const [total, logs] = await Promise.all([
      Log.countDocuments(searchQuery),
      Log.find(searchQuery)
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