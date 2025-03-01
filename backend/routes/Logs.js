// backend/routes/Logs.js
const express = require('express');
const router = express.Router();
const Log = require('../models/Log');  // This is correct
const axios = require('axios');
const auth = require('../routes/auth');

// Cache for metrics to avoid frequent recalculations
let metricsCache = {
  data: null,
  lastUpdated: null,
  TTL: 10000 // 10 seconds
};

router.get('/summary', auth, async (req, res) => {
  try {
    const { timeRange, logType } = req.query;
    
    // Calculate time filter
    const timeFilter = getTimeFilter(timeRange);
    
    // Base query
    let query = { timestamp: { $gte: timeFilter } };
    
    // Add log type filter if specified
    if (logType && logType !== 'all') {
      query.logType = logType;
    }

    // Get aggregated counts directly from MongoDB
    const [levelCounts] = await Log.aggregate([
      { $match: query },
      { 
        $group: {
          _id: null,
          notice: {
            $sum: {
              $cond: [
                { $and: [
                  { $gte: [{ $toInt: "$rule.level" }, 1] },
                  { $lte: [{ $toInt: "$rule.level" }, 7] }
                ]},
                1,
                0
              ]
            }
          },
          warning: {
            $sum: {
              $cond: [
                { $and: [
                  { $gte: [{ $toInt: "$rule.level" }, 8] },
                  { $lte: [{ $toInt: "$rule.level" }, 11] }
                ]},
                1,
                0
              ]
            }
          },
          critical: {
            $sum: {
              $cond: [
                { $and: [
                  { $gte: [{ $toInt: "$rule.level" }, 12] },
                  { $lte: [{ $toInt: "$rule.level" }, 16] }
                ]},
                1,
                0
              ]
            }
          },
          total: { $sum: 1 }
        }
      }
    ]);

    // Handle case with no logs
    if (!levelCounts) {
      return res.json({
        notice: 0,
        warning: 0,
        critical: 0,
        total: 0
      });
    }

    res.json(levelCounts);
  } catch (error) {
    console.error('Error in /summary endpoint:', error);
    res.status(500).json({ message: error.message });
  }
});

// Complete implementation for /charts/:chartType endpoint
router.get('/charts/:chartType', auth, async (req, res) => {
  try {
    const { chartType } = req.params;
    const { timeRange, logType, protocol } = req.query;
    
    // Calculate time filter
    const timeFilter = getTimeFilter(timeRange);
    
    // Base query
    let query = { timestamp: { $gte: timeFilter } };
    
    // Add log type filter if specified
    if (logType && logType !== 'all') {
      query.logType = logType;
    }
    
    // Add protocol filter if specified and relevant
    if (protocol && protocol !== 'all' && ['protocolDistribution', 'networkConnections'].includes(chartType)) {
      query.protocol = protocol;
    }
    
    // Handle different chart types
    switch (chartType) {
      case 'logLevelsOverTime':
        return await getLogLevelsOverTime(query, res);
      
      case 'protocolDistribution':
        return await getProtocolDistribution(query, res);
      
      case 'topSourceIPs':
        return await getTopSourceIPs(query, res);
      
      case 'levelDistribution':
        return await getLevelDistribution(query, res);
      
      case 'networkConnections':
        return await getNetworkConnections(query, res);
      
      case 'ruleDescriptions':
        return await getRuleDescriptions(query, res);
      
      default:
        return res.status(400).json({ message: 'Invalid chart type' });
    }
  } catch (error) {
    console.error(`Error in /charts/${req.params.chartType} endpoint:`, error);
    res.status(500).json({ message: error.message });
  }
});

// Helper function to calculate time filter based on timeRange parameter
function getTimeFilter(timeRange) {
  const now = new Date();
  
  switch (timeRange) {
    case '1h':
      return new Date(now - 1 * 60 * 60 * 1000);
    case '3h':
      return new Date(now - 3 * 60 * 60 * 1000);
    case '12h':
      return new Date(now - 12 * 60 * 60 * 1000);
    case '7d':
      return new Date(now - 7 * 24 * 60 * 60 * 1000);
    case '24h':
    default:
      return new Date(now - 24 * 60 * 60 * 1000);
  }
}

// Implementation for each chart type handler
async function getLogLevelsOverTime(query, res) {
  // Get timestamp granularity based on time range
  const timeRange = query.timestamp.$gte;
  const now = new Date();
  const diffHours = Math.round((now - timeRange) / (1000 * 60 * 60));
  
  // Determine grouping interval (hourly, 3-hourly, daily)
  let interval;
  let format;
  
  if (diffHours <= 24) {
    interval = { $hour: "$timestamp" };
    format = "%H:00";
  } else if (diffHours <= 72) {
    interval = { 
      $concat: [
        { $toString: { $dayOfMonth: "$timestamp" } },
        "-",
        { $toString: { $hour: "$timestamp" } }
      ]
    };
    format = "%d-%H";
  } else {
    interval = { $dayOfMonth: "$timestamp" };
    format = "%m/%d";
  }
  
  const result = await Log.aggregate([
    { $match: query },
    {
      $project: {
        timeInterval: interval,
        level: { $toInt: "$rule.level" }
      }
    },
    {
      $group: {
        _id: "$timeInterval",
        notice: {
          $sum: {
            $cond: [
              { $and: [{ $gte: ["$level", 1] }, { $lte: ["$level", 7] }] },
              1,
              0
            ]
          }
        },
        warning: {
          $sum: {
            $cond: [
              { $and: [{ $gte: ["$level", 8] }, { $lte: ["$level", 11] }] },
              1,
              0
            ]
          }
        },
        critical: {
          $sum: {
            $cond: [
              { $and: [{ $gte: ["$level", 12] }, { $lte: ["$level", 16] }] },
              1,
              0
            ]
          }
        }
      }
    },
    { $sort: { _id: 1 } }
  ]);
  
  // Format the data for the chart
  const timeLabels = result.map(item => item._id);
  const notice = result.map(item => item.notice);
  const warning = result.map(item => item.warning);
  const critical = result.map(item => item.critical);
  
  return res.json({
    timeLabels,
    notice,
    warning,
    critical
  });
}

