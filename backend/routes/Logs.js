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

router.get('/debug/structure', auth, async (req, res) => {
  try {
    const sampleLog = await Log.findOne().lean();
    
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
  try {
    const result = await Log.aggregate([
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
    ]);
    
    if (result.length === 0) {
      return res.json([{ name: "No Protocol Data", value: 1 }]);
    }
    
    return res.json(result);
  } catch (error) {
    console.error("Error in protocol distribution:", error);
    return res.status(500).json({ message: "Error fetching protocol distribution", error: error.message });
  }
}

async function getTopSourceIPs(query, res) {
  try {
    const result = await Log.aggregate([
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
    ]);
    
    if (result.length === 0) {
      return res.json([{ name: "No Source IP Data", value: 1 }]);
    }
    
    return res.json(result);
  } catch (error) {
    console.error("Error in top source IPs:", error);
    return res.status(500).json({ message: "Error fetching top source IPs", error: error.message });
  }
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

async function getNetworkConnections(query, res) {
  try {
    // Define all possible field paths
    const sourceIPPaths = ["network.srcIp", "sourceIP", "source.ip", "fields.src_ip", "rawData.data.src_ip"];
    const destIPPaths = ["network.destIp", "destinationIP", "destination.ip", "fields.dst_ip", "rawData.data.dest_ip"];
    
    // Create projection objects for all possible paths
    const sourceIPProjection = {};
    sourceIPPaths.forEach(path => {
      const parts = path.split('.');
      let current = sourceIPProjection;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) current[parts[i]] = {};
        current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = 1;
    });
    
    const destIPProjection = {};
    destIPPaths.forEach(path => {
      const parts = path.split('.');
      let current = destIPProjection;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) current[parts[i]] = {};
        current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = 1;
    });
    
    // Get sample documents to check field paths
    const sampleDocs = await Log.find(query).limit(10).lean();
    
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
    
    // Get top source IPs
    const sourceProjection = { source: `$${sourceIPField}` };
    const topSources = await Log.aggregate([
      { $match: query },
      { $project: sourceProjection },
      { $group: { _id: "$source", count: { $sum: 1 } } },
      { $match: { _id: { $ne: null, $ne: "" } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    // Get top destination IPs
    const destProjection = { destination: `$${destinationIPField}` };
    const topDestinations = await Log.aggregate([
      { $match: query },
      { $project: destProjection },
      { $group: { _id: "$destination", count: { $sum: 1 } } },
      { $match: { _id: { $ne: null, $ne: "" } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    // Get source-destination connections
    const sourceIDs = topSources.map(s => s._id).filter(Boolean);
    const destIDs = topDestinations.map(d => d._id).filter(Boolean);
    
    let connectionsMatchQuery = { ...query };
    
    // Only add path conditions if we have data
    if (sourceIDs.length > 0) {
      connectionsMatchQuery[sourceIPField] = { $in: sourceIDs };
    }
    
    if (destIDs.length > 0) {
      connectionsMatchQuery[destinationIPField] = { $in: destIDs };
    }
    
    const connectionProjection = {
      source: `$${sourceIPField}`,
      target: `$${destinationIPField}`
    };
    
    const connections = await Log.aggregate([
      { $match: connectionsMatchQuery },
      { $project: connectionProjection },
      { 
        $group: {
          _id: { source: "$source", target: "$target" },
          count: { $sum: 1 }
        }
      },
      { $match: { "_id.source": { $ne: null }, "_id.target": { $ne: null } } },
      { $sort: { count: -1 } },
      { $limit: 50 }
    ]);
    
    // Format for force-directed graph
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
      .filter(conn => conn._id.source && conn._id.target)
      .map(conn => ({
        source: conn._id.source,
        target: conn._id.target,
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

router.get('/fim', async (req, res) => {
  try {
      const { 
          search = '', 
          page = 1, 
          limit = 10, 
          event = '', 
          path = '',
          startTime = '' 
      } = req.query;

      // Build search query for FIM-related logs
      let searchQuery = { 
          $or: [
              // Main syscheck existence checks
              { "syscheck.event": { $exists: true } },
              { "rawLog.syscheck.event": { $exists: true } },
              
              // Event type specific searches
              { "syscheck.event": { $in: ["added", "modified", "deleted"] } },
              { "rawLog.syscheck.event": { $in: ["added", "modified", "deleted"] } },
              
              // Comprehensive text search across raw message
              { 
                  "rawLog.message": { 
                      $regex: /syscheck|file integrity|fim|added|modified|deleted/i 
                  } 
              }
          ]
      };

      // Additional filtering based on search term
      if (search) {
          searchQuery.$and = [
              searchQuery,
              { 
                  $or: [
                      // Agent and rule-based searches
                      { "agent.name": { $regex: search, $options: 'i' } },
                      { "rule.description": { $regex: search, $options: 'i' } },
                      
                      // Raw message searches
                      { "rawLog.message": { $regex: search, $options: 'i' } },
                      { "rawLog.full_log": { $regex: search, $options: 'i' } },
                      
                      // Specific FIM field searches
                      { "syscheck.path": { $regex: search, $options: 'i' } },
                      { "rawLog.syscheck.path": { $regex: search, $options: 'i' } },
                      
                      // Comprehensive FIM-related keyword search
                      { 
                          "rawLog.message": { 
                              $regex: new RegExp(
                                  search.split(/\s+/).map(term => 
                                      `(${term}|${term.toLowerCase()}|${term.toUpperCase()})`
                                  ).join('|'),
                                  'i'
                              )
                          } 
                      }
                  ]
              }
          ];
      }

      // Filter by timestamp if provided
      if (startTime) {
        searchQuery.timestamp = { $gte: new Date(startTime) };
      }

      // Specific FIM event filtering
      if (event) {
          searchQuery.$and = searchQuery.$and || [];
          searchQuery.$and.push({
              $or: [
                  { "syscheck.event": event },
                  { "rawLog.syscheck.event": event }
              ]
          });
      }

      // Path filtering
      if (path) {
          searchQuery.$and = searchQuery.$and || [];
          searchQuery.$and.push({
              $or: [
                  { "syscheck.path": { $regex: path, $options: 'i' } },
                  { "rawLog.syscheck.path": { $regex: path, $options: 'i' } }
              ]
          });
      }

      // Count total documents for pagination
      const totalLogs = await Log.countDocuments(searchQuery);

      // Execute query with pagination and sorting
      const fimLogs = await Log.find(searchQuery)
          .sort({ timestamp: -1 })
          .skip((page - 1) * limit)
          .limit(Number(limit))
          .lean();

      // Process the logs to extract relevant FIM information
      const processedLogs = fimLogs.map(log => {
          // Get syscheck data from either direct field or rawLog
          const syscheck = log.syscheck || log.rawLog?.syscheck || {};
          const rule = log.rule || log.rawLog?.rule || {};
          const agent = log.agent || log.rawLog?.agent || {};
          
          return {
              id: log._id,
              timestamp: log.timestamp,
              event: syscheck.event || 'unknown',
              path: syscheck.path || 'unknown',
              agent: agent.name || 'unknown',
              ruleLevel: rule.level || '0',
              ruleDescription: rule.description || 'No description',
              fullLog: log.rawLog?.full_log || '',
              // Include additional FIM-relevant data
              arch: syscheck.arch || '',
              mode: syscheck.mode || '',
              sizeAfter: syscheck.size_after || '',
              sizeBefore: syscheck.size_before || '',
              hashAfter: {
                  md5: syscheck.md5_after || '',
                  sha1: syscheck.sha1_after || '',
                  sha256: syscheck.sha256_after || ''
              },
              hashBefore: {
                  md5: syscheck.md5_before || '',
                  sha1: syscheck.sha1_before || '',
                  sha256: syscheck.sha256_before || ''
              },
              // For registry entries
              valueName: syscheck.value_name || '',
              valueType: syscheck.value_type || '',
              // Include raw syscheck for any missing fields
              rawSyscheck: syscheck
          };
      });

      res.json({
          logs: processedLogs,
          totalLogs,
          page: Number(page),
          totalPages: Math.ceil(totalLogs / limit),
          eventCounts: {
              added: await Log.countDocuments({
                  ...searchQuery,
                  $or: [
                      { "syscheck.event": "added" },
                      { "rawLog.syscheck.event": "added" }
                  ]
              }),
              modified: await Log.countDocuments({
                  ...searchQuery,
                  $or: [
                      { "syscheck.event": "modified" },
                      { "rawLog.syscheck.event": "modified" }
                  ]
              }),
              deleted: await Log.countDocuments({
                  ...searchQuery,
                  $or: [
                      { "syscheck.event": "deleted" },
                      { "rawLog.syscheck.event": "deleted" }
                  ]
              })
          }
      });
  } catch (error) {
      console.error('Error in /fim endpoint:', error);
      res.status(500).json({ 
          message: 'Error fetching File Integrity Monitoring logs', 
          error: error.message 
      });
  }
});

// Add this endpoint to your existing Logs.js routes
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
              
              // Technique ID searches
              { "rule.mitre.id": { $exists: true, $ne: [] } },
              { "rule.mitre.tactic": { $exists: true, $ne: [] } },
              { "rule.mitre.technique": { $exists: true, $ne: [] } },

              // Comprehensive text search across raw message
              { 
                  "rawLog.message": { 
                      $regex: /mitre|technique|tactic/i 
                  } 
              }
          ]
      };

      // Additional filtering based on search term
      if (search) {
          searchQuery.$and = [
              searchQuery,
              { 
                  $or: [
                      // Agent and rule-based searches
                      { "agent.name": { $regex: search, $options: 'i' } },
                      { "rule.description": { $regex: search, $options: 'i' } },
                      
                      // Raw message searches
                      { "rawLog.message": { $regex: search, $options: 'i' } },
                      
                      // Specific Mitre field searches
                      { "rule.mitre.id": { $regex: search, $options: 'i' } },
                      { "rule.mitre.tactic": { $regex: search, $options: 'i' } },
                      { "rule.mitre.technique": { $regex: search, $options: 'i' } },
                      
                      // Comprehensive MITRE-related keyword search
                      { 
                          "rawLog.message": { 
                              $regex: new RegExp(
                                  search.split(/\s+/).map(term => 
                                      `(${term}|${term.toLowerCase()}|${term.toUpperCase()})`
                                  ).join('|'),
                                  'i'
                              )
                          } 
                      }
                  ]
              }
          ];
      }

      if (startTime) {
        searchQuery.timestamp = { $gte: new Date(startTime) };
        // If your timestamp field is in a different location, adjust accordingly
        // For example, if it's nested in rawLog:
        // searchQuery["rawLog.timestamp"] = { $gte: new Date(startTime) };
      }

      // Specific Mitre filtering
      if (tactic) {
          searchQuery.$and = searchQuery.$and || [];
          searchQuery.$and.push({
              $or: [
                  { "rule.mitre.tactic": { $regex: tactic, $options: 'i' } },
                  { "rawLog.message.rule.mitre.tactic": { $regex: tactic, $options: 'i' } }
              ]
          });
      }

      if (technique) {
          searchQuery.$and = searchQuery.$and || [];
          searchQuery.$and.push({
              $or: [
                  { "rule.mitre.technique": { $regex: technique, $options: 'i' } },
                  { "rawLog.message.rule.mitre.technique": { $regex: technique, $options: 'i' } }
              ]
          });
      }

      if (id) {
          searchQuery.$and = searchQuery.$and || [];
          searchQuery.$and.push({
              $or: [
                  { "rule.mitre.id": { $regex: id, $options: 'i' } },
                  { "rawLog.message.rule.mitre.id": { $regex: id, $options: 'i' } }
              ]
          });
      }

      // Count total documents for pagination
      const totalLogs = await Log.countDocuments(searchQuery);

      // Execute query with pagination and sorting
      const mitreAttackLogs = await Log.find(searchQuery)
          .sort({ timestamp: -1 })
          .skip((page - 1) * limit)
          .limit(Number(limit))
          .lean();

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
        { "rawLog.message": { $regex: /cvss|cvs|assigner/i } }
      ]
    };

    if (search) {
      searchQuery.$and = [
        searchQuery,
        {
          $or: [
            { "agent.name": { $regex: search, $options: 'i' } },
            { "rule.description": { $regex: search, $options: 'i' } },
            { "data.vulnerability.cve": { $regex: search, $options: 'i' } },
            { "data.vulnerability.package.name": { $regex: search, $options: 'i' } },
            { "data.vulnerability.severity": { $regex: search, $options: 'i' } },
            { "rawLog.message": { $regex: search, $options: 'i' } }
          ]
        }
      ];
    }

    if (startTime) {
      searchQuery.timestamp = { $gte: new Date(startTime) };
    }

    if (severity) {
      searchQuery.$and = searchQuery.$and || [];
      searchQuery.$and.push({ "data.vulnerability.severity": { $regex: severity, $options: 'i' } });
    }

    if (package) {
      searchQuery.$and = searchQuery.$and || [];
      searchQuery.$and.push({ "data.vulnerability.package.name": { $regex: package, $options: 'i' } });
    }

    if (cve) {
      searchQuery.$and = searchQuery.$and || [];
      searchQuery.$and.push({ "data.vulnerability.cve": { $regex: cve, $options: 'i' } });
    }

    const totalLogs = await Log.countDocuments(searchQuery);
    const vulnerabilityLogs = await Log.find(searchQuery)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    console.log('Fetched logs:', vulnerabilityLogs); // Add this line to debug

    res.json({
      logs: vulnerabilityLogs,
      totalLogs,
      page: Number(page),
      totalPages: Math.ceil(totalLogs / limit)
    });
  } catch (error) {
    console.error('Error in /vulnerability endpoint:', error);
    res.status(500).json({ message: 'Error fetching vulnerability logs', error: error.message });
  }
});



router.get('/auth-metrics', async (req, res) => {
  try {
    console.log('Fetching authentication metrics...');
    
    const authMetrics = await Log.aggregate([
      {
        // First match only logs that have data.action field
        $match: {
          "data.action": { $exists: true }
        }
      },
      {
        // Count success and failure authentications
        $group: {
          _id: {
            // If action is "Pass" or "pass", it's a success, otherwise a failure
            success: {
              $cond: [
                { $regexMatch: { input: "$data.action", regex: /^pass$/i } },
                true,
                false
              ]
            }
          },
          count: { $sum: 1 }
        }
      },
      {
        // Reshape the results
        $project: {
          _id: 0,
          type: { $cond: ["$_id.success", "success", "failure"] },
          count: 1
        }
      }
    ]);
    
    // Convert to the expected format
    const result = {
      success: 0,
      failure: 0
    };
    
    authMetrics.forEach(metric => {
      if (metric.type === 'success') {
        result.success = metric.count;
      } else {
        result.failure = metric.count;
      }
    });
    
    console.log('Auth metrics calculated:', result);
    res.json(result);
  } catch (error) {
    console.error('Error fetching auth metrics:', error);
    res.status(500).json({ message: 'Error fetching auth metrics', error: error.message });
  }
});

// Top agents endpoint
router.get('/top-agents', async (req, res) => {
  try {
    console.log('Fetching top agents...');
    
    const topAgents = await Log.aggregate([
      {
        // Group by agent name and count logs
        $group: {
          _id: "$agent.name",
          count: { $sum: 1 }
        }
      },
      {
        // Sort by count in descending order
        $sort: { count: -1 }
      },
      {
        // Limit to top 5
        $limit: 5
      },
      {
        // Project to the expected format
        $project: {
          _id: 0,
          name: "$_id",
          count: 1
        }
      }
    ]);
    
    console.log('Top agents calculated:', topAgents);
    res.json(topAgents);
  } catch (error) {
    console.error('Error fetching top agents:', error);
    res.status(500).json({ message: 'Error fetching top agents', error: error.message });
  }
});

// Alert trends endpoint
router.get('/alert-trends', async (req, res) => {
  try {
    console.log('Fetching alert trends...');
    
    // Get data for the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const alertTrends = await Log.aggregate([
      {
        // Match logs from the last 7 days and make sure rule.level exists
        $match: {
          timestamp: { $gte: sevenDaysAgo },
          "rule.level": { $exists: true }
        }
      },
      {
        // Add a field for the date and numeric level
        $addFields: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
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
        // Group by date and categorize by level
        $group: {
          _id: "$date",
          critical: {
            $sum: {
              $cond: [{ $gte: ["$numericLevel", 15] }, 1, 0]
            }
          },
          high: {
            $sum: {
              $cond: [
                { $and: [
                  { $gte: ["$numericLevel", 12] },
                  { $lt: ["$numericLevel", 15] }
                ]},
                1, 
                0
              ]
            }
          },
          medium: {
            $sum: {
              $cond: [
                { $and: [
                  { $gte: ["$numericLevel", 8] },
                  { $lt: ["$numericLevel", 12] }
                ]},
                1, 
                0
              ]
            }
          },
          low: {
            $sum: {
              $cond: [
                { $and: [
                  { $gte: ["$numericLevel", 1] },
                  { $lt: ["$numericLevel", 8] }
                ]},
                1, 
                0
              ]
            }
          }
        }
      },
      {
        // Sort by date
        $sort: { _id: 1 }
      },
      {
        // Project to the expected format
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
    
    console.log('Alert trends calculated:', alertTrends);
    res.json(alertTrends);
  } catch (error) {
    console.error('Error fetching alert trends:', error);
    res.status(500).json({ message: 'Error fetching alert trends', error: error.message });
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
      logType = 'all',
      ruleLevel = 'all'
    } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build query with log type filtering
    let searchQuery = {};
    
    // Apply log type filter
    if (logType === 'fortigate') {
      searchQuery['rawLog.message'] = { $regex: 'FortiGate', $options: 'i' };
    } else if (logType === 'other') {
      searchQuery['rawLog.message'] = { $not: { $regex: 'FortiGate', $options: 'i' } };
    }

    // Apply rule level filter
    if (ruleLevel !== 'all') {
      let ruleLevelRange;
      
      switch (ruleLevel) {
        case 'low':
          ruleLevelRange = { $gte: 1, $lte: 3 };
          break;
        case 'medium':
          ruleLevelRange = { $gte: 4, $lte: 7 };
          break;
        case 'high':
          ruleLevelRange = { $gte: 8, $lte: 11 };
          break;
        case 'critical':
          ruleLevelRange = { $gte: 12, $lte: 16 };
          break;
        case 'severe':
          ruleLevelRange = { $gte: 17 };
          break;
      }
      
      if (ruleLevelRange) {
        searchQuery['rule.level'] = ruleLevelRange;
      }
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