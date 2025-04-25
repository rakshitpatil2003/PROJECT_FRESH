// backend/routes/Logs.js
const express = require('express');
const router = express.Router();
const auth = require('../routes/auth');
const {
  getModelsForTimeRange,
  queryMultipleCollections,
  aggregateMultipleCollections,
  LogCurrent,
  LogRecent,
  LogArchive
} = require('./LogsHelper');


//const { LogCurrent, LogRecent, LogArchive } = require('../models/Log');
// Updated Redis client implementation for your Logs.js

const { createClient } = require('redis');
const util = require('util');

let redisClient;
let getAsync;
let setAsync;

// Initialize Redis client with better error handling
const initRedisClient = async () => {
  try {
    // Create Redis client
    redisClient = createClient({
      url: 'redis://192.168.1.165:6379',
      password: 'yourpassword',
      socket: {
        reconnectStrategy: (retries) => {
          console.log(`Redis reconnect attempt: ${retries}`);
          return Math.min(retries * 100, 3000);
        }
      }
    });

    // Set up event handlers
    redisClient.on('error', (err) => {
      console.error('Redis client error:', err);
    });

    redisClient.on('connect', () => {
      console.log('Redis client connected');
    });

    redisClient.on('ready', () => {
      console.log('Redis client ready');
    });

    redisClient.on('reconnecting', () => {
      console.log('Redis client reconnecting');
    });

    redisClient.on('end', () => {
      console.log('Redis client connection closed');
    });

    // Connect to Redis
    await redisClient.connect();

    // Get and Set methods
    getAsync = redisClient.get.bind(redisClient);
    setAsync = redisClient.set.bind(redisClient);

    return true;
  } catch (error) {
    console.error('Failed to initialize Redis:', error);
    return false;
  }
};

// Initialize Redis when the module loads
let redisEnabled = false;
initRedisClient()
  .then(success => {
    redisEnabled = success;
    console.log(`Redis caching ${redisEnabled ? 'enabled' : 'disabled'}`);
  })
  .catch(err => {
    console.error('Error initializing Redis:', err);
    redisEnabled = false;
  });

// Memory-based cache fallback
const memoryCache = {};

// Modified withCache function with fallback
const withCache = async (key, ttl, fetchFn) => {
  // If Redis isn't connected, use in-memory cache as fallback
  if (!redisEnabled || !redisClient || !redisClient.isOpen) {
    console.log('Redis not available, using memory cache for:', key);
    
    // Check if we have a valid memory cache entry
    if (memoryCache[key] && memoryCache[key].expiry > Date.now()) {
      console.log(`Memory cache hit for: ${key}`);
      return memoryCache[key].data;
    }

    // Fetch fresh data
    console.log(`Memory cache miss for: ${key}`);
    const data = await fetchFn();
    
    // Store in memory cache with expiry
    memoryCache[key] = {
      data,
      expiry: Date.now() + (ttl * 1000)
    };
    
    return data;
  }

  try {
    // Try to get from Redis cache
    const cachedData = await getAsync(key);
    if (cachedData) {
      console.log(`Redis cache hit for: ${key}`);
      return JSON.parse(cachedData);
    }
    
    console.log(`Redis cache miss for: ${key}`);
    // If not in cache, fetch and store
    const data = await fetchFn();
    await setAsync(key, JSON.stringify(data), { EX: ttl });
    return data;
  } catch (error) {
    console.error(`Redis cache error for key ${key}:`, error);
    // Fallback to memory cache on Redis error
    return withCache(key, ttl, fetchFn);
  }
};

const getDateRangeForQuery = (timeRange = '7d') => {
  const now = new Date();
  let startDate;

  switch (timeRange) {
    case '12h':
      startDate = new Date(now - 12 * 60 * 60 * 1000);
      break;
    case '24h':
      startDate = new Date(now - 24 * 60 * 60 * 1000);
      break;
    case '3d':
      startDate = new Date(now - 3 * 24 * 60 * 60 * 1000);
      break;
    case '7d':
      startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now - 7 * 24 * 60 * 60 * 1000); // Default to 7 days
  }

  return { startDate, endDate: now };
};
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

function getNestedValue(obj, path) {
  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return null;
    }
    current = current[part];
  }

  return current;
}

async function queryTimeBasedCollections(query, options = {}) {
  const {
    timeRange,
    page = 1,
    limit = 1000,
    sort = { timestamp: -1 },
    projection = null
  } = options;

  // Get the appropriate models based on time range
  const { models, startDate } = getModelsForTimeRange(timeRange);

  // Add timestamp criteria to the query if not already present
  const dateQuery = { ...query };
  if (!dateQuery.timestamp) {
    dateQuery.timestamp = { $gte: startDate };
  } else if (typeof dateQuery.timestamp === 'object' && !dateQuery.timestamp.$gte) {
    dateQuery.timestamp.$gte = startDate;
  }

  // Calculate pagination
  const skip = (page - 1) * limit;

  // Execute query with count across all relevant collections
  const [countResults, dataResults] = await Promise.all([
    // Get total count across all collections
    Promise.all(models.map(model => model.countDocuments(dateQuery))),

    // Get paginated data from collections
    (async () => {
      let results = [];
      let remaining = limit;

      for (const model of models) {
        if (remaining <= 0) break;

        const modelResults = await model
          .find(dateQuery, projection)
          .sort(sort)
          .skip(results.length === 0 ? skip : 0)
          .limit(remaining)
          .lean();

        results = results.concat(modelResults);
        remaining = limit - results.length;
      }

      return results;
    })()
  ]);

  // Sum up counts from all collections
  const totalCount = countResults.reduce((sum, count) => sum + count, 0);

  return {
    data: dataResults,
    pagination: {
      total: totalCount,
      page,
      pages: Math.ceil(totalCount / limit)
    }
  };
}