async function getProtocolDistribution(query, res) {
  const result = await Log.aggregate([
    { $match: query },
    {
      $group: {
        _id: "$protocol",
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 10 },
    {
      $project: {
        _id: 0,
        name: { $ifNull: ["$_id", "Unknown"] },
        value: "$count"
      }
    }
  ]);
  
  // Handle empty results
  if (result.length === 0) {
    return res.json([{ name: "No Data", value: 1 }]);
  }
  
  return res.json(result);
}

async function getTopSourceIPs(query, res) {
  const result = await Log.aggregate([
    { $match: query },
    {
      $group: {
        _id: "$sourceIP",
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 10 },
    {
      $project: {
        _id: 0,
        name: { $ifNull: ["$_id", "Unknown"] },
        value: "$count"
      }
    }
  ]);
  
  // Handle empty results
  if (result.length === 0) {
    return res.json([{ name: "No Data", value: 0 }]);
  }
  
  return res.json(result);
}

async function getLevelDistribution(query, res) {
  const result = await Log.aggregate([
    { $match: query },
    {
      $group: {
        _id: "$rule.level",
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        name: { $toString: "$_id" },
        value: "$count"
      }
    }
  ]);
  
  // Handle empty results
  if (result.length === 0) {
    return res.json([{ name: "No Data", value: 0 }]);
  }
  
  return res.json(result);
}

async function getNetworkConnections(query, res) {
  // Get top source and destination IPs
  const topSources = await Log.aggregate([
    { $match: query },
    { $group: { _id: "$sourceIP", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);
  
  const topDestinations = await Log.aggregate([
    { $match: query },
    { $group: { _id: "$destinationIP", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);
  
  // Get connections between them
  const topIPs = [...topSources.map(s => s._id), ...topDestinations.map(d => d._id)].filter(Boolean);
  
  const connections = await Log.aggregate([
    { 
      $match: { 
        ...query,
        sourceIP: { $in: topIPs },
        destinationIP: { $in: topIPs }
      } 
    },
    {
      $group: {
        _id: { source: "$sourceIP", target: "$destinationIP" },
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);
  
  // Format nodes and links for force graph
  const nodes = [
    ...topSources.map(s => ({ 
      name: s._id || "Unknown", 
      value: s.count,
      category: "Source"
    })),
    ...topDestinations.map(d => ({ 
      name: d._id || "Unknown", 
      value: d.count,
      category: "Target"
    }))
  ];
  
  // Remove duplicates from nodes
  const uniqueNodes = Array.from(new Map(nodes.map(node => [node.name, node])).values());
  
  const links = connections.map(conn => ({
    source: conn._id.source || "Unknown",
    target: conn._id.target || "Unknown",
    value: conn.count
  }));
  
  return res.json({
    nodes: uniqueNodes,
    links
  });
}

async function getRuleDescriptions(query, res) {
  const result = await Log.aggregate([
    { $match: query },
    {
      $group: {
        _id: "$rule.description",
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 15 },
    {
      $project: {
        _id: 0,
        name: { $ifNull: ["$_id", "Unknown Rule"] },
        value: "$count"
      }
    }
  ]);
  
  // Handle empty results
  if (result.length === 0) {
    return res.json([{ name: "No Rules Found", value: 1 }]);
  }
  
  return res.json(result);
}

module.exports = router;

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

router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 1000, 
      search = '',
      logType = 'all'  // New parameter for log type filtering
    } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build query with log type filtering
    let searchQuery = {};
    
    // Apply log type filter
    if (logType === 'fortigate') {
      searchQuery['rawLog.message'] = { $regex: 'FortiGate log received.', $options: 'i' };
    } else if (logType === 'other') {
      searchQuery['rawLog.message'] = { $not: { $regex: 'FortiGate log received.', $options: 'i' } };
    }
    
    // Apply search term filter
    if (search) {
      const searchConditions = [
        { 'agent.name': { $regex: search, $options: 'i' } },
        { 'rule.level': search },  // Exact match for rule level
        { 'rule.description': { $regex: search, $options: 'i' } },
        { 'network.srcIp': { $regex: search, $options: 'i' } },
        { 'network.destIp': { $regex: search, $options: 'i' } },
        { 'rawLog.message': { $regex: search, $options: 'i' } }
      ];
      
      // If we already have a log type filter, use $and to combine both filters
      if (Object.keys(searchQuery).length > 0) {
        searchQuery = {
          $and: [
            searchQuery,
            { $or: searchConditions }
          ]
        };
      } else {
        searchQuery.$or = searchConditions;
      }
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