// backend/server.js


// Add this helper function to extract agent name
const extractAgentName = (logMessage) => {
  // Try different common paths where agent name might be located
  const possiblePaths = [
    // Direct paths
    logMessage.agent_name,
    logMessage.agentName,
    logMessage.agent?.name,
    // Nested in data object
    logMessage.data?.agent_name,
    logMessage.data?.agentName,
    logMessage.data?.agent?.name,
    // Other possible locations
    logMessage.agent_info?.name,
    logMessage.agentInfo?.name,
    logMessage.agent_details?.name,
    // Windows event specific
    logMessage.win?.system?.computer_name,
    // Default to hostname if agent name not found
    logMessage.host?.name,
    logMessage.hostname
  ];

  // Return the first non-null value found
  return possiblePaths.find(path => path !== undefined && path !== null) || 'N/A';
};


// Add this helper function to extract rule level
const extractRuleLevel = (logMessage) => {
  // Try different common paths where rule level might be located
  const possiblePaths = [
    // Direct paths
    logMessage.rule_level,
    logMessage.ruleLevel,
    logMessage.rule?.level,
    // Nested in data object
    logMessage.data?.rule_level,
    logMessage.data?.ruleLevel,
    logMessage.data?.rule?.level,
    // Other possible locations
    logMessage.alert?.level,
    logMessage.alert_level,
    logMessage.severity,
    logMessage.level,
    // Windows event specific
    logMessage.win?.system?.level
  ];

  // Return the first non-null value found
  return possiblePaths.find(path => path !== undefined && path !== null) || 'N/A';
};


// First, add this helper function at the top with other functions
const extractIPAddresses = (logData) => {
  // Try different common paths where IPs might be located
  const paths = [
    // For Suricata-style logs
    ['data', 'src_ip'],
    ['data', 'dest_ip'],
    ['data', 'flow', 'src_ip'],
    ['data', 'flow', 'dest_ip'],
    // For Windows Event logs
    ['data', 'win', 'eventdata', 'ipAddress'],
    // For raw message parsing
    ['message', 'src_ip'],
    ['message', 'dest_ip']
  ];

  let srcIp = 'Unknown';
  let destIp = 'Unknown';

  for (const [key1, key2, key3, key4] of paths) {
    if (key3 && key4) {
      if (logData[key1]?.[key2]?.[key3]?.[key4]) {
        if (!srcIp || srcIp === 'Unknown') srcIp = logData[key1][key2][key3][key4];
        else if (!destIp || destIp === 'Unknown') destIp = logData[key1][key2][key3][key4];
      }
    } else if (key3) {
      if (logData[key1]?.[key2]?.[key3]) {
        if (!srcIp || srcIp === 'Unknown') srcIp = logData[key1][key2][key3];
        else if (!destIp || destIp === 'Unknown') destIp = logData[key1][key2][key3];
      }
    } else {
      if (logData[key1]?.[key2]) {
        if (!srcIp || srcIp === 'Unknown') srcIp = logData[key1][key2];
        else if (!destIp || destIp === 'Unknown') destIp = logData[key1][key2];
      }
    }
  }

  return { srcIp, destIp };
};

// Load environment variables from .env file
require('dotenv').config();

// Import required modules
const express = require('express'); // Framework for building the server
const cors = require('cors'); // Middleware to enable CORS
const axios = require('axios'); // HTTP client for making requests
const { verify, sign } = require('jsonwebtoken'); // Library for JSON Web Tokens (JWT)
const { open } = require('maxmind'); // MaxMind library for IP geolocation

// Initialize Express app
const app = express();

// Configure CORS options
const corsOptions = {
  origin: 'http://localhost:3000', // Allow requests from this origin
  credentials: true, // Allow credentials (e.g., cookies)
  optionsSuccessStatus: 200, // Set success status for preflight requests
};

// Apply middleware
app.use(cors(corsOptions)); // Enable CORS with the specified options
app.use(express.json()); // Parse incoming JSON requests
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
  });
});

// Load GeoLite2 database
let geoip;

// Load GeoLite2 database asynchronously
const loadGeoIPDatabase = async () => {
  try {
    geoip = await open('./geoip/GeoLite2-City.mmdb');
    console.log('GeoLite2 database loaded successfully.');
  } catch (error) {
    console.error('Error loading GeoLite2 database:', error);
    process.exit(1); // Exit if the database fails to load
  }
};

// Function to get geolocation for an IP
const getGeolocation = (ip) => {
  if (!ip || typeof ip !== 'string' || !/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(ip)) {
    console.warn('Invalid IP address:', ip);
    return { latitude: null, longitude: null };
  }

  try {
    const geoData = geoip.get(ip);
    if (geoData && geoData.location) {
      return {
        latitude: geoData.location.latitude,
        longitude: geoData.location.longitude,
      };
    }
    return { latitude: null, longitude: null };
  } catch (error) {
    console.error('Error fetching geolocation:', error);
    return { latitude: null, longitude: null };
  }
};