// Metrics endpoint with Redis caching and fallback
// Metrics endpoint
router.get('/metrics', auth, async (req, res) => {
  try {
    // Get counts from all three collections in parallel
    const [currentMetrics, recentMetrics, archiveMetrics] = await Promise.all([
      getCollectionMetrics(LogCurrent),
      getCollectionMetrics(LogRecent),
      getCollectionMetrics(LogArchive)
    ]);
    
    // Combine the metrics
    const totalLogs = currentMetrics.totalLogs + recentMetrics.totalLogs + archiveMetrics.totalLogs;
    const majorLogs = currentMetrics.majorLogs + recentMetrics.majorLogs + archiveMetrics.majorLogs;
    const normalLogs = currentMetrics.normalLogs + recentMetrics.normalLogs + archiveMetrics.normalLogs;
    
    res.json({
      totalLogs,
      majorLogs,
      normalLogs
    });
  } catch (error) {
    console.error('Error getting metrics:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper function to get metrics from a single collection
async function getCollectionMetrics(model) {
  try {
    const totalLogs = await model.countDocuments();
    
    // Count logs with rule level >= 12 (major/critical logs)
    // Using $expr and $convert to handle cases where rule.level might be stored as a string
    const majorLogs = await model.countDocuments({
      $expr: {
        $gte: [
          { $convert: { input: "$rule.level", to: "int", onError: 0, onNull: 0 } },
          12
        ]
      }
    });
    
    // All other logs are normal
    const normalLogs = totalLogs - majorLogs;
    
    return {
      totalLogs,
      majorLogs,
      normalLogs
    };
  } catch (error) {
    console.error(`Error getting metrics from ${model.collection.name}:`, error);
    return {
      totalLogs: 0,
      majorLogs: 0,
      normalLogs: 0
    };
  }
}

// Recent logs endpoint
router.get('/recent', async (req, res) => {
  try {
    console.log('Fetching recent logs...');
    const cacheKey = 'recent_logs';
    const cacheTime = 30; // Cache for 30 seconds
    
    const recentLogs = await withCache(cacheKey, cacheTime, async () => {
      const logs = await LogCurrent.find({}, {
        timestamp: 1,
        'agent.name': 1,
        'rule.level': 1,
        'rule.description': 1,
        rawLog: 1
      })
        .sort({ timestamp: -1 })
        .limit(10)
        .lean();
        
      console.log('Recent logs count:', logs.length);
      return logs;
    });
    
    res.json(recentLogs);
  } catch (error) {
    console.error('Error fetching recent logs:', error);
    res.status(500).json({ message: 'Error fetching recent logs', error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 100,
      search = '',
      logType = 'all',
      ruleLevel = 'all',
      startDate,
      endDate,
      cursor
    } = req.query;

    // Determine which time range to use
    let timeFilter = {};
    let models = [LogCurrent]; // Default to current logs

    // Create time range filter if provided
    if (startDate || endDate) {
      timeFilter = {};
      if (startDate) timeFilter.$gte = new Date(startDate);
      if (endDate) timeFilter.$lte = new Date(endDate);
      
      // Determine appropriate models based on date range
      if (startDate) {
        const startDateObj = new Date(startDate);
        const now = new Date();
        const daysDiff = Math.floor((now - startDateObj) / (1000 * 60 * 60 * 24));
        
        if (daysDiff >= 21) {
          models = [LogCurrent, LogRecent, LogArchive];
        } else if (daysDiff >= 7) {
          models = [LogCurrent, LogRecent];
        }
      }
    } else {
      // Default to last 7 days if no date range
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      timeFilter = { $gte: sevenDaysAgo };
    }

    // Build query with log type filtering
    let searchQuery = { timestamp: timeFilter };

    // Apply rule level filter
    if (ruleLevel !== 'all') {
      if (ruleLevel === 'major') {
        searchQuery['rule.level'] = { $gte: '12' };
      } else if (!isNaN(parseInt(ruleLevel))) {
        searchQuery['rule.level'] = ruleLevel;
      }
    }

    // Apply log type filter
    if (logType === 'firewall') {
      searchQuery['rawLog.message'] = { $regex: 'Firewall', $options: 'i' };
    } else if (logType === 'other') {
      searchQuery['rawLog.message'] = { $not: { $regex: 'Firewall', $options: 'i' } };
    }

    // Apply cursor-based pagination if cursor is provided
    if (cursor) {
      try {
        const decodedCursor = JSON.parse(Buffer.from(cursor, 'base64').toString());
        searchQuery._id = { $lt: decodedCursor._id };
      } catch (error) {
        console.error('Invalid cursor:', error);
      }
    }

    // Apply search term filter
    if (search) {
      const searchConditions = [
        { 'agent.name': { $regex: search, $options: 'i' } },
        { 'rule.level': search }, // Exact match for rule level
        { 'rule.description': { $regex: search, $options: 'i' } },
        { 'network.srcIp': { $regex: search, $options: 'i' } },
        { 'network.destIp': { $regex: search, $options: 'i' } },
        { 'rawLog.message': { $regex: search, $options: 'i' } }
      ];

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

    // Query multiple collections as needed
    const { data: logs, total: totalRows } = await queryMultipleCollections(searchQuery, {
      models,
      limit: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit),
      sort: { timestamp: -1 }
    });

    // Add cursor for next page if data exists
    let nextCursor = null;
    if (logs.length === parseInt(limit)) {
      const lastItem = logs[logs.length - 1];
      nextCursor = Buffer.from(JSON.stringify({ _id: lastItem._id })).toString('base64');
    }

    res.json({
      logs,
      pagination: {
        total: totalRows,
        page: parseInt(page),
        pages: Math.ceil(totalRows / parseInt(limit)),
        nextCursor
      }
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ message: 'Error fetching logs', error: error.message });
  }
});

// In your Logs.js router file




router.get('/summary', auth, async (req, res) => {
  try {
    const { timeRange, logType } = req.query;

    // Get appropriate models and time filter
    const { models, startDate } = getModelsForTimeRange(timeRange);
    
    // Base query with time filter
    let query = { timestamp: { $gte: startDate } };

    // Add log type filter if specified
    if (logType && logType !== 'all') {
      query.logType = logType;
    }

    // Run aggregate on each model and combine results
    const results = await Promise.all(models.map(model => 
      model.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            notice: {
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
            warning: {
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
            critical: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gte: [{ $toInt: "$rule.level" }, 12] },
                      { $lte: [{ $toInt: "$rule.level" }, 16] }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            total: { $sum: 1 }
          }
        }
      ])
    ));

    // Combine results from all models
    const combinedResult = results.reduce((acc, modelResults) => {
      if (modelResults && modelResults.length > 0) {
        const result = modelResults[0];
        acc.notice += result.notice || 0;
        acc.warning += result.warning || 0;
        acc.critical += result.critical || 0;
        acc.total += result.total || 0;
      }
      return acc;
    }, { notice: 0, warning: 0, critical: 0, total: 0 });

    res.json(combinedResult);
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

    // Get appropriate models and time filter
    const { models, startDate } = getModelsForTimeRange(timeRange);
    
    // Base query with time filter
    let query = { timestamp: { $gte: startDate } };

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
        return await getLogLevelsOverTime(models, query, res);

      case 'protocolDistribution':
        return await getProtocolDistribution(models, query, res);

      case 'topSourceIPs':
        return await getTopSourceIPs(models, query, res);

      case 'levelDistribution':
        return await getLevelDistribution(models, query, res);

      case 'networkConnections':
        return await getNetworkConnections(models, query, res);

      case 'ruleDescriptions':
        return await getRuleDescriptions(models, query, res);

      default:
        return res.status(400).json({ message: 'Invalid chart type' });
    }
  } catch (error) {
    console.error(`Error in /charts/${req.params.chartType} endpoint:`, error);
    res.status(500).json({ message: error.message });
  }
});

router.get('/debug/structure', auth, async (req, res) => {
  try {
    const sampleLog = await LogCurrent.findOne().lean();

    if (!sampleLog) {
      return res.json({ message: "No logs found in database" });
    }

    // Extract the structure of the document
    const structure = {
      hasSourceIP: !!sampleLog.sourceIP,
      hasSourceObject: !!sampleLog.source && !!sampleLog.source.ip,
      hasFieldsSrcIP: !!sampleLog.fields && !!sampleLog.fields.src_ip,
      hasSrcIP: !!sampleLog.src_ip,
      hasNetworkSrcIP: !!sampleLog.network && !!sampleLog.network.srcIp,

      hasDestinationIP: !!sampleLog.destinationIP,
      hasDestinationObject: !!sampleLog.destination && !!sampleLog.destination.ip,
      hasFieldsDstIP: !!sampleLog.fields && !!sampleLog.fields.dst_ip,
      hasDstIP: !!sampleLog.dst_ip,
      hasNetworkDestIP: !!sampleLog.network && !!sampleLog.network.destIp,

      hasProtocol: !!sampleLog.protocol,
      hasDataProtocol: !!sampleLog.data && !!sampleLog.data.protocol,
      hasFieldsProtocol: !!sampleLog.fields && !!sampleLog.fields.protocol,
      hasNetworkProtocol: !!sampleLog.network && !!sampleLog.network.protocol,

      documentKeys: Object.keys(sampleLog)
    };

    return res.json({
      message: "Document structure analysis",
      structure,
      sample: sampleLog
    });
  } catch (error) {
    console.error("Error analyzing document structure:", error);
    return res.status(500).json({
      message: "Error analyzing document structure",
      error: error.message
    });
  }
});



// Implementation for each chart type handler
async function getLogLevelsOverTime(models, query, res) {
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

  // Pipeline for the aggregation
  const pipeline = [
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
  ];

  // Run aggregation across all relevant collections
  const results = await aggregateMultipleCollections(pipeline, { models });

  // Combine results into intervals
  const intervalData = {};
  
  results.forEach(result => {
    const interval = result._id;
    if (!intervalData[interval]) {
      intervalData[interval] = { notice: 0, warning: 0, critical: 0 };
    }
    intervalData[interval].notice += result.notice || 0;
    intervalData[interval].warning += result.warning || 0;
    intervalData[interval].critical += result.critical || 0;
  });

  // Convert to arrays for the chart
  const sortedIntervals = Object.keys(intervalData).sort();
  const timeLabels = sortedIntervals;
  const notice = sortedIntervals.map(interval => intervalData[interval].notice);
  const warning = sortedIntervals.map(interval => intervalData[interval].warning);
  const critical = sortedIntervals.map(interval => intervalData[interval].critical);

  return res.json({
    timeLabels,
    notice,
    warning,
    critical
  });
}

async function getProtocolDistribution(models, query, res) {
  try {
    const pipeline = [
      { $match: query },
      {
        $project: {
          protocol: {
            $cond: [
              { $ne: ["$network.protocol", null] },
              "$network.protocol",
              {
                $cond: [
                  { $ne: ["$protocol", null] },
                  "$protocol",
                  {
                    $cond: [
                      { $ne: ["$rawData.data.proto", null] },
                      "$rawData.data.proto",
                      {
                        $cond: [
                          { $ne: ["$data.protocol", null] },
                          "$data.protocol",
                          {
                            $cond: [
                              { $ne: ["$fields.protocol", null] },
                              "$fields.protocol",
                              "Unknown"
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        }
      },
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
          name: {
            $cond: [
              { $eq: ["$_id", null] },
              "Unknown",
              { $cond: [{ $eq: ["$_id", ""] }, "None", "$_id"] }
            ]
          },
          value: "$count"
        }
      }
    ];

    // Run aggregation across collections
    const results = await aggregateMultipleCollections(pipeline, { models });

    // Combine and sort results
    const protocolCounts = {};
    results.forEach(result => {
      const protocol = result.name;
      if (!protocolCounts[protocol]) protocolCounts[protocol] = 0;
      protocolCounts[protocol] += result.value;
    });

    const finalResults = Object.entries(protocolCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    if (finalResults.length === 0) {
      return res.json([{ name: "No Protocol Data", value: 1 }]);
    }

    return res.json(finalResults);
  } catch (error) {
    console.error("Error in protocol distribution:", error);
    return res.status(500).json({ message: "Error fetching protocol distribution", error: error.message });
  }
}

async function getTopSourceIPs(models, query, res) {
  try {
    const pipeline = [
      { $match: query },
      {
        $project: {
          sourceIP: {
            $cond: [
              { $ne: ["$network.srcIp", null] },
              "$network.srcIp",
              {
                $cond: [
                  { $ne: ["$sourceIP", null] },
                  "$sourceIP",
                  {
                    $cond: [
                      { $ne: ["$source.ip", null] },
                      "$source.ip",
                      {
                        $cond: [
                          { $ne: ["$rawData.data.src_ip", null] },
                          "$rawData.data.src_ip",
                          {
                            $cond: [
                              { $ne: ["$fields.src_ip", null] },
                              "$fields.src_ip",
                              "Unknown"
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        }
      },
      {
        $group: {
          _id: "$sourceIP",
          count: { $sum: 1 }
        }
      },
      { $match: { _id: { $ne: "Unknown", $ne: "N/A" } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          name: "$_id",
          value: "$count"
        }
      }
    ];

    // Run aggregation across collections
    const results = await aggregateMultipleCollections(pipeline, { models });

    // Combine and sort results
    const ipCounts = {};
    results.forEach(result => {
      const ip = result.name;
      if (!ipCounts[ip]) ipCounts[ip] = 0;
      ipCounts[ip] += result.value;
    });

    const finalResults = Object.entries(ipCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    if (finalResults.length === 0) {
      return res.json([{ name: "No Source IP Data", value: 1 }]);
    }

    return res.json(finalResults);
  } catch (error) {
    console.error("Error in top source IPs:", error);
    return res.status(500).json({ message: "Error fetching top source IPs", error: error.message });
  }
}

async function getLevelDistribution(models, query, res) {
  const pipeline = [
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
  ];

  // Run aggregation across collections
  const results = await aggregateMultipleCollections(pipeline, { models });

  // Combine results for the same level
  const levelCounts = {};
  results.forEach(result => {
    const level = result.name;
    if (!levelCounts[level]) levelCounts[level] = 0;
    levelCounts[level] += result.value;
  });

  const finalResults = Object.entries(levelCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => parseInt(a.name) - parseInt(b.name));

  // Handle empty results
  if (finalResults.length === 0) {
    return res.json([{ name: "No Data", value: 0 }]);
  }

  return res.json(finalResults);
}

async function getNetworkConnections(models, query, res) {
  try {
    // Define all possible field paths
    const sourceIPPaths = ["network.srcIp", "sourceIP", "source.ip", "fields.src_ip", "rawData.data.src_ip"];
    const destIPPaths = ["network.destIp", "destinationIP", "destination.ip", "fields.dst_ip", "rawData.data.dest_ip"];

    // Get sample documents to check field paths (from first model only for efficiency)
    const sampleDocs = await models[0].find(query).limit(10).lean();

    // Determine which fields actually exist in the documents
    let sourceIPField = null;
    let destinationIPField = null;

    for (const doc of sampleDocs) {
      // Check source IP fields
      for (const path of sourceIPPaths) {
        const value = getNestedValue(doc, path);
        if (value) {
          sourceIPField = path;
          break;
        }
      }

      // Check destination IP fields
      for (const path of destIPPaths) {
        const value = getNestedValue(doc, path);
        if (value) {
          destinationIPField = path;
          break;
        }
      }

      if (sourceIPField && destinationIPField) break;
    }

    // Default to the first option if no field was found
    sourceIPField = sourceIPField || sourceIPPaths[0];
    destinationIPField = destinationIPField || destIPPaths[0];

    console.log(`Using source IP field: ${sourceIPField}, destination IP field: ${destinationIPField}`);

    // Pipeline for top sources 
    const sourcePipeline = [
      { $match: query },
      { 
        $project: {
          source: { $ifNull: [`$${sourceIPField}`, "Unknown"] }
        }
      },
      { 
        $group: { 
          _id: "$source", 
          count: { $sum: 1 } 
        } 
      },
      { $match: { _id: { $ne: null, $ne: "" } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ];

    // Pipeline for top destinations
    const destPipeline = [
      { $match: query },
      { 
        $project: {
          destination: { $ifNull: [`$${destinationIPField}`, "Unknown"] }
        }
      },
      { 
        $group: { 
          _id: "$destination", 
          count: { $sum: 1 } 
        } 
      },
      { $match: { _id: { $ne: null, $ne: "" } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ];

    // Execute pipelines across all models
    const [topSourcesResults, topDestsResults] = await Promise.all([
      aggregateMultipleCollections(sourcePipeline, { models }),
      aggregateMultipleCollections(destPipeline, { models })
    ]);

    // Combine and aggregate top sources
    const sourceCounts = {};
    topSourcesResults.forEach(result => {
      const source = result._id || "Unknown";
      if (!sourceCounts[source]) sourceCounts[source] = 0;
      sourceCounts[source] += result.count;
    });

    const topSources = Object.entries(sourceCounts)
      .map(([source, count]) => ({ _id: source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Combine and aggregate top destinations
    const destCounts = {};
    topDestsResults.forEach(result => {
      const dest = result._id || "Unknown";
      if (!destCounts[dest]) destCounts[dest] = 0;
      destCounts[dest] += result.count;
    });

    const topDestinations = Object.entries(destCounts)
      .map(([dest, count]) => ({ _id: dest, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Extract source and destination IPs for connection query
    const sourceIDs = topSources.map(s => s._id).filter(Boolean);
    const destIDs = topDestinations.map(d => d._id).filter(Boolean);

    // Pipeline for source-destination connections
    let connectionsMatchQuery = { ...query };

    // Only add path conditions if we have data
    if (sourceIDs.length > 0) {
      connectionsMatchQuery[sourceIPField] = { $in: sourceIDs };
    }

    if (destIDs.length > 0) {
      connectionsMatchQuery[destinationIPField] = { $in: destIDs };
    }

    const connectionsPipeline = [
      { $match: connectionsMatchQuery },
      { 
        $project: {
          source: { $ifNull: [`$${sourceIPField}`, "Unknown"] },
          target: { $ifNull: [`$${destinationIPField}`, "Unknown"] }
        }
      },
      {
        $group: {
          _id: { source: "$source", target: "$target" },
          count: { $sum: 1 }
        }
      },
      { $match: { "_id.source": { $ne: null }, "_id.target": { $ne: null } } },
      { $sort: { count: -1 } },
      { $limit: 50 }
    ];

    // Execute connections pipeline
    const connectionsResults = await aggregateMultipleCollections(connectionsPipeline, { models });

    // Process connections
    const connectionCounts = {};
    connectionsResults.forEach(result => {
      const key = `${result._id.source}-${result._id.target}`;
      if (!connectionCounts[key]) {
        connectionCounts[key] = {
          source: result._id.source,
          target: result._id.target,
          count: 0
        };
      }
      connectionCounts[key].count += result.count;
    });

    const connections = Object.values(connectionCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 50);

    // Create node map
    const nodeMap = new Map();

    // Add source nodes
    topSources.forEach(source => {
      if (source._id) {
        nodeMap.set(source._id, {
          name: source._id,
          value: source.count,
          category: "Source"
        });
      }
    });

    // Add destination nodes
    topDestinations.forEach(dest => {
      if (dest._id) {
        if (nodeMap.has(dest._id)) {
          const existingNode = nodeMap.get(dest._id);
          existingNode.value += dest.count;
          existingNode.category = "Both";
        } else {
          nodeMap.set(dest._id, {
            name: dest._id,
            value: dest.count,
            category: "Target"
          });
        }
      }
    });

    const nodes = Array.from(nodeMap.values());

    // Create links
    const links = connections
      .filter(conn => conn.source && conn.target)
      .map(conn => ({
        source: conn.source,
        target: conn.target,
        value: conn.count
      }));

    // Handle empty results
    if (nodes.length === 0) {
      return res.json({
        nodes: [
          { name: "No Source Data", value: 1, category: "Source" },
          { name: "No Target Data", value: 1, category: "Target" }
        ],
        links: [
          { source: "No Source Data", target: "No Target Data", value: 1 }
        ]
      });
    }

    // Return the network graph data
    return res.json({
      nodes,
      links: links.length > 0 ? links : [
        {
          source: nodes[0].name,
          target: nodes.length > 1 ? nodes[1].name : nodes[0].name,
          value: 1
        }
      ]
    });
  } catch (error) {
    console.error("Error in network connections:", error);
    return res.status(500).json({
      message: "Error generating network connections graph",
      error: error.message,
      nodes: [{ name: "Error", value: 1, category: "Error" }],
      links: []
    });
  }
}

async function getRuleDescriptions(models, query, res) {
  const pipeline = [
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
  ];

  // Run aggregation across collections
  const results = await aggregateMultipleCollections(pipeline, { models });

  // Combine results
  const ruleCounts = {};
  results.forEach(result => {
    const rule = result.name;
    if (!ruleCounts[rule]) ruleCounts[rule] = 0;
    ruleCounts[rule] += result.value;
  });

  const finalResults = Object.entries(ruleCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 15);

  // Handle empty results
  if (finalResults.length === 0) {
    return res.json([{ name: "No Rules Found", value: 1 }]);
  }

  return res.json(finalResults);
}


// Major logs endpoint
// Update the route handler in Logs.js
// In your backend/routes/Logs.js file, update the /major endpoint
// In your backend/routes/Logs.js file
// Major logs endpoint with time range support
router.get('/major', async (req, res) => {
  try {
    const { search = '', timeRange = '7d' } = req.query;
    console.log(`Fetching major logs with search: "${search}" and time range: ${timeRange}`);

    // Create a cache key that includes both search and time range parameters
    const cacheKey = `major_logs_${search}_${timeRange}`;
    const cacheTime = 60; // Cache for 60 seconds

    const majorLogs = await withCache(cacheKey, cacheTime, async () => {
      // Get date range based on time range parameter
      const { startDate } = getDateRangeForQuery(timeRange);

      // Build the base query for major logs with time range
      const query = {
        $expr: {
          $gte: [
            { $convert: { input: "$rule.level", to: "int", onError: 0, onNull: 0 } },
            12
          ]
        },
        timestamp: { $gte: startDate }
      };

      // Add search criteria if provided
      if (search) {
        query.$and = [{
          $or: [
            { 'agent.name': { $regex: search, $options: 'i' } },
            { 'rule.description': { $regex: search, $options: 'i' } },
            { 'network.srcIp': { $regex: search, $options: 'i' } },
            { 'network.destIp': { $regex: search, $options: 'i' } }
          ]
        }];
      }

      // Determine which collections to query based on time range
      const { models } = getModelsForTimeRange(timeRange);

      // Query all relevant collections
      const queryPromises = models.map(model => 
        model.find(query).sort({ timestamp: -1 }).lean()
      );
      
      const collectionsData = await Promise.all(queryPromises);

      // Combine and sort results
      const combinedLogs = collectionsData
        .flat()
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      console.log(`Found ${combinedLogs.length} major logs across collections for time range: ${timeRange}`);

      // Add explicit validation that these are actually major logs
      const validatedLogs = combinedLogs.filter(log => {
        const level = parseInt(log.rule?.level);
        return !isNaN(level) && level >= 12;
      });

      console.log(`Validated ${validatedLogs.length} logs with level >= 12`);

      return validatedLogs;
    });

    res.json(majorLogs);
  } catch (error) {
    console.error('Error fetching major logs:', error);
    res.status(500).json({
      message: 'Error fetching major logs',
      error: error.message
    });
  }
});

// Session endpoint with time range support
// Backend route for session logs (update this in your routes/Logs.js file)
router.get('/session', async (req, res) => {
  try {
    const { search = '', timeRange = '24h' } = req.query;
    console.log(`Fetching session logs with search: "${search}" and time range: ${timeRange}`);

    // Create a cache key that includes both search and time range parameters
    const cacheKey = `session_logs_${search}_${timeRange}`;
    const cacheTime = 60; // Cache for 60 seconds

    const sessionLogs = await withCache(cacheKey, cacheTime, async () => {
      // Get date range based on time range parameter
      const { startDate } = getDateRangeForQuery(timeRange);

      // Build search query for all compliance standards
      let query = {
        $or: [
          // Check for compliance standards in rawLog message
          { "rawLog.message": { $regex: /hipaa|gdpr|pci_dss|nist_800_53/i } },
          // Check for compliance arrays in rule
          { "rule.hipaa": { $exists: true, $ne: [] } },
          { "rule.gdpr": { $exists: true, $ne: [] } },
          { "rule.pci_dss": { $exists: true, $ne: [] } },
          { "rule.nist_800_53": { $exists: true, $ne: [] } }
        ],
        // Add time range filter
        timestamp: { $gte: startDate }
      };

      // Add search criteria if provided
      if (search) {
        query.$and = [{ 
          $or: [
            { 'agent.name': { $regex: search, $options: 'i' } },
            { 'rule.description': { $regex: search, $options: 'i' } },
            { 'rawLog.message': { $regex: search, $options: 'i' } }
          ]
        }];
      }

      // Determine which collections to query based on time range
      const { models } = getModelsForTimeRange(timeRange);

      // Query all relevant collections in parallel
      const queryPromises = models.map(model => 
        model.find(query).sort({ timestamp: -1 }).lean()
      );
      
      const collectionsData = await Promise.all(queryPromises);
      
      // Combine and sort results
      const combinedLogs = collectionsData
        .flat()
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      console.log(`Found ${combinedLogs.length} compliance logs across collections for time range: ${timeRange}`);
      
      return combinedLogs;
    });

    res.json(sessionLogs);
  } catch (error) {
    console.error('Error fetching session logs:', error);
    res.status(500).json({
      message: 'Error fetching session logs',
      error: error.message
    });
  }
});

// FIM endpoint
router.get('/fim', async (req, res) => {
  try {
    const { search = '', page = 1, limit = 10, event = '', path = '', startTime = '' } = req.query;

    // Base query: find logs that are syscheck-related
    let searchQuery = {
      $or: [
        { "rawLog.message": { $regex: /syscheck/i } },
        { "rawLog.message.location": { $regex: /syscheck/i } }
      ]
    };

    // Add any additional filters
    if (search) {
      searchQuery.$and = [
        searchQuery,
        {
          $or: [
            { 'agent.name': { $regex: search, $options: 'i' } },
            { 'rule.description': { $regex: search, $options: 'i' } },
            { 'syscheck.path': { $regex: search, $options: 'i' } },
            { 'rawLog.syscheck.path': { $regex: search, $options: 'i' } }
          ]
        }
      ];
    }

    // Filter by event type (added, modified, deleted)
    if (event) {
      searchQuery.$and = searchQuery.$and || [];
      searchQuery.$and.push({
        $or: [
          { "syscheck.event": { $regex: event, $options: 'i' } },
          { "rawLog.syscheck.event": { $regex: event, $options: 'i' } }
        ]
      });
    }

    // Filter by file path
    if (path) {
      searchQuery.$and = searchQuery.$and || [];
      searchQuery.$and.push({
        $or: [
          { 'syscheck.path': { $regex: path, $options: 'i' } },
          { 'rawLog.syscheck.path': { $regex: path, $options: 'i' } }
        ]
      });
    }

    // Filter by start time
    if (startTime) {
      searchQuery.timestamp = { $gte: new Date(startTime) };
    }

    // Choose models based on time filter
    const models = startTime ? 
      getModelsForTimeRange(startTime).models :
      [LogCurrent, LogRecent]; // Look in both current and recent by default for FIM
    
    // Query across multiple collections
    const { data: fimLogs, total: totalLogs } = await queryMultipleCollections(searchQuery, {
      models,
      sort: { timestamp: -1 },
      skip: (page - 1) * limit,
      limit: Number(limit)
    });

    console.log(`Found ${fimLogs.length} FIM-related logs`);

    res.json({
      logs: fimLogs,
      totalLogs,
      page: Number(page),
      totalPages: Math.ceil(totalLogs / limit)
    });
  } catch (error) {
    console.error('Error in /fim endpoint:', error);
    res.status(500).json({
      message: 'Error fetching FIM logs',
      error: error.message
    });
  }
});

// Malware Logs endpoint
router.get('/malware', async (req, res) => {
  try {
    const { page = 0, pageSize = 10, filters = 'virustotal,yara,rootcheck' } = req.query;
    
    // Parse the filters
    const filterTypes = filters.split(',').filter(Boolean);
    const regexPattern = new RegExp(`"groups":\\s*\\[[^\\]]*"(${filterTypes.join('|')})"[^\\]]*\\]`, 'i');
    const query = { "rawLog.message": { $regex: regexPattern } };
    
    // Query across multiple collections
    const models = [LogCurrent, LogRecent]; // Check both current and recent collections
    
    const { data: logs, total } = await queryMultipleCollections(query, {
      models,
      sort: { timestamp: -1 },
      skip: parseInt(page) * parseInt(pageSize),
      limit: parseInt(pageSize)
    });
    
    return res.json({ logs, total, page: parseInt(page), pageSize: parseInt(pageSize) });
  } catch (error) {
    console.error('Error fetching malware logs:', error);
    return res.status(500).json({ error: 'Failed to fetch malware logs' });
  }
});

// Configuration Logs endpoint
router.get('/configuration', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const pageSize = parseInt(req.query.pageSize) || 10;
    
    // Query for logs with "sca" in the groups array
    const regexPattern = new RegExp(`"groups":\\s*\\[[^\\]]*"sca"[^\\]]*\\]`, 'i');
    const query = { "rawLog.message": { $regex: regexPattern } };
    
    // Query across multiple collections
    const models = [LogCurrent, LogRecent];
    
    const { data: logs, total } = await queryMultipleCollections(query, {
      models,
      sort: { timestamp: -1 },
      skip: page * pageSize,
      limit: pageSize
    });
    
    return res.json({ logs, total, page, pageSize });
  } catch (error) {
    console.error('Error fetching configuration logs:', error);
    return res.status(500).json({ error: 'Failed to fetch configuration logs' });
  }
});

// Sentinel AI endpoint
router.get('/sentinel-ai', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const pageSize = parseInt(req.query.pageSize) || 1000; // Increased default from 10 to 1000
    const logType = req.query.logType || 'ai'; // 'ai' or 'ml'
    
    let query;
    
    if (logType === 'ai') {
      // Updated query - look for AI_response directly in the raw message
      query = {
        "rawLog.message": {
          $regex: /"AI_response":\s*"[^"]+"/
        }
      };
    } else if (logType === 'ml') {
      // Query for logs with ai_ml_logs
      query = {
        "rawLog.message": { 
          $regex: '"ai_ml_logs"\\s*:\\s*\\{' 
        }
      };
    }
    
    // Query across multiple collections
    const models = [LogCurrent, LogRecent];
    
    const { data: logs, total } = await queryMultipleCollections(query, {
      models,
      sort: { timestamp: -1 },
      skip: page * pageSize,
      limit: pageSize
    });
    
    // Process logs based on type
    const processedLogs = logs.map(log => {
      const message = log.rawLog?.message || '';
      let extractedData = {};
      
      if (logType === 'ai') {
        // Direct extraction of AI_response from the raw message
        const aiMatch = message.match(/"AI_response":\s*"([^"]+)"/);
        extractedData.aiResponse = aiMatch ? aiMatch[1] : 'No AI response found';
      } else if (logType === 'ml') {
        try {
          // Add detailed logging to help debug
          console.log('Processing ML log:', {
            hasAiMlLogs: !!log.ai_ml_logs,
            hasRawLog: !!log.rawLog,
            rawLogType: typeof log.rawLog,
            messageType: typeof log.rawLog?.message
          });
          
          // Check if ai_ml_logs is directly available
          if (log.ai_ml_logs) {
            console.log('Found ai_ml_logs field directly:', log.ai_ml_logs);
            extractedData.mlData = log.ai_ml_logs;
          }
          // If not available directly, try to get from parsed object
          else if (log.parsed && log.parsed.ai_ml_logs) {
            console.log('Found ai_ml_logs in parsed log:', log.parsed.ai_ml_logs);
            extractedData.mlData = log.parsed.ai_ml_logs;
          }
          // Fallback to regex extraction
          else {
            console.log('ai_ml_logs not found directly, trying regex extraction');
            const message = typeof log.rawLog === 'string' ? log.rawLog : 
                           (typeof log.rawLog?.message === 'string' ? log.rawLog.message : 
                            JSON.stringify(log.rawLog));
            
            // Look for a regex pattern that would match ai_ml_logs in the message
            const mlRegex = /"ai_ml_logs"\s*:\s*({[\s\S]*?trend_info[\s\S]*?score_explanation[\s\S]*?})\s*,/;
            const mlMatch = message.match(mlRegex);
            
            if (mlMatch && mlMatch[1]) {
              // Don't try to parse the complex JSON - instead extract individual fields directly with regex
              console.log('Found ai_ml_logs block, extracting fields directly');
              
              // Extract each field with separate regex
              const timestamp = message.match(/"ai_ml_logs"[\s\S]*?"timestamp"\s*:\s*"([^"]+)"/);
              const logAnalysis = message.match(/"ai_ml_logs"[\s\S]*?"log_analysis"\s*:\s*"([^"]+)"/);
              const anomalyDetected = message.match(/"ai_ml_logs"[\s\S]*?"anomaly_detected"\s*:\s*(\d+)/);
              const anomalyScore = message.match(/"ai_ml_logs"[\s\S]*?"anomaly_score"\s*:\s*(\d+)/);
              const originalLogId = message.match(/"ai_ml_logs"[\s\S]*?"original_log_id"\s*:\s*"([^"]+)"/);
              const originalSource = message.match(/"ai_ml_logs"[\s\S]*?"original_source"\s*:\s*"([^"]+)"/);
              const analysisTimestamp = message.match(/"ai_ml_logs"[\s\S]*?"analysis_timestamp"\s*:\s*"([^"]+)"/);
              const anomalyReason = message.match(/"ai_ml_logs"[\s\S]*?"anomaly_reason"\s*:\s*"([^"]*)"/);
              
              // Extract trend_info fields
              const isNewTrend = message.match(/"trend_info"[\s\S]*?"is_new_trend"\s*:\s*(true|false)/);
              const explanation = message.match(/"trend_info"[\s\S]*?"explanation"\s*:\s*"([^"]*)"/);
              const similarityScore = message.match(/"trend_info"[\s\S]*?"similarity_score"\s*:\s*(\d+)/);
              
              // Extract score_explanation fields
              const model = message.match(/"score_explanation"[\s\S]*?"model"\s*:\s*"([^"]*)"/);
              const rawScore = message.match(/"score_explanation"[\s\S]*?"raw_score"\s*:\s*([\d.-]+)/);
              const normalizedScore = message.match(/"score_explanation"[\s\S]*?"normalized_score"\s*:\s*(\d+)/);
              const scoreExplanation = message.match(/"score_explanation"[\s\S]*?"explanation"\s*:\s*"([^"]*)"/);
              
              // Build a structured object from the extracted fields
              extractedData.mlData = {
                timestamp: timestamp ? timestamp[1] : '',
                log_analysis: logAnalysis ? logAnalysis[1] : '',
                anomaly_detected: anomalyDetected ? parseInt(anomalyDetected[1]) : 0,
                anomaly_score: anomalyScore ? parseInt(anomalyScore[1]) : 0,
                original_log_id: originalLogId ? originalLogId[1] : '',
                original_source: originalSource ? originalSource[1] : '',
                analysis_timestamp: analysisTimestamp ? analysisTimestamp[1] : '',
                anomaly_reason: anomalyReason ? anomalyReason[1] : '',
                trend_info: {
                  is_new_trend: isNewTrend ? isNewTrend[1] === 'true' : false,
                  explanation: explanation ? explanation[1] : '',
                  similarity_score: similarityScore ? parseInt(similarityScore[1]) : 0
                },
                score_explanation: {
                  model: model ? model[1] : '',
                  raw_score: rawScore ? parseFloat(rawScore[1]) : 0,
                  normalized_score: normalizedScore ? parseInt(normalizedScore[1]) : 0,
                  explanation: scoreExplanation ? scoreExplanation[1] : '',
                  top_contributing_features: {} // We'll handle this separately
                }
              };
              
              // Extract top_contributing_features if present
              const featuresMatch = message.match(/"top_contributing_features"\s*:\s*({[^}]+})/);
              if (featuresMatch && featuresMatch[1]) {
                try {
                  // Try to extract individual feature values using regex
                  const featuresText = featuresMatch[1];
                  const featureMatches = featuresText.matchAll(/"([^"]+)"\s*:\s*([\d.-]+)/g);
                  
                  if (featureMatches) {
                    const features = {};
                    for (const match of featureMatches) {
                      features[match[1]] = parseFloat(match[2]);
                    }
                    extractedData.mlData.score_explanation.top_contributing_features = features;
                  }
                } catch (e) {
                  console.error('Error extracting top_contributing_features:', e);
                }
              }
              
              console.log('Successfully extracted ML data fields:', extractedData.mlData);
            } else {
              console.log('No ai_ml_logs pattern found in message');
              extractedData.mlData = { 
                anomaly_score: 0, 
                anomaly_reason: 'ML data not found in log' 
              };
            }
          }
        } catch (error) {
          console.error('Error in ML log processing:', error);
          extractedData.mlData = { 
            anomaly_score: 0, 
            anomaly_reason: 'Error processing ML data' 
          };
        }
      }
      
      return {
        ...log,
        extracted: extractedData
      };
    });
    
    return res.json({ logs: processedLogs, total, page, pageSize });
  } catch (error) {
    console.error('Error fetching Sentinel AI logs:', error);
    return res.status(500).json({ error: 'Failed to fetch Sentinel AI logs' });
  }
});

// MITRE endpoint
router.get('/mitre', async (req, res) => {
  try {
    const {
      search = '',
      page = 1,
      limit = 10,
      tactic = '',
      technique = '',
      id = '',
      startTime = ''
    } = req.query;

    // Build search query for Mitre-related logs
    let searchQuery = {
      $or: [
        // Mitre-specific searches
        { "rawLog.message.rule.mitre.id": { $exists: true, $ne: [] } },
        { "rawLog.message.rule.mitre.tactic": { $exists: true, $ne: [] } },
        { "rawLog.message.rule.mitre.technique": { $exists: true, $ne: [] } },
        { "rule.mitre.id": { $exists: true, $ne: [] } },
        { "rule.mitre.tactic": { $exists: true, $ne: [] } },
        { "rule.mitre.technique": { $exists: true, $ne: [] } },
        { "rawLog.message": { $regex: /mitre|technique|tactic/i } }
      ]
    };

    // Additional filtering
    if (search || tactic || technique || id || startTime) {
      const andConditions = [];
      
      if (searchQuery.$or) {
        andConditions.push(searchQuery);
      }
      
      if (search) {
        andConditions.push({
          $or: [
            { "agent.name": { $regex: search, $options: 'i' } },
            { "rule.description": { $regex: search, $options: 'i' } },
            { "rawLog.message": { $regex: search, $options: 'i' } },
            { "rule.mitre.id": { $regex: search, $options: 'i' } },
            { "rule.mitre.tactic": { $regex: search, $options: 'i' } },
            { "rule.mitre.technique": { $regex: search, $options: 'i' } }
          ]
        });
      }
      
      if (tactic) {
        andConditions.push({
          $or: [
            { "rule.mitre.tactic": { $regex: tactic, $options: 'i' } },
            { "rawLog.message.rule.mitre.tactic": { $regex: tactic, $options: 'i' } }
          ]
        });
      }
      
      if (technique) {
        andConditions.push({
          $or: [
            { "rule.mitre.technique": { $regex: technique, $options: 'i' } },
            { "rawLog.message.rule.mitre.technique": { $regex: technique, $options: 'i' } }
          ]
        });
      }
      
      if (id) {
        andConditions.push({
          $or: [
            { "rule.mitre.id": { $regex: id, $options: 'i' } },
            { "rawLog.message.rule.mitre.id": { $regex: id, $options: 'i' } }
          ]
        });
      }
      
      if (startTime) {
        andConditions.push({ timestamp: { $gte: new Date(startTime) } });
      }
      
      searchQuery = { $and: andConditions };
    }

    // Choose models based on time filter
    const models = startTime ? 
      getModelsForTimeRange(startTime).models :
      [LogCurrent, LogRecent]; // Look in both current and recent by default for MITRE
    
    // Query across multiple collections
    const { data: mitreAttackLogs, total: totalLogs } = await queryMultipleCollections(searchQuery, {
      models,
      sort: { timestamp: -1 },
      skip: (page - 1) * limit,
      limit: Number(limit)
    });

    res.json({
      logs: mitreAttackLogs,
      totalLogs,
      page: Number(page),
      totalPages: Math.ceil(totalLogs / limit)
    });
  } catch (error) {
    console.error('Error in /mitre endpoint:', error);
    res.status(500).json({
      message: 'Error fetching Mitre Attack logs',
      error: error.message
    });
  }
});

// Endpoint to fetch vulnerability logs
router.get('/vulnerability', async (req, res) => {
  try {
    const { search = '', page = 1, limit = 10, severity = '', package = '', cve = '', startTime = '' } = req.query;
    
    let searchQuery = {
      $or: [
        { "rule.groups": "vulnerability-detector" },
        { "data.vulnerability": { $exists: true } },
        { "rawLog.message": { $regex: /"vulnerability"/i } }
      ]
    };
    
    // Add filters if provided
    const andConditions = [];
    if (Object.keys(searchQuery).length > 0) andConditions.push(searchQuery);
    
    if (search) andConditions.push({
      $or: [
        { "agent.name": { $regex: search, $options: 'i' } },
        { "rule.description": { $regex: search, $options: 'i' } },
        { "data.vulnerability.cve": { $regex: search, $options: 'i' } },
        { "data.vulnerability.package.name": { $regex: search, $options: 'i' } },
        { "rawLog.message": { $regex: search, $options: 'i' } }
      ]
    });
    
    if (startTime) andConditions.push({ timestamp: { $gte: new Date(startTime) } });
    if (severity) andConditions.push({ "data.vulnerability.severity": { $regex: severity, $options: 'i' } });
    if (package) andConditions.push({ "data.vulnerability.package.name": { $regex: package, $options: 'i' } });
    if (cve) andConditions.push({ "data.vulnerability.cve": { $regex: cve, $options: 'i' } });
    
    const finalQuery = andConditions.length > 0 ? { $and: andConditions } : {};
    
    // Choose appropriate collections
    const models = startTime ? getModelsForTimeRange(startTime).models : [LogCurrent, LogRecent];
    
    const { data: logs, total: totalLogs } = await queryMultipleCollections(finalQuery, {
      models,
      sort: { timestamp: -1 },
      skip: (parseInt(page) - 1) * parseInt(limit),
      limit: parseInt(limit)
    });
    
    res.json({
      logs,
      totalLogs,
      page: parseInt(page),
      totalPages: Math.ceil(totalLogs / parseInt(limit))
    });
  } catch (error) {
    console.error('Error in /vulnerability endpoint:', error);
    res.status(500).json({ message: 'Error fetching vulnerability logs', error: error.message });
  }
});

// Threats endpoint
router.get('/threats', async (req, res) => {
  try {
    const { search = '', page = 1, limit = 10, action = '', srcCountry = '', dstCountry = '', startTime = '' } = req.query;
    
    let searchQuery = {
      $or: [
        { "data.action": { $exists: true } },
        { "rawLog.message": { $regex: /action/i } }
      ]
    };
    
    // Add filters if provided
    const andConditions = [];
    if (Object.keys(searchQuery).length > 0) andConditions.push(searchQuery);
    
    if (search) andConditions.push({
      $or: [
        { "agent.name": { $regex: search, $options: 'i' } },
        { "data.action": { $regex: search, $options: 'i' } },
        { "data.srccountry": { $regex: search, $options: 'i' } },
        { "data.dstcountry": { $regex: search, $options: 'i' } },
        { "rawLog.message": { $regex: search, $options: 'i' } }
      ]
    });
    
    if (startTime) andConditions.push({ timestamp: { $gte: new Date(startTime) } });
    if (action) andConditions.push({ "data.action": { $regex: action, $options: 'i' } });
    if (srcCountry) andConditions.push({ "data.srccountry": { $regex: srcCountry, $options: 'i' } });
    if (dstCountry) andConditions.push({ "data.dstcountry": { $regex: dstCountry, $options: 'i' } });
    
    const finalQuery = andConditions.length > 0 ? { $and: andConditions } : {};
    
    // Choose appropriate collections
    const models = startTime ? getModelsForTimeRange(startTime).models : [LogCurrent, LogRecent];
    
    const { data: logs, total } = await queryMultipleCollections(finalQuery, {
      models,
      sort: { timestamp: -1 },
      skip: parseInt(limit) === 0 ? 0 : (parseInt(page) - 1) * parseInt(limit),
      limit: parseInt(limit) === 0 ? 10000 : parseInt(limit)
    });
    
    res.json({
      logs,
      total,
      page: parseInt(page),
      totalPages: parseInt(limit) === 0 ? 1 : Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('Error in /threats endpoint:', error);
    res.status(500).json({ message: 'Error fetching threat logs', error: error.message });
  }
});

// Auth metrics endpoint
router.get('/auth-metrics', async (req, res) => {
  try {
    console.log('Fetching authentication metrics...');
    
    const pipeline = [
      {
        $match: { "data.action": { $exists: true } }
      },
      {
        $group: {
          _id: {
            success: { $cond: [{ $eq: [{ $toLower: "$data.action" }, "pass"] }, true, false] }
          },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          type: { $cond: ["$_id.success", "success", "failure"] },
          count: 1
        }
      }
    ];
    
    // Run on current logs only for better performance
    const authMetrics = await LogCurrent.aggregate(pipeline);
    
    // Format results
    const result = { success: 0, failure: 0 };
    authMetrics.forEach(metric => {
      if (metric.type === 'success') result.success = metric.count;
      else result.failure = metric.count;
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching auth metrics:', error);
    res.status(500).json({ message: 'Error fetching auth metrics', error: error.message });
  }
});

// Top agents endpoint
router.get('/top-agents', async (req, res) => {
  try {
    // Use multiple collection queries
    const models = [LogCurrent, LogRecent];
    
    const pipeline = [
      {
        $group: {
          _id: "$agent.name",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 7 },
      {
        $project: {
          _id: 0,
          name: "$_id",
          count: 1
        }
      }
    ];
    
    const topAgents = await aggregateMultipleCollections(pipeline, { models });
    
    res.json(topAgents);
  } catch (error) {
    console.error('Error fetching top agents:', error);
    res.status(500).json({ message: 'Error fetching top agents', error: error.message });
  }
});

// Alert trends endpoint
router.get('/alert-trends', async (req, res) => {
  try {
    // Get data for the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const alertTrends = await LogCurrent.aggregate([
      {
        $match: {
          timestamp: { $gte: sevenDaysAgo },
          "rule.level": { $exists: true }
        }
      },
      {
        $addFields: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
          numericLevel: { $toInt: "$rule.level" }
        }
      },
      {
        $group: {
          _id: "$date",
          critical: { $sum: { $cond: [{ $gte: ["$numericLevel", 15] }, 1, 0] } },
          high: { $sum: { $cond: [{ $and: [{ $gte: ["$numericLevel", 12] }, { $lt: ["$numericLevel", 15] }] }, 1, 0] } },
          medium: { $sum: { $cond: [{ $and: [{ $gte: ["$numericLevel", 8] }, { $lt: ["$numericLevel", 12] }] }, 1, 0] } },
          low: { $sum: { $cond: [{ $and: [{ $gte: ["$numericLevel", 1] }, { $lt: ["$numericLevel", 8] }] }, 1, 0] } }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: "$_id",
          critical: 1,
          high: 1,
          medium: 1,
          low: 1
        }
      }
    ]);
    
    res.json(alertTrends);
  } catch (error) {
    console.error('Error fetching alert trends:', error);
    res.status(500).json({ message: 'Error fetching alert trends', error: error.message });
  }
});

// Test endpoint
router.get('/test', async (req, res) => {
  try {
    const log = new LogCurrent({
      timestamp: new Date(),
      agent: { name: 'test-agent' },
      rule: { level: '10', description: 'test log' },
      rawLog: { message: 'test log message' },
      uniqueIdentifier: `test_${Date.now()}`
    });
    
    await log.save();
    res.json({ message: 'Log saved successfully', log });
  } catch (error) {
    console.error('Error saving log:', error);
    res.status(500).json({ message: 'Error saving log', error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if this is a special route like 'major', 'recent', etc.
    const specialRoutes = ['major', 'recent', 'metrics', 'summary', 'charts', 'fim', 'session'];
    if (specialRoutes.includes(id)) {
      return next(); // Skip to the next matching route handler
    }
    
    // Normal ID lookup logic
    let log = await LogCurrent.findOne({ id: id }).lean();
    
    if (!log) {
      log = await LogRecent.findOne({ id: id }).lean();
    }
    
    if (!log) {
      log = await LogArchive.findOne({ id: id }).lean();
    }
    
    if (!log) {
      return res.status(404).json({ message: 'Log not found' });
    }
    
    res.json(log);
  } catch (error) {
    console.error('Error fetching log by ID:', error);
    res.status(500).json({ message: 'Error fetching log', error: error.message });
  }
});

module.exports = router;
module.exports.queryTimeBasedCollections = queryTimeBasedCollections;