// Load the GeoIP database when the server starts
loadGeoIPDatabase();

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  verify(token, process.env.JWT_SECRET || 'fallback_secret', {
    issuer: 'YourAppName',
    audience: 'YourAppAudience',
    // Add more robust verification
    algorithms: ['HS256']
  }, (err, user) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expired' });
      }
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Test endpoint (protected by JWT authentication)
app.get('/api/test', authenticateToken, (req, res) => {
  res.json({ message: 'API is working' }); // Return a simple JSON response
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  console.log('Login attempt:', { username, password }); // Debug: Log the login attempt

  try {
    if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
      const token = sign({ username }, process.env.JWT_SECRET || 'fallback_secret', {
        expiresIn: '24h', // Token expires in 24 hours
        // Add these for more robust token management
        issuer: 'YourAppName',
        audience: 'YourAppAudience'
      });
      console.log('Login successful, token generated:', token); // Debug: Log the generated token
      res.json({
        success: true,
        token,
        message: 'Login successful',
      });
    } else {
      console.log('Invalid credentials'); // Debug: Log invalid credentials
      res.status(401).json({
        success: false,
        message: 'Invalid username or password',
      });
    }
  } catch (error) {
    console.error('Login error:', error); // Debug: Log login errors
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Endpoint to fetch logs with geolocation data
// Updated logs endpoint in server.js

// Add this to server.js
app.get('/api/logs', authenticateToken, async (req, res) => {
  try {
    const { range = 86400 } = req.query;
    const now = Math.floor(Date.now() / 1000);
    const from = now - parseInt(range);

    const graylogUrl = `http://${process.env.GRAYLOG_HOST}:${process.env.GRAYLOG_PORT}/api/search/universal/absolute`;

    const response = await axios({
      method: 'get',
      url: graylogUrl,
      params: {
        query: '*',
        from: new Date(from * 1000).toISOString(),
        to: new Date(now * 1000).toISOString(),
        limit: 1000,
        fields: '*',
        streams: process.env.GRAYLOG_STREAM_ID,
      },
      auth: {
        username: process.env.GRAYLOG_USERNAME,
        password: process.env.GRAYLOG_PASSWORD,
      },
      headers: {
        Accept: 'application/json',
      },
    });

    // Log a sample message to debug
    if (response.data.messages.length > 0) {
      console.log('Sample raw log message:', JSON.stringify(response.data.messages[0], null, 2));
    }

    // Process the logs while preserving raw data
    const processedLogs = response.data.messages.map(msg => {
      const originalMessage = msg.message;
      
      // Extract IP addresses
      const { srcIp, destIp } = extractIPAddresses(originalMessage);
      
      // Create processed log object
      const processedLog = {
        timestamp: originalMessage.timestamp || originalMessage.true,
        rawTimestamp: originalMessage.timestamp || 
          (originalMessage.true ? new Date(originalMessage.true * 1000).toISOString() : null),
        agent: {
          name: extractAgentName(originalMessage)
        },
        rule: {
          level: extractRuleLevel(originalMessage),
          description: originalMessage.rule?.description || 
                      originalMessage.rule_description || 
                      originalMessage.description || 
                      'N/A'
        },
        network: {
          srcIp,
          destIp,
          protocol: originalMessage.data?.proto || originalMessage.data?.flow?.proto || 'N/A'
        },
        rawLog: originalMessage // Preserve the complete raw log
      };

      // Debug log for processed log
      console.log('Processed log:', {
        timestamp: processedLog.timestamp,
        agent_name: processedLog.agent.name,
        rule_level: processedLog.rule.level
      });

      return processedLog;
    });

    res.json({
      logsWithGeolocation: processedLogs,
      levelDistribution: processLevelDistribution(processedLogs),
      timeDistribution: processTimeDistribution(processedLogs),
      recentLogs: processedLogs.slice(0, 10),
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ 
      message: 'Error processing logs',
      error: error.message 
    });
  }
});

// Helper function to process log level distribution
const processLevelDistribution = (messages = []) => {
  const levelCount = {};
  messages.forEach((msg) => {
    const level = msg.level || 'UNKNOWN';
    levelCount[level] = (levelCount[level] || 0) + 1;
  });

  return Object.entries(levelCount).map(([name, value]) => ({
    name,
    value,
  }));
};

// Helper function to process log time distribution
const processTimeDistribution = (messages = []) => {
  const timeCount = {};
  messages.forEach((msg) => {
    const hour = new Date(msg.timestamp).getHours();
    const timeKey = `${hour}:00`;
    timeCount[timeKey] = (timeCount[timeKey] || 0) + 1;
  });

  return Object.entries(timeCount)
    .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
    .map(([time, count]) => ({
      time,
      count,
    }));
};

// Helper function to process recent logs
const processRecentLogs = (messages = []) => {
  return messages.slice(0, 10).map((msg) => {
    let timestamp;
    try {
      // Parse the timestamp from Graylog logs and convert to local time
      timestamp = new Date(msg.timestamp).toLocaleString();
    } catch (error) {
      console.warn('Invalid timestamp:', msg.timestamp);
      timestamp = 'Invalid timestamp';
    }

    return {
      timestamp,
      level: msg.level || 'UNKNOWN',
      message: msg.details?.ruleDescription || 'No message',
      source: msg.source || 'Unknown',
      agent: msg.details?.agentName || 'Unknown',
      process: msg.details?.processDetails || {},
    };
  });
};

// Start the server
const PORT = process.env.PORT || 5000; // Use environment variable for port or default to 5000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`); // Log server start
  console.log('Environment variables loaded:'); // Log environment variables for debugging
  console.log('GRAYLOG_HOST:', process.env.GRAYLOG_HOST);
  console.log('GRAYLOG_PORT:', process.env.GRAYLOG_PORT);
  console.log('GRAYLOG_USERNAME is set:', !!process.env.GRAYLOG_USERNAME);
  console.log('GRAYLOG_PASSWORD is set:', !!process.env.GRAYLOG_PASSWORD);
